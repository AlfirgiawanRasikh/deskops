import type { ReactNode } from "react";

import { requireWorkspaceSession } from "@/features/auth/server/workspace-session";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

export default async function WorkspaceLayout({
  children,
}: WorkspaceLayoutProps) {
  await requireWorkspaceSession();

  return children;
}