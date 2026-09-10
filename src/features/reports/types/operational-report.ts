export type OperationalReportRange =
  | "7d"
  | "30d"
  | "90d";

export type ReportSummary = {
  createdTickets: number;
  resolvedTickets: number;
  openTickets: number;
  overdueTickets: number;
  slaComplianceRate: number | null;
  firstResponseSlaComplianceRate:
    | number
    | null;
  resolutionSlaComplianceRate:
    | number
    | null;
  meanResolutionHours: number | null;
};

export type ReportTrendPoint = {
  key: string;
  label: string;
  created: number;
  resolved: number;
};

export type ReportBreakdownItem = {
  key: string;
  label: string;
  value: number;
};

export type TechnicianWorkload = {
  membershipId: string;
  userId: string;
  name: string;
  role: "MANAGER" | "TECHNICIAN";
  roleLabel: string;
  openTickets: number;
  urgentTickets: number;
  overdueTickets: number;
};

export type OperationalReportData = {
  organizationName: string;
  range: OperationalReportRange;
  rangeLabel: string;
  generatedAt: string;
  summary: ReportSummary;
  ticketTrend: ReportTrendPoint[];
  statusBreakdown: ReportBreakdownItem[];
  priorityBreakdown: ReportBreakdownItem[];
  categoryBreakdown: ReportBreakdownItem[];
  assetStatusBreakdown: ReportBreakdownItem[];
  affectedAssetModels: ReportBreakdownItem[];
  technicianWorkload: TechnicianWorkload[];
};
