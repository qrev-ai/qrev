import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/crm/people?workspaceId=xxx&search=xxx
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

  const search = request.nextUrl.searchParams.get("search") || "";

  const prospects = await db.prospect.findMany({
    where: {
      workspaceId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      _count: { select: { campaigns: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(
    prospects.map((p) => ({
      id: p.id,
      email: p.email,
      firstName: p.firstName,
      lastName: p.lastName,
      company: p.company,
      title: p.title,
      linkedinUrl: p.linkedinUrl,
      campaignCount: p._count.campaigns,
      createdAt: p.createdAt,
    }))
  );
}
