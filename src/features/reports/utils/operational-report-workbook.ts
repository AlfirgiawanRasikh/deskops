import writeExcelFile, {
  type CellObject,
  type Row,
  type Sheet,
} from "write-excel-file/node";

import type {
  OperationalReportData,
  ReportBreakdownItem,
} from "@/features/reports/types/operational-report";

const colors = {
  ink: "#252A31",
  muted: "#667085",
  accent: "#3563E9",
  accentSoft: "#EAF0FF",
  surface: "#FFFFFF",
  canvas: "#F7F8FA",
  line: "#D9DEE7",
  danger: "#C43D4D",
} as const;

type WorkbookSheet = Sheet<Buffer>;
type WorkbookValue = string | number;

function safeText(value: string) {
  return /^[=+\-@]/.test(value.trimStart())
    ? `'${value}`
    : value;
}

function mergedRow(
  cell: CellObject,
  columnCount: number,
): Row {
  return [
    { ...cell, columnSpan: columnCount },
    ...Array.from(
      { length: columnCount - 1 },
      () => null,
    ),
  ];
}

function blankRow(columnCount: number): Row {
  return Array.from(
    { length: columnCount },
    () => null,
  );
}

function titleRow(
  value: string,
  columnCount: number,
): Row {
  return mergedRow(
    {
      value: safeText(value),
      type: String,
      backgroundColor: colors.ink,
      textColor: colors.surface,
      fontSize: 16,
      fontWeight: "bold",
      alignVertical: "center",
      height: 28,
    },
    columnCount,
  );
}

function subtitleRow(
  value: string,
  columnCount: number,
): Row {
  return mergedRow(
    {
      value: safeText(value),
      type: String,
      backgroundColor: colors.ink,
      textColor: "#D9E0EA",
      fontSize: 10,
      alignVertical: "center",
      wrap: true,
      height: 23,
    },
    columnCount,
  );
}

function metadataRow(
  label: string,
  value: string,
  columnCount: number,
): Row {
  return [
    {
      value: label,
      type: String,
      backgroundColor: colors.canvas,
      textColor: colors.muted,
      fontWeight: "bold",
      borderColor: colors.line,
      borderStyle: "thin",
      height: 20,
    },
    {
      value: safeText(value),
      type: String,
      backgroundColor: colors.surface,
      textColor: colors.ink,
      borderColor: colors.line,
      borderStyle: "thin",
      columnSpan: columnCount - 1,
      height: 20,
    },
    ...Array.from(
      { length: columnCount - 2 },
      () => null,
    ),
  ];
}

function introRows({
  title,
  subtitle,
  metadata,
  columnCount,
}: {
  title: string;
  subtitle: string;
  metadata: Array<[string, string]>;
  columnCount: number;
}): Row[] {
  return [
    titleRow(title, columnCount),
    subtitleRow(subtitle, columnCount),
    ...metadata.map(([label, value]) =>
      metadataRow(
        label,
        value,
        columnCount,
      ),
    ),
    blankRow(columnCount),
  ];
}

function sectionRow(
  value: string,
  columnCount: number,
): Row {
  return mergedRow(
    {
      value: safeText(value),
      type: String,
      backgroundColor: colors.accentSoft,
      textColor: "#2449A7",
      fontWeight: "bold",
      borderColor: colors.line,
      borderStyle: "thin",
      height: 22,
    },
    columnCount,
  );
}

function headerRow(labels: string[]): Row {
  return labels.map((label) => ({
    value: label,
    type: String,
    backgroundColor: colors.accent,
    textColor: colors.surface,
    fontWeight: "bold",
    borderColor: colors.line,
    borderStyle: "thin",
    alignVertical: "center",
    wrap: true,
    height: 23,
  }));
}

