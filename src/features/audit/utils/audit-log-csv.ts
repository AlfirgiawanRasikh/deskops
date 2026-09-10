import type { AuditLogData } from "@/features/audit/types/audit-log";

function protectSpreadsheetValue(
  value: string,
) {
  return /^[=+\-@\t\r]/.test(value)
    ? `'${value}`
    : value;
}

function csvCell(
  value: string | number,
) {
  if (typeof value === "number") {
    return String(value);
  }

  return `"${protectSpreadsheetValue(
    value,
  ).replaceAll('"', '""')}"`;
}

export function createAuditLogCsv(
  data: AuditLogData,
) {
  const rows: Array<
    Array<string | number>
  > = [
    ["DeskOps audit log"],
    ["Organization", data.organizationName],
    ["Range", data.query.range],
    ["Generated", data.generatedAt],
    [
      "Exported events",
      data.records.length,
    ],
    [
      "Total matching events",
      data.pagination.totalItems,
    ],
    [],
    [
      "Timestamp",
      "Category",
      "Action",
      "Actor",
      "Actor email",
      "Resource",
      "Details",
      "Source",
      "Link",
    ],
    ...data.records.map((event) => [
      event.occurredAtIso,
      event.categoryLabel,
      event.action,
      event.actor.name,
      event.actor.email ?? "",
      event.resource.label,
      event.summary,
      event.source,
      event.resource.href,
    ]),
  ];

  return rows
    .map((row) =>
      row.map(csvCell).join(","),
    )
    .join("\r\n");
}
