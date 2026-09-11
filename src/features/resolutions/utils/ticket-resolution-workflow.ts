export const TICKET_REOPEN_WINDOW_DAYS = 7;

export const TICKET_REOPEN_WINDOW_MS =
  TICKET_REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function getTicketReopenDeadline(resolvedAt: Date) {
  return new Date(
    resolvedAt.getTime() + TICKET_REOPEN_WINDOW_MS,
  );
}

export function canReopenTicketResolution({
  actorId,
  requesterId,
  ticketStatus,
  resolutionStatus,
  resolvedAt,
  now,
}: {
  actorId: string;
  requesterId: string;
  ticketStatus: string;
  resolutionStatus: string;
  resolvedAt: Date;
  now: Date;
}) {
  return (
    actorId === requesterId &&
    ticketStatus === "RESOLVED" &&
    resolutionStatus === "PENDING_CONFIRMATION" &&
    now.getTime() <= getTicketReopenDeadline(resolvedAt).getTime()
  );
}
