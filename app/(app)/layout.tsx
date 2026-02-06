import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "./app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  let workspaces: { id: string; name: string }[] = [];
  let user: { id: string; name: string | null; email: string | null; image: string | null } = {
    id: "dev-user",
    name: "Dev User",
    email: "dev@qrev.ai",
    image: null,
  };

  if (session?.user?.id) {
    // Real auth — fetch from DB
    const memberships = await db.workspaceMember.findMany({
      where: { userId: session.user.id },
      include: { workspace: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    workspaces = memberships.map((m) => m.workspace);
    user = {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    };
  } else {
    // No auth — use demo workspace
    workspaces = [{ id: "demo", name: "Demo Workspace" }];
  }

  return (
    <AppShell workspaces={workspaces} user={user}>
      {children}
    </AppShell>
  );
}
