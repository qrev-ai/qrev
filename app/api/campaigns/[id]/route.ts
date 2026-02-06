import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/campaigns/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      workspace: {
        include: { members: { where: { userId } } },
      },
      steps: { orderBy: { stepNumber: "asc" } },
      prospects: {
        include: {
          prospect: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              company: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!campaign || campaign.workspace.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const total = campaign.prospects.length;
  const sent = campaign.prospects.filter((p) => ["SENT", "REPLIED"].includes(p.status)).length;
  const replied = campaign.prospects.filter((p) => p.status === "REPLIED").length;
  const bounced = campaign.prospects.filter((p) => p.status === "BOUNCED").length;

  return NextResponse.json({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    steps: campaign.steps,
    stats: { total, sent, replied, bounced },
    prospects: campaign.prospects.map((cp) => ({
      ...cp.prospect,
      id: cp.id,
      prospectId: cp.prospect.id,
      status: cp.status,
      currentStep: cp.currentStep,
      lastSentAt: cp.lastSentAt,
    })),
  });
}

// PUT /api/campaigns/[id] — update status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      workspace: {
        include: { members: { where: { userId } } },
      },
    },
  });

  if (!campaign || campaign.workspace.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, description, status } = body;

  const updated = await db.campaign.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/campaigns/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getApiUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      workspace: {
        include: { members: { where: { userId } } },
      },
    },
  });

  if (!campaign || campaign.workspace.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.campaign.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
