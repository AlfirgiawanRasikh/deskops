export type TicketPriority =
  | "Urgent"
  | "High"
  | "Normal"
  | "Low";

export type TicketStatus =
  | "Open"
  | "Unassigned"
  | "Investigating"
  | "In progress"
  | "Waiting requester"
  | "Waiting approval"
  | "Scheduled"
  | "Resolved";

export type TicketRecord = {
  databaseId: string;
  id: string;
  title: string;
  requester: string;
  department: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigneeId: string | null;
  assignee: string;
  assigneeShort: string;
  mine: boolean;
  sla: string;
  summary: string;
  asset: string;
  category: string;
  latestActivity: string;
  updatedAt: string;
};

export type DashboardMetric = {
  label: string;
  value: string;
  note: string;
};

export type SelectOption = {
  value: string;
  label: string;
};

export type OperationsDashboardCapabilities = {
  canAssignTickets: boolean;
  canClaimUnassignedTickets: boolean;
  canViewOrganizationQueue: boolean;
  canUpdateTicketStatus: boolean;
  canSelectOtherRequesters: boolean;
  currentUserId: string;
};

export type OperationsDashboardData = {
  organizationName: string;
  dateLabel: string;
  tickets: TicketRecord[];
  metrics: DashboardMetric[];
  requesterOptions: SelectOption[];
  assetOptions: SelectOption[];
  assigneeOptions: SelectOption[];
};
