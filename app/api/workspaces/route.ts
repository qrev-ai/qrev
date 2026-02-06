import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/workspaces — list user's workspaces
export async function GET() {
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await db.workspaceMember.findMany({
    where: { userId },
    include: { workspace: { select: { id: true, name: true, createdAt: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(memberships.map((m) => m.workspace));
}

// POST /api/workspaces — create workspace
export async function POST(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, domain } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Workspace name is required" },
      { status: 400 }
    );
  }

  const workspace = await db.workspace.create({
    data: {
      name: name.trim(),
      members: {
        create: {
          userId,
          role: "ADMIN",
        },
      },
    },
    select: { id: true, name: true },
  });

  return NextResponse.json(workspace, { status: 201 });
}
