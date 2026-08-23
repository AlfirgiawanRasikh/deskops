import type { WorkspaceRole } from "@/features/auth/policies/workspace-authorization";

const reportViewerRoles =
  new Set<WorkspaceRole>([
    "OWNER",
    "ADMIN",
    "MANAGER",
  ]);

export function canViewOperationalReports(
  role: WorkspaceRole,
) {
  return reportViewerRoles.has(role);
}
