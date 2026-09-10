import type { TicketSlaTone } from "@/features/tickets/utils/ticket-sla";

export type TicketCommentVisibility =
  | "PUBLIC"
  | "INTERNAL";

export type TicketDetailComment = {
  id: string;
  authorName: string;
  authorEmail: string;
  body: string;
  visibility: TicketCommentVisibility;
  createdAt: string;
};

export type TicketDetailActivity = {
  id: string;
  description: string;
  createdAt: string;
};

export type TicketDetailAssigneeOption = {
  value: string;
  label: string;
};

export type TicketDetailSlaObjective = {
  label: string;
  status: string;
  timing: string;
  dueAt: string | null;
  completedAt: string | null;
  progress: number;
  tone: TicketSlaTone;
};

export type TicketDetailData = {
  databaseId: string;
  displayId: string;
  requestType: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  requester: {
    name: string;
    email: string;
    department: string;
  };
  assignee: {
    id: string;
    name: string;
    email: string;
  } | null;
  assigneeOptions: TicketDetailAssigneeOption[];
  sla: {
    status: string;
    phase: string;
    timing: string;
    progress: number;
    tone: TicketSlaTone;
    firstResponse: TicketDetailSlaObjective;
    resolution: TicketDetailSlaObjective;
  };
  asset: {
    label: string;
    serialNumber: string | null;
  } | null;
  comments: TicketDetailComment[];
  activity: TicketDetailActivity[];
};
