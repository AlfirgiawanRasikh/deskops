import type { OperationalReportData } from "@/features/reports/types/operational-report";

type CsvValue =
  | string
  | number
  | null
  | undefined;

function protectSpreadsheetValue(
  value: string,
) {
  const withoutNullBytes =
    value.replaceAll("\u0000", "");

  const trimmedValue =
    withoutNullBytes.trimStart();

  if (
    trimmedValue.startsWith("=") ||
    trimmedValue.startsWith("+") ||
    trimmedValue.startsWith("-") ||
    trimmedValue.startsWith("@")
  ) {
    return `'${withoutNullBytes}`;
  }

  return withoutNullBytes;
}

function encodeCsvValue(
  value: CsvValue,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (typeof value === "number") {
    return String(value);
  }

  const protectedValue =
    protectSpreadsheetValue(value);

  return `"${protectedValue.replaceAll(
    '"',
    '""',
  )}"`;
}

function encodeCsvRow(
  values: CsvValue[],
) {
  return values
    .map(encodeCsvValue)
    .join(",");
}

export function createOperationalReportCsv(
  data: OperationalReportData,
) {
  const rows: CsvValue[][] = [
    ["DeskOps operational report"],
    ["Organization", data.organizationName],
    ["Range", data.rangeLabel],
    ["Generated at", data.generatedAt],
    [],
    ["Summary"],
    ["Metric", "Value"],
    [
      "Created tickets",
      data.summary.createdTickets,
    ],
    [
      "Resolved tickets",
      data.summary.resolvedTickets,
    ],
    [
      "Open tickets",
      data.summary.openTickets,
    ],
    [
      "Overdue tickets",
      data.summary.overdueTickets,
    ],
    [
      "SLA compliance rate",
      data.summary.slaComplianceRate ===
      null
        ? "Not available"
        : `${data.summary.slaComplianceRate}%`,
    ],
    [
      "Mean resolution hours",
      data.summary.meanResolutionHours ??
        "Not available",
    ],
    [],
    ["Ticket flow"],
    ["Period", "Created", "Resolved"],
    ...data.ticketTrend.map(
      (point): CsvValue[] => [
        point.label,
        point.created,
        point.resolved,
      ],
    ),
    [],
    ["Backlog by status"],
    ["Status", "Tickets"],
    ...data.statusBreakdown.map(
      (item): CsvValue[] => [
        item.label,
        item.value,
      ],
    ),
    [],
    ["Backlog by priority"],
    ["Priority", "Tickets"],
    ...data.priorityBreakdown.map(
      (item): CsvValue[] => [
        item.label,
        item.value,
      ],
    ),
    [],
    ["Top ticket categories"],
    ["Category", "Tickets"],
    ...data.categoryBreakdown.map(
      (item): CsvValue[] => [
        item.label,
        item.value,
      ],
    ),
    [],
    ["Asset inventory"],
    ["Status", "Assets"],
    ...data.assetStatusBreakdown.map(
      (item): CsvValue[] => [
        item.label,
        item.value,
      ],
    ),
    [],
    ["Affected asset models"],
    ["Asset model", "Tickets"],
    ...data.affectedAssetModels.map(
      (item): CsvValue[] => [
        item.label,
        item.value,
      ],
    ),
    [],
    ["Technician workload"],
    [
      "Member",
      "Role",
      "Open tickets",
      "Urgent tickets",
      "Overdue tickets",
    ],
    ...data.technicianWorkload.map(
      (member): CsvValue[] => [
        member.name,
        member.roleLabel,
        member.openTickets,
        member.urgentTickets,
        member.overdueTickets,
      ],
    ),
  ];

  return `${rows
    .map(encodeCsvRow)
    .join("\r\n")}\r\n`;
}