function tableCell(
  value: WorkbookValue,
  rowIndex: number,
  options: Omit<
    CellObject,
    "type" | "value"
  > = {},
): CellObject {
  const normalizedValue =
    typeof value === "string"
      ? safeText(value)
      : value;

  return {
    value: normalizedValue,
    type:
      typeof normalizedValue === "number"
        ? Number
        : String,
    backgroundColor:
      rowIndex % 2 === 0
        ? colors.surface
        : colors.canvas,
    textColor: colors.ink,
    borderColor: colors.line,
    borderStyle: "thin",
    alignVertical: "center",
    wrap: true,
    height: 20,
    ...options,
  };
}

function tableRow(
  values: WorkbookValue[],
  rowIndex: number,
): Row {
  return values.map((value) =>
    tableCell(value, rowIndex, {
      align:
        typeof value === "number"
          ? "right"
          : "left",
      format:
        typeof value === "number"
          ? "#,##0"
          : "@",
    }),
  );
}

function emptyRow(
  message: string,
  columnCount: number,
): Row {
  return mergedRow(
    tableCell(message, 0, {
      textColor: colors.muted,
      fontStyle: "italic",
    }),
    columnCount,
  );
}

function breakdownRows(
  items: ReportBreakdownItem[],
  emptyMessage: string,
): Row[] {
  return items.length > 0
    ? items.map((item, index) =>
        tableRow(
          [item.label, item.value],
          index,
        ),
      )
    : [emptyRow(emptyMessage, 2)];
}

function sheet({
  name,
  data,
  widths,
  stickyRowsCount,
  landscape = false,
}: {
  name: string;
  data: Row[];
  widths: number[];
  stickyRowsCount: number;
  landscape?: boolean;
}): WorkbookSheet {
  return {
    sheet: name,
    data,
    columns: widths.map((width) => ({
      width,
    })),
    ...(landscape
      ? { orientation: "landscape" as const }
      : {}),
    stickyRowsCount,
    showGridLines: false,
    zoomScale: 1,
  };
}

