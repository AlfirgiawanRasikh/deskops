import type { WorkspaceRole } from "@/features/auth/policies/workspace-authorization";

export const newTicketNotificationRoles = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "TECHNICIAN",
] as const satisfies readonly WorkspaceRole[];

export function canReceiveNewTicketNotification({
  role,
  status,
  userId,
  actorId,
}: {
  role: WorkspaceRole;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  userId: string;
  actorId: string;
}) {
  return (
    status === "ACTIVE" &&
    userId !== actorId &&
    newTicketNotificationRoles.includes(
      role as (typeof newTicketNotificationRoles)[number],
    )
  );
}

export type TicketNotificationEvent =
  | "ASSIGNED"
  | "STATUS_CHANGED"
  | "PUBLIC_REPLY"
  | "INTERNAL_NOTE";

type TicketNotificationRecipientContext = {
  event: TicketNotificationEvent;
  actorId: string;
  requesterId: string;
  assigneeId: string | null;
};

export function getNotificationReadScope({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  return {
    organizationId,
    recipientId: userId,
  };
}

export function getTicketNotificationRecipients({
  event,
  actorId,
  requesterId,
  assigneeId,
}: TicketNotificationRecipientContext) {
  const candidates =
    event === "ASSIGNED" ||
    event === "INTERNAL_NOTE"
      ? [assigneeId]
      : [requesterId, assigneeId];

  return Array.from(
    new Set(
      candidates.filter(
        (candidate): candidate is string =>
          Boolean(candidate) &&
          candidate !== actorId,
      ),
    ),
  );
}
