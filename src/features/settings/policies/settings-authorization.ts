import type { WorkspaceRole } from "@/features/auth/policies/workspace-authorization";

const workspaceSettingsRoles =
  new Set<WorkspaceRole>([
    "OWNER",
    "ADMIN",
  ]);

export function canViewWorkspaceSettings(
  role: WorkspaceRole,
) {
  return workspaceSettingsRoles.has(role);
}

export function canUpdateWorkspaceSettings(
  role: WorkspaceRole,
) {
  return workspaceSettingsRoles.has(role);
}
