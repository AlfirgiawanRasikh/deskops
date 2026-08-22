import type { WorkspaceRole } from "@/features/auth/policies/workspace-authorization";

const assetAssignmentRoles =
  new Set<WorkspaceRole>([
    "OWNER",
    "ADMIN",
    "MANAGER",
  ]);

const assetStatusRoles =
  new Set<WorkspaceRole>([
    "OWNER",
    "ADMIN",
    "MANAGER",
    "TECHNICIAN",
  ]);

export function canAssignAssets(
  role: WorkspaceRole,
) {
  return assetAssignmentRoles.has(role);
}

export function canUpdateAssetStatus(
  role: WorkspaceRole,
) {
  return assetStatusRoles.has(role);
}