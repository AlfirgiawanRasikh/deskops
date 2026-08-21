export type TicketPriority = "Urgent" | "High" | "Normal" | "Low";

export type TicketStatus =
  | "Investigating"
  | "Waiting approval"
  | "In progress"
  | "Unassigned"
  | "Scheduled"
  | "Resolved";

export type TicketRecord = {
  id: string;
  title: string;
  requester: string;
  department: string;
  priority: TicketPriority;
  status: TicketStatus;
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

export const demoTickets: TicketRecord[] = [
  {
    id: "INC-1042",
    title: "Finance VPN disconnects after sign-in",
    requester: "Nadia Prasetyo",
    department: "Finance",
    priority: "Urgent",
    status: "Investigating",
    assignee: "Rafi Akbar",
    assigneeShort: "Rafi",
    mine: true,
    sla: "12m",
    summary:
      "Connection drops within a minute for four Finance users after this morning's client update.",
    asset: "NB-FIN-044 · ThinkPad T14",
    category: "Network / VPN",
    latestActivity:
      "Rafi linked the incident to the VPN client 5.4 deployment and requested diagnostic logs.",
    updatedAt: "8 min ago",
  },
  {
    id: "REQ-1039",
    title: "Adobe license for new design hire",
    requester: "Indra Maulana",
    department: "People",
    priority: "Normal",
    status: "Waiting approval",
    assignee: "Maya Sari",
    assigneeShort: "Maya",
    mine: false,
    sla: "1h 24m",
    summary:
      "A Creative Cloud license is required before the new product designer starts on Monday.",
    asset: "Not linked",
    category: "Software / License",
    latestActivity: "The request was routed to the Design cost-center approver.",
    updatedAt: "21 min ago",
  },
  {
    id: "INC-1037",
    title: "Meeting room display cannot connect",
    requester: "Sarah Wijaya",
    department: "Sales",
    priority: "High",
    status: "In progress",
    assignee: "Dimas Putra",
    assigneeShort: "Dimas",
    mine: true,
    sla: "2h 08m",
    summary:
      "The Orchid room display is online but no longer appears as a wireless presentation target.",
    asset: "DSP-MTG-012 · ViewBoard 65",
    category: "Hardware / Display",
    latestActivity: "Dimas restarted the room controller and is testing firmware compatibility.",
    updatedAt: "34 min ago",
  },
  {
    id: "INC-1035",
    title: "ERP access denied after team transfer",
    requester: "Bagas Putra",
    department: "Operations",
    priority: "High",
    status: "Unassigned",
    assignee: "Unassigned",
    assigneeShort: "—",
    mine: false,
    sla: "3h 17m",
    summary:
      "The requester moved from Procurement to Operations and can no longer open the ERP inventory module.",
    asset: "NB-OPS-118 · Latitude 5440",
    category: "Access / ERP",
    latestActivity: "Automatic routing found no available identity specialist.",
    updatedAt: "48 min ago",
  },
  {
    id: "REQ-1032",
    title: "Replace damaged warehouse scanner",
    requester: "Tia Rahman",
    department: "Logistics",
    priority: "Normal",
    status: "Scheduled",
    assignee: "Rafi Akbar",
    assigneeShort: "Rafi",
    mine: true,
    sla: "Tomorrow",
    summary:
      "The scanner reads barcodes intermittently after being dropped during the night shift.",
    asset: "SCN-WH-031 · Zebra TC21",
    category: "Hardware / Scanner",
    latestActivity: "A replacement unit was reserved and installation was scheduled.",
    updatedAt: "1h ago",
  },
];
