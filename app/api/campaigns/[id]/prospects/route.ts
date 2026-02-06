import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/campaigns/[id]/prospects
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
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!campaign || campaign.workspace.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = campaign.prospects.map((cp) => ({
    id: cp.id,
    prospectId: cp.prospect.id,
    email: cp.prospect.email,
    firstName: cp.prospect.firstName,
    lastName: cp.prospect.lastName,
    company: cp.prospect.company,
    title: cp.prospect.title,
    status: cp.status,
    currentStep: cp.currentStep,
    lastSentAt: cp.lastSentAt,
    nextSendAt: cp.nextSendAt,
  }));

  return NextResponse.json(result);
}
