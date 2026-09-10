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
  asset: {
    label: string;
    serialNumber: string | null;
  } | null;
  comments: TicketDetailComment[];
  activity: TicketDetailActivity[];
};
