import "server-only";

import {
  isWorkspaceRole,
  type WorkspaceRole,
} from "@/features/auth/policies/workspace-authorization";
import { getWorkspaceSession } from "@/features/auth/server/workspace-session";

export {
  canAssignTickets,
  canCreateTicketForOtherMembers,
  canCreateTickets,
  canReplyToOrganizationTicket,
  canUpdateTicketStatus,
  canViewInternalTicketComments,
  canViewOrganizationAssets,
  canViewOrganizationTickets,
  getAssetReadScope,
  getRequesterSelectionScope,
  getTicketReadScope,
  getTicketReplyScope,
  isAssignableTicketAssignee,
  isResourceInWorkspace,
  isWorkspaceRole,
  workspaceRoles,
  type WorkspaceRole,
  type WorkspaceScopeContext,
} from "@/features/auth/policies/workspace-authorization";

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

function parseWorkspaceRole(
  role: string,
): WorkspaceRole {
  if (isWorkspaceRole(role)) {
    return role;
  }

  throw new AuthorizationError(
    "Your current role is not supported.",
  );
}

export async function getAuthorizedWorkspace() {
  const currentWorkspace =
    await getWorkspaceSession();

  if (!currentWorkspace) {
    throw new AuthorizationError(
      "You must sign in to continue.",
    );
  }

  if (!currentWorkspace.membership) {
    throw new AuthorizationError(
      "You do not have access to this workspace.",
    );
  }

  const {
    authSession,
    membership,
  } = currentWorkspace;

  if (membership.status !== "ACTIVE") {
    throw new AuthorizationError(
      "Your workspace membership is not active.",
    );
  }

  return {
    session: authSession.session,
    user: membership.user,
    membership: {
      id: membership.id,
      role: parseWorkspaceRole(
        membership.role,
      ),
      status: membership.status,
      department:
        membership.department,
    },
    organization:
      membership.organization,
  };
}