export function createOperationalReportWorkbookSheets(
  data: OperationalReportData,
): WorkbookSheet[] {
  const reportMetadata: Array<
    [string, string]
  > = [
    ["Report range", data.rangeLabel],
    ["Generated at", data.generatedAt],
  ];

  const summaryData: Row[] = [
    ...introRows({
      title: "DeskOps operational report",
      subtitle:
        "Ticket performance, service targets, workload, and asset operations.",
      metadata: [
        [
          "Organization",
          data.organizationName,
        ],
        ...reportMetadata,
      ],
      columnCount: 2,
    }),
    headerRow(["Metric", "Value"]),
    tableRow(
      [
        "Created tickets",
        data.summary.createdTickets,
      ],
      0,
    ),
    tableRow(
      [
        "Resolved tickets",
        data.summary.resolvedTickets,
      ],
      1,
    ),
    tableRow(
      [
        "Open tickets",
        data.summary.openTickets,
      ],
      2,
    ),
    tableRow(
      [
        "Overdue tickets",
        data.summary.overdueTickets,
      ],
      3,
    ),
    [
      tableCell("SLA compliance", 4),
      data.summary.slaComplianceRate ===
      null
        ? tableCell("Not available", 4)
        : tableCell(
            data.summary
              .slaComplianceRate / 100,
            4,
            {
              align: "right",
              format: "0%",
            },
          ),
    ],
    [
      tableCell(
        "Mean resolution hours",
        5,
      ),
      data.summary.meanResolutionHours ===
      null
        ? tableCell("Not available", 5)
        : tableCell(
            data.summary
              .meanResolutionHours,
            5,
            {
              align: "right",
              format: "0.0",
            },
          ),
    ],
  ];

  const ticketFlowData: Row[] = [
    ...introRows({
      title: "Ticket flow",
      subtitle:
        "Tickets created and resolved during the selected reporting period.",
      metadata: reportMetadata,
      columnCount: 3,
    }),
    headerRow([
      "Period",
      "Created",
      "Resolved",
    ]),
    ...(data.ticketTrend.length > 0
      ? data.ticketTrend.map(
          (point, index) =>
            tableRow(
              [
                point.label,
                point.created,
                point.resolved,
              ],
              index,
            ),
        )
      : [
          emptyRow(
            "No ticket activity was recorded for this period.",
            3,
          ),
        ]),
  ];

  const ticketBreakdownData: Row[] = [
    ...introRows({
      title: "Ticket breakdown",
      subtitle:
        "Current backlog composition and the most common categories.",
      metadata: reportMetadata,
      columnCount: 2,
    }),
    sectionRow("Backlog by status", 2),
    headerRow(["Status", "Tickets"]),
    ...breakdownRows(
      data.statusBreakdown,
      "No open ticket status data is available.",
    ),
    blankRow(2),
    sectionRow("Backlog by priority", 2),
    headerRow(["Priority", "Tickets"]),
    ...breakdownRows(
      data.priorityBreakdown,
      "No open ticket priority data is available.",
    ),
    blankRow(2),
    sectionRow("Top ticket categories", 2),
    headerRow(["Category", "Tickets"]),
    ...breakdownRows(
      data.categoryBreakdown,
      "No ticket category data is available.",
    ),
  ];

  const assetData: Row[] = [
    ...introRows({
      title: "Asset operations",
      subtitle:
        "Inventory status and asset models affected by tickets.",
      metadata: reportMetadata,
      columnCount: 2,
    }),
    sectionRow(
      "Asset inventory by status",
      2,
    ),
    headerRow(["Status", "Assets"]),
    ...breakdownRows(
      data.assetStatusBreakdown,
      "No asset inventory data is available.",
    ),
    blankRow(2),
    sectionRow("Affected asset models", 2),
    headerRow([
      "Asset model",
      "Tickets",
    ]),
    ...breakdownRows(
      data.affectedAssetModels,
      "No asset-linked tickets were created in this period.",
    ),
  ];

  const workloadData: Row[] = [
    ...introRows({
      title: "Technician workload",
      subtitle:
        "Current assigned work for active managers and technicians.",
      metadata: [
        [
          "Organization",
          data.organizationName,
        ],
        ["Generated at", data.generatedAt],
      ],
      columnCount: 5,
    }),
    headerRow([
      "Member",
      "Role",
      "Open tickets",
      "Urgent tickets",
      "Overdue tickets",
    ]),
    ...(data.technicianWorkload.length > 0
      ? data.technicianWorkload.map(
          (member, index) => {
            const row = tableRow(
              [
                member.name,
                member.roleLabel,
                member.openTickets,
                member.urgentTickets,
                member.overdueTickets,
              ],
              index,
            );

            if (
              member.overdueTickets > 0
            ) {
              row[4] = tableCell(
                member.overdueTickets,
                index,
                {
                  align: "right",
                  format: "#,##0",
                  textColor: colors.danger,
                  fontWeight: "bold",
                },
              );
            }

            return row;
          },
        )
      : [
          emptyRow(
            "No active managers or technicians were found.",
            5,
          ),
        ]),
  ];

  return [
    sheet({
      name: "Summary",
      data: summaryData,
      widths: [30, 28],
      stickyRowsCount: 7,
    }),
    sheet({
      name: "Ticket Flow",
      data: ticketFlowData,
      widths: [24, 16, 16],
      stickyRowsCount: 6,
      landscape: true,
    }),
    sheet({
      name: "Ticket Breakdown",
      data: ticketBreakdownData,
      widths: [38, 16],
      stickyRowsCount: 5,
    }),
    sheet({
      name: "Assets",
      data: assetData,
      widths: [42, 16],
      stickyRowsCount: 5,
    }),
    sheet({
      name: "Workload",
      data: workloadData,
      widths: [30, 18, 16, 17, 18],
      stickyRowsCount: 6,
      landscape: true,
    }),
  ];
}

export async function createOperationalReportWorkbook(
  data: OperationalReportData,
) {
  return writeExcelFile(
    createOperationalReportWorkbookSheets(
      data,
    ),
    {
      fontFamily: "Arial",
      fontSize: 10,
    },
  ).toBuffer();
}
