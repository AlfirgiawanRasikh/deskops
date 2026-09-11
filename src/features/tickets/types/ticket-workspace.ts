import type { TicketSlaTone } from "@/features/tickets/utils/ticket-sla";

export const ticketWorkspaceStatusValues = [
  "ALL",
  "OPEN",
  "TRIAGED",
  "IN_PROGRESS",
  "WAITING_REQUESTER",
  "WAITING_APPROVAL",
  "SCHEDULED",
  "RESOLVED",
  "CLOSED",
  "CANCELED",
] as const;

export const ticketWorkspacePriorityValues = [
  "ALL",
  "URGENT",
  "HIGH",
  "NORMAL",
  "LOW",
] as const;

export type TicketWorkspaceView =
  | "all"
  | "mine";

export type TicketWorkspaceStatusFilter =
  (typeof ticketWorkspaceStatusValues)[number];

export type TicketWorkspacePriorityFilter =
  (typeof ticketWorkspacePriorityValues)[number];

export type TicketWorkspaceSearchParams = {
  q?: string | string[];
  status?: string | string[];
  priority?: string | string[];
  page?: string | string[];
};

export type TicketWorkspaceQuery = {
  query: string;
  status: TicketWorkspaceStatusFilter;
  priority: TicketWorkspacePriorityFilter;
  page: number;
};

export type TicketWorkspaceRecord = {
  databaseId: string;
  reference: string;
  title: string;
  category: string;
  priority: Exclude<
    TicketWorkspacePriorityFilter,
    "ALL"
  >;
  priorityLabel: string;
  status: Exclude<
    TicketWorkspaceStatusFilter,
    "ALL"
  >;
  statusLabel: string;
  requesterName: string;
  requesterDepartment: string;
  assigneeName: string;
  slaStatus: string;
  slaTiming: string;
  slaPhase: string;
  slaState: TicketSlaTone;
  updatedAt: string;
};

export type TicketWorkspaceMetric = {
  label: string;
  value: number;
  description: string;
};

export type TicketWorkspacePagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  firstItem: number;
  lastItem: number;
};

export type TicketWorkspacePendingApproval = {
  approvalId: string;
  ticketId: string;
  reference: string;
  title: string;
  category: string;
  priority: Exclude<
    TicketWorkspacePriorityFilter,
    "ALL"
  >;
  priorityLabel: string;
  requesterName: string;
  requestedByName: string;
  requestedAt: string;
};

export type TicketWorkspaceApprovalInbox = {
  visible: boolean;
  totalItems: number;
  records: TicketWorkspacePendingApproval[];
};

export type TicketWorkspaceData = {
  organizationName: string;
  title: string;
  description: string;
  view: TicketWorkspaceView;
  query: TicketWorkspaceQuery;
  records: TicketWorkspaceRecord[];
  metrics: TicketWorkspaceMetric[];
  approvalInbox: TicketWorkspaceApprovalInbox;
  pagination: TicketWorkspacePagination;
};
