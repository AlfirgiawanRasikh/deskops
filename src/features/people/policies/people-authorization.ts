import type { WorkspaceRole } from "@/features/auth/policies/workspace-authorization";

export const membershipRoles = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "TECHNICIAN",
  "EMPLOYEE",
] as const satisfies readonly WorkspaceRole[];

const peopleDirectoryRoles = new Set<WorkspaceRole>([
  "OWNER",
  "ADMIN",
  "MANAGER",
]);

const assignableRoles: Record<
  WorkspaceRole,
  readonly WorkspaceRole[]
> = {
  OWNER: [
    "OWNER",
    "ADMIN",
    "MANAGER",
    "TECHNICIAN",
    "EMPLOYEE",
  ],
  ADMIN: [
    "MANAGER",
    "TECHNICIAN",
    "EMPLOYEE",
  ],
  MANAGER: [
    "TECHNICIAN",
    "EMPLOYEE",
  ],
  TECHNICIAN: [],
  EMPLOYEE: [],
};

export function canViewPeopleDirectory(
  role: WorkspaceRole,
) {
  return peopleDirectoryRoles.has(role);
}

export function getAssignableMembershipRoles(
  actorRole: WorkspaceRole,
) {
  return assignableRoles[actorRole];
}

export function canAssignMembershipRole(
  actorRole: WorkspaceRole,
  nextRole: WorkspaceRole,
) {
  return assignableRoles[actorRole].includes(nextRole);
}

export function canManageMembership({
  actorRole,
  targetRole,
  isSelf,
}: {
  actorRole: WorkspaceRole;
  targetRole: WorkspaceRole;
  isSelf: boolean;
}) {
  if (isSelf) {
    return false;
  }

  if (actorRole === "OWNER") {
    return true;
  }

  if (actorRole === "ADMIN") {
    return (
      targetRole === "MANAGER" ||
      targetRole === "TECHNICIAN" ||
      targetRole === "EMPLOYEE"
    );
  }

  if (actorRole === "MANAGER") {
    return (
      targetRole === "TECHNICIAN" ||
      targetRole === "EMPLOYEE"
    );
  }

  return false;
}