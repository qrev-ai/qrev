import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/conversations/[id] — get conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
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

  return NextResponse.json({
    id: conversation.id,
    title: conversation.title,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      createdAt: m.createdAt,
    })),
  });
}

// DELETE /api/conversations/[id] — delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
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

  await db.conversation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
