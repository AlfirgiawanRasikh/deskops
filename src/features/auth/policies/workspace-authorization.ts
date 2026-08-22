export const workspaceRoles = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "TECHNICIAN",
  "EMPLOYEE",
] as const;

export type WorkspaceRole =
  (typeof workspaceRoles)[number];

export type WorkspaceScopeContext = {
  organizationId: string;
  userId: string;
  role: WorkspaceRole;
};

const organizationOperationsRoles =
  new Set<WorkspaceRole>([
    "OWNER",
    "ADMIN",
    "MANAGER",
    "TECHNICIAN",
  ]);

const ticketCreationRoles =
  new Set<WorkspaceRole>(workspaceRoles);

export function isWorkspaceRole(
  role: string,
): role is WorkspaceRole {
  return workspaceRoles.some(
    (workspaceRole) =>
      workspaceRole === role,
  );
}

export function canViewOrganizationTickets(
  role: WorkspaceRole,
) {
  return organizationOperationsRoles.has(role);
}

export function canViewOrganizationAssets(
  role: WorkspaceRole,
) {
  return organizationOperationsRoles.has(role);
}

export function canViewInternalTicketComments(
  role: WorkspaceRole,
) {
  return organizationOperationsRoles.has(role);
}

export function canCreateTickets(
  role: WorkspaceRole,
) {
  return ticketCreationRoles.has(role);
}

export function canCreateTicketForOtherMembers(
  role: WorkspaceRole,
) {
  return organizationOperationsRoles.has(role);
}

export function canUpdateTicketStatus(
  role: WorkspaceRole,
) {
  return organizationOperationsRoles.has(role);
}

export function canAssignTickets(
  role: WorkspaceRole,
) {
  return organizationOperationsRoles.has(role);
}

export function isAssignableTicketAssignee(
  role: WorkspaceRole,
  status: string,
) {
  return (
    role === "TECHNICIAN" &&
    status === "ACTIVE"
  );
}

export function canReplyToOrganizationTicket(
  role: WorkspaceRole,
) {
  return organizationOperationsRoles.has(role);
}

export function canAddInternalTicketNotes(
  role: WorkspaceRole,
) {
  return organizationOperationsRoles.has(role);
}

export function getTicketReadScope({
  organizationId,
  userId,
  role,
}: WorkspaceScopeContext) {
  return {
    organizationId,
    ...(canViewOrganizationTickets(role)
      ? {}
      : {
          requesterId: userId,
        }),
  };
}

export function getAssetReadScope({
  organizationId,
  userId,
  role,
}: WorkspaceScopeContext) {
  return {
    organizationId,
    ...(canViewOrganizationAssets(role)
      ? {}
      : {
          assignedToId: userId,
        }),
  };
}

export function getRequesterSelectionScope({
  organizationId,
  userId,
  role,
}: WorkspaceScopeContext) {
  return {
    organizationId,
    status: "ACTIVE" as const,
    ...(canCreateTicketForOtherMembers(role)
      ? {}
      : {
          userId,
        }),
  };
}

export function getTicketReplyScope({
  organizationId,
  userId,
  role,
}: WorkspaceScopeContext) {
  return {
    organizationId,
    ...(canReplyToOrganizationTicket(role)
      ? {}
      : {
          requesterId: userId,
        }),
  };
}

export function isResourceInWorkspace(
  workspaceOrganizationId: string,
  resourceOrganizationId: string,
) {
  return (
    workspaceOrganizationId ===
    resourceOrganizationId
  );
}
