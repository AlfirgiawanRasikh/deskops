import type { WorkspaceRole } from "@/features/auth/policies/workspace-authorization";

const peopleDirectoryRoles =
  new Set<WorkspaceRole>([
    "OWNER",
    "ADMIN",
    "MANAGER",
  ]);

export function canViewPeopleDirectory(
  role: WorkspaceRole,
) {
  return peopleDirectoryRoles.has(role);
}