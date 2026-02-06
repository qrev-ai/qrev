import { auth } from "./auth"
import { db } from "./db"
import { redirect } from "next/navigation"

export async function getSession() {
  return await auth()
}

/**
 * Returns the authenticated user ID, or falls back to "dev-user" when
 * auth is skipped in local dev. Returns null only if dev-user doesn't exist.
 */
export async function getApiUserId(): Promise<string | null> {
  const session = await auth()
  if (session?.user?.id) return session.user.id

  // Fallback for local dev when login is skipped
  const devUser = await db.user.findUnique({ where: { id: "dev-user" } })
  return devUser?.id ?? null
}

export async function getCurrentUser() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      workspaces: {
        include: {
          workspace: true,
        },
      },
    },
  })

  if (!user) {
    redirect("/login")
  }

  return user
}

export async function hasWorkspaceAccess(userId: string, workspaceId: string) {
  const membership = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  })

  return !!membership
}

export async function isWorkspaceAdmin(userId: string, workspaceId: string) {
  const membership = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  })

  return membership?.role === "ADMIN"
}

export async function getWorkspaceWithAccess(workspaceId: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return null
  }

  const membership = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: session.user.id,
        workspaceId,
      },
    },
    include: {
      workspace: {
        include: {
          campaigns: true,
          prospects: true,
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      },
    },
  })

  return membership
}
