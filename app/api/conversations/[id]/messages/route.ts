import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth-utils";
import { db } from "@/lib/db";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// POST /api/conversations/[id]/messages — send message + get AI response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify access
  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      workspace: {
        include: {
          members: { where: { userId } },
        },
      },
    },
  });

  if (!conversation || conversation.workspace.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { content, csvData } = await request.json();

  // Build the user message content
  let userContent = content || "";
  let metadata: any = undefined;

  if (csvData && Array.isArray(csvData) && csvData.length > 0) {
    const csvSummary = `[Uploaded CSV with ${csvData.length} rows. Columns: ${Object.keys(csvData[0]).join(", ")}]\n\nFirst 5 rows:\n${JSON.stringify(csvData.slice(0, 5), null, 2)}`;
    userContent = userContent
      ? `${userContent}\n\n${csvSummary}`
      : csvSummary;
    metadata = { type: "csv_data", data: csvData.slice(0, 50) };
  }

  // Save user message
  await db.message.create({
    data: {
      conversationId: id,
      role: "user",
      content: userContent,
      metadata,
    },
  });

  // Build full message history for the agent backend
  const history = conversation.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  history.push({ role: "user", content: userContent });

  // Call Python backend — try SSE stream first, fall back to sync
  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const backendRes = await fetch(`${API_BASE}/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: conversation.workspaceId,
            messages: history,
          }),
        });

        if (!backendRes.ok || !backendRes.body) {
          // Backend unavailable — return error message
          const errText = "I'm having trouble connecting to the agent backend. Make sure the Python server is running on port 8000.";
          fullResponse = errText;
          controller.enqueue(encoder.encode(errText));
        } else {
          // Parse SSE stream from Python backend
          const reader = backendRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data:")) {
                try {
                  const data = JSON.parse(line.slice(5).trim());
                  // Forward text events to the client
                  if (data.text) {
                    fullResponse += data.text;
                    controller.enqueue(encoder.encode(data.text));
                  }
                } catch {
                  // Skip malformed SSE lines
                }
              }
            }
          }
        }
      } catch (err) {
        const errText = "Agent backend is not reachable. Start it with: cd server && python run.py";
        fullResponse = errText;
        controller.enqueue(encoder.encode(errText));
      }

      // Save assistant message after streaming completes
      let assistantMetadata: any = undefined;

      const emailMatch = fullResponse.match(
        /```email\s*\n?([\s\S]*?)\n?```/
      );
      if (emailMatch) {
        try {
          const emailData = JSON.parse(emailMatch[1]);
          assistantMetadata = { type: "email_draft", data: emailData };
        } catch {}
      }

      await db.message.create({
        data: {
          conversationId: id,
          role: "assistant",
          content: fullResponse,
          metadata: assistantMetadata,
        },
      });

      // Update conversation title from first user message
      if (conversation.messages.length === 0 && content) {
        const title =
          content.length > 60 ? content.slice(0, 60) + "..." : content;
        await db.conversation.update({
          where: { id },
          data: { title },
        });
      }

      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
