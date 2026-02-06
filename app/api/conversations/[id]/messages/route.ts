import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import OpenAI from "openai";

const QAI_SYSTEM_PROMPT = `You are QAi, an AI assistant for GTM (Go-To-Market) teams. You help with:
- Creating and managing email campaigns
- Researching prospects and companies
- Generating personalized outreach emails
- Analyzing campaign performance

Be concise, helpful, and proactive. When users want to create campaigns, guide them through the process.

When asked to generate an email, respond with a JSON block in this format:
\`\`\`email
{"subject": "...", "body": "...", "to": "..."}
\`\`\`

When responding with tabular data, use markdown tables.`;

// POST /api/conversations/[id]/messages — send message + get AI response
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify access
  const conversation = await db.conversation.findUnique({
    where: { id: params.id },
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
    metadata = { type: "csv_data", data: csvData.slice(0, 50) }; // Store up to 50 rows
  }

  // Save user message
  const userMessage = await db.message.create({
    data: {
      conversationId: params.id,
      role: "user",
      content: userContent,
      metadata,
    },
  });

  // Build messages for OpenAI
  const history = conversation.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  history.push({ role: "user", content: userContent });

  // Stream response
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: QAI_SYSTEM_PROMPT },
      ...history,
    ],
    stream: true,
  });

  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        fullResponse += text;
        controller.enqueue(encoder.encode(text));
      }

      // Save assistant message after streaming completes
      let assistantMetadata: any = undefined;

      // Detect email draft in response
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
          conversationId: params.id,
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
          where: { id: params.id },
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
