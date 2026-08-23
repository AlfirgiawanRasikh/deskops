import {
  canViewOrganizationTickets,
  type WorkspaceRole,
} from "@/features/auth/policies/workspace-authorization";
import type { TicketWorkspaceView } from "@/features/tickets/types/ticket-workspace";

type TicketWorkspaceScopeInput = {
  view: TicketWorkspaceView;
  organizationId: string;
  userId: string;
  role: WorkspaceRole;
};

export type TicketWorkspaceScope = {
  organizationId: string;
  requesterId?: string;
  assigneeId?: string;
};

export function canViewTicketWorkspace(
  role: WorkspaceRole,
  view: TicketWorkspaceView,
) {
  return (
    view === "mine" ||
    canViewOrganizationTickets(role)
  );
}

export function getTicketWorkspaceScope({
  view,
  organizationId,
  userId,
  role,
}: TicketWorkspaceScopeInput): TicketWorkspaceScope | null {
  if (!canViewTicketWorkspace(role, view)) {
    return null;
  }

  if (view === "all") {
    return {
      organizationId,
    };
  }

  if (role === "EMPLOYEE") {
    return {
      organizationId,
      requesterId: userId,
    };
  }

  return {
    organizationId,
    assigneeId: userId,
  };
}
