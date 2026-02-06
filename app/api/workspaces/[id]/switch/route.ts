import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// PUT /api/workspaces/[id]/switch — switch active workspace
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: id,
      },
    },
    include: { workspace: { select: { id: true, name: true } } },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 404 }
    );
  }

  return NextResponse.json(membership.workspace);
}
