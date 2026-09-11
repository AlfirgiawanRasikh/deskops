import type { WorkspaceRole } from "@/features/auth/policies/workspace-authorization";

export const resolutionManagerRoles = [
  "OWNER",
  "ADMIN",
  "MANAGER",
] as const satisfies readonly WorkspaceRole[];

export function canResolveTicket({
  role,
  actorId,
  assigneeId,
}: {
  role: WorkspaceRole;
  actorId: string;
  assigneeId: string | null;
}) {
  return (
    resolutionManagerRoles.includes(
      role as (typeof resolutionManagerRoles)[number],
    ) ||
    (role === "TECHNICIAN" && assigneeId === actorId)
  );
}

export function canConfirmTicketResolution({
  actorId,
  requesterId,
  ticketStatus,
  resolutionStatus,
}: {
  actorId: string;
  requesterId: string;
  ticketStatus: string;
  resolutionStatus: string;
}) {
  return (
    actorId === requesterId &&
    ticketStatus === "RESOLVED" &&
    resolutionStatus === "PENDING_CONFIRMATION"
  );
}

export function getResolutionNotificationRecipients({
  event,
  actorId,
  requesterId,
  assigneeId,
  resolvedById,
}: {
  event: "RESOLVED" | "CONFIRMED" | "REOPENED";
  actorId: string;
  requesterId: string;
  assigneeId: string | null;
  resolvedById: string;
}) {
  const candidates =
    event === "RESOLVED"
      ? [requesterId]
      : [assigneeId, resolvedById];

  return Array.from(
    new Set(
      candidates.filter(
        (candidate): candidate is string =>
          Boolean(candidate) && candidate !== actorId,
      ),
    ),
  );
}
