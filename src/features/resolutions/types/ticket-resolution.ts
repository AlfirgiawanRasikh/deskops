export type TicketResolutionStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "REOPENED";

export type TicketResolutionCategory =
  | "SOFTWARE_CONFIGURATION"
  | "ACCOUNT_ACCESS"
  | "HARDWARE_REPAIR"
  | "NETWORK_FIX"
  | "SECURITY_REMEDIATION"
  | "USER_GUIDANCE"
  | "NO_FAULT_FOUND"
  | "OTHER";

export type TicketResolutionRecord = {
  id: string;
  status: TicketResolutionStatus;
  category: TicketResolutionCategory;
  categoryLabel: string;
  summary: string;
  resolvedAt: string;
  resolvedBy: {
    id: string;
    name: string;
    email: string;
  };
  confirmedAt: string | null;
  reopenedAt: string | null;
  reopenReason: string | null;
  reopenDeadline: string;
  canConfirm: boolean;
  canReopen: boolean;
};

export type TicketResolutionData = {
  canResolve: boolean;
  history: TicketResolutionRecord[];
};
