import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/crm/companies?workspaceId=xxx&search=xxx
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

  // Aggregate prospects by company
  const prospects = await db.prospect.findMany({
    where: {
      workspaceId,
      company: { not: null },
      ...(search && {
        company: { contains: search, mode: "insensitive" },
      }),
    },
    select: {
      company: true,
      id: true,
    },
  });

  // Group by company
  const companyMap = new Map<string, { name: string; peopleCount: number }>();
  for (const p of prospects) {
    if (!p.company) continue;
    const existing = companyMap.get(p.company);
    if (existing) {
      existing.peopleCount++;
    } else {
      companyMap.set(p.company, { name: p.company, peopleCount: 1 });
    }
  }

  const companies = Array.from(companyMap.values())
    .sort((a, b) => b.peopleCount - a.peopleCount)
    .slice(0, 100);

  return NextResponse.json(companies);
}
