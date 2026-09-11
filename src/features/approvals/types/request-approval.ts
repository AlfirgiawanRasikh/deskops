export type TicketApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type TicketApprovalPerson = {
  id: string;
  name: string;
  email: string;
};

export type TicketApprovalRecord = {
  id: string;
  status: TicketApprovalStatus;
  requestNote: string | null;
  decisionNote: string | null;
  requestedAt: string;
  decidedAt: string | null;
  requestedBy: TicketApprovalPerson;
  approver: TicketApprovalPerson;
  canDecide: boolean;
};

export type TicketApprovalOption = {
  value: string;
  label: string;
};

export type TicketApprovalData = {
  eligible: boolean;
  canRequest: boolean;
  approverOptions: TicketApprovalOption[];
  history: TicketApprovalRecord[];
};
