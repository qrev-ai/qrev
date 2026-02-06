"""CRM tools — agents use these to read/write prospects, companies, and campaigns.

These tools query the shared PostgreSQL database (same DB as the Next.js frontend).
We use raw SQL via SQLAlchemy since the Prisma-managed tables have their own schema.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session


async def search_prospects(
    workspace_id: str,
    query: str = "",
    limit: int = 20,
    **kwargs,
) -> list[dict]:
    """Search prospects in the CRM by name, email, or company."""
    async with async_session() as db:
        if query:
            result = await db.execute(
                text("""
                    SELECT id, email, "firstName", "lastName", company, title, "linkedinUrl"
                    FROM "Prospect"
                    WHERE "workspaceId" = :wid
                      AND (
                        "firstName" ILIKE :q OR "lastName" ILIKE :q
                        OR email ILIKE :q OR company ILIKE :q
                      )
                    ORDER BY "updatedAt" DESC
                    LIMIT :lim
                """),
                {"wid": workspace_id, "q": f"%{query}%", "lim": limit},
            )
        else:
            result = await db.execute(
                text("""
                    SELECT id, email, "firstName", "lastName", company, title, "linkedinUrl"
                    FROM "Prospect"
                    WHERE "workspaceId" = :wid
                    ORDER BY "updatedAt" DESC
                    LIMIT :lim
                """),
                {"wid": workspace_id, "lim": limit},
            )
        rows = result.mappings().all()
        return [dict(r) for r in rows]


async def get_prospect(
    prospect_id: str,
    **kwargs,
) -> dict | None:
    """Get a single prospect by ID with full details including research data."""
    async with async_session() as db:
        result = await db.execute(
            text("""
                SELECT id, email, "firstName", "lastName", company, title,
                       "linkedinUrl", research, "createdAt", "updatedAt"
                FROM "Prospect"
                WHERE id = :pid
            """),
            {"pid": prospect_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None


async def update_prospect_research(
    prospect_id: str,
    research: dict,
    **kwargs,
) -> dict:
    """Update the research data for a prospect."""
    import json

    async with async_session() as db:
        await db.execute(
            text("""
                UPDATE "Prospect"
                SET research = :research, "updatedAt" = NOW()
                WHERE id = :pid
            """),
            {"pid": prospect_id, "research": json.dumps(research)},
        )
        await db.commit()
        return {"updated": True, "prospect_id": prospect_id}


async def list_campaigns(
    workspace_id: str,
    status: str | None = None,
    **kwargs,
) -> list[dict]:
    """List campaigns for a workspace, optionally filtered by status."""
    async with async_session() as db:
        if status:
            result = await db.execute(
                text("""
                    SELECT id, name, description, status, "createdAt"
                    FROM "Campaign"
                    WHERE "workspaceId" = :wid AND status = :status
                    ORDER BY "updatedAt" DESC
                """),
                {"wid": workspace_id, "status": status},
            )
        else:
            result = await db.execute(
                text("""
                    SELECT id, name, description, status, "createdAt"
                    FROM "Campaign"
                    WHERE "workspaceId" = :wid
                    ORDER BY "updatedAt" DESC
                """),
                {"wid": workspace_id},
            )
        rows = result.mappings().all()
        return [dict(r) for r in rows]


async def get_campaign_prospects(
    campaign_id: str,
    **kwargs,
) -> list[dict]:
    """Get all prospects in a campaign with their status."""
    async with async_session() as db:
        result = await db.execute(
            text("""
                SELECT cp.id, cp.status, cp."currentStep", cp."lastSentAt", cp."nextSendAt",
                       p.email, p."firstName", p."lastName", p.company, p.title
                FROM "CampaignProspect" cp
                JOIN "Prospect" p ON p.id = cp."prospectId"
                WHERE cp."campaignId" = :cid
                ORDER BY cp."createdAt"
            """),
            {"cid": campaign_id},
        )
        rows = result.mappings().all()
        return [dict(r) for r in rows]
