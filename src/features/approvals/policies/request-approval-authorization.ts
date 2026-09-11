import type { WorkspaceRole } from "@/features/auth/policies/workspace-authorization";

export const approvalApproverRoles = [
  "OWNER",
  "ADMIN",
  "MANAGER",
] as const satisfies readonly WorkspaceRole[];

export function canBeTicketApprover({
  role,
  status,
}: {
  role: WorkspaceRole;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
}) {
  return (
    status === "ACTIVE" &&
    approvalApproverRoles.includes(
      role as (typeof approvalApproverRoles)[number],
    )
  );
}

export function canSelectTicketApprover({
  actorId,
  ticketRequesterId,
  candidateId,
  role,
  status,
}: {
  actorId: string;
  ticketRequesterId: string;
  candidateId: string;
  role: WorkspaceRole;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
}) {
  return (
    candidateId !== actorId &&
    candidateId !== ticketRequesterId &&
    canBeTicketApprover({ role, status })
  );
}

export function canRequestTicketApproval({
  role,
  actorId,
  assigneeId,
}: {
  role: WorkspaceRole;
  actorId: string;
  assigneeId: string | null;
}) {
  return (
    approvalApproverRoles.includes(
      role as (typeof approvalApproverRoles)[number],
    ) ||
    (role === "TECHNICIAN" &&
      assigneeId === actorId)
  );
}

export function canDecideTicketApproval({
  role,
  actorId,
  approverId,
  status,
}: {
  role: WorkspaceRole;
  actorId: string;
  approverId: string;
  status: string;
}) {
  return (
    approvalApproverRoles.includes(
      role as (typeof approvalApproverRoles)[number],
    ) &&
    actorId === approverId &&
    status === "PENDING"
  );
}

export function getApprovalDecisionRecipients({
  actorId,
  ticketRequesterId,
  ticketAssigneeId,
  requestedById,
}: {
  actorId: string;
  ticketRequesterId: string;
  ticketAssigneeId: string | null;
  requestedById: string;
}) {
  return Array.from(
    new Set(
      [
        ticketRequesterId,
        ticketAssigneeId,
        requestedById,
      ].filter(
        (candidate): candidate is string =>
          Boolean(candidate) &&
          candidate !== actorId,
      ),
    ),
  );
}

export function getPendingApprovalReadScope({
  organizationId,
  userId,
  role,
}: {
  organizationId: string;
  userId: string;
  role: WorkspaceRole;
}) {
  if (
    !approvalApproverRoles.includes(
      role as (typeof approvalApproverRoles)[number],
    )
  ) {
    return null;
  }

  return {
    approverId: userId,
    status: "PENDING" as const,
    ticket: {
      organizationId,
    },
  };
}
