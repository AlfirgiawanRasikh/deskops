export type NotificationKind =
  | "TICKET_CREATED"
  | "TICKET_ASSIGNED"
  | "TICKET_STATUS_CHANGED"
  | "TICKET_REPLY_ADDED"
  | "TICKET_INTERNAL_NOTE_ADDED"
  | "TICKET_APPROVAL_REQUESTED"
  | "TICKET_APPROVAL_DECIDED"
  | "TICKET_RESOLVED"
  | "TICKET_RESOLUTION_CONFIRMED"
  | "TICKET_REOPENED";

export type NotificationCenterItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
  isRead: boolean;
};

export type NotificationCenterResponse = {
  notifications: NotificationCenterItem[];
  unreadCount: number;
};

export type NotificationErrorResponse = {
  error: string;
};
