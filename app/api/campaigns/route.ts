import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/campaigns?workspaceId=xxx
export async function GET(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  const membership = await db.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const campaigns = await db.campaign.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { prospects: true, steps: true } },
      prospects: {
        select: { status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Compute aggregate stats per campaign
  const result = campaigns.map((c) => {
    const total = c.prospects.length;
    const sent = c.prospects.filter((p) => ["SENT", "REPLIED"].includes(p.status)).length;
    const replied = c.prospects.filter((p) => p.status === "REPLIED").length;
    const bounced = c.prospects.filter((p) => p.status === "BOUNCED").length;
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      status: c.status,
      stepsCount: c._count.steps,
      totalProspects: total,
      sent,
      replied,
      bounced,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  });

  return NextResponse.json(result);
}

// POST /api/campaigns
export async function POST(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, name, description } = await request.json();

  if (!workspaceId || !name?.trim()) {
    return NextResponse.json(
      { error: "workspaceId and name are required" },
      { status: 400 }
    );
  }

  const membership = await db.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const campaign = await db.campaign.create({
    data: {
      workspaceId,
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}
