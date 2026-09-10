import type { WorkspaceRole } from "@/features/auth/policies/workspace-authorization";

const auditLogRoles =
  new Set<WorkspaceRole>([
    "OWNER",
    "ADMIN",
  ]);

export function canViewAuditLog(
  role: WorkspaceRole,
) {
  return auditLogRoles.has(role);
}
