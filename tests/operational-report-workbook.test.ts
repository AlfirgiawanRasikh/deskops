import assert from "node:assert/strict";
import test from "node:test";

import type { OperationalReportData } from "../src/features/reports/types/operational-report";
import type { CellObject } from "write-excel-file/node";
import {
  createOperationalReportWorkbook,
  createOperationalReportWorkbookSheets,
} from "../src/features/reports/utils/operational-report-workbook";

function isCellObject(
  value: unknown,
): value is CellObject {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value
  );
}

const reportData: OperationalReportData = {
  organizationName:
    "=UNSAFE_ORGANIZATION",
  range: "30d",
  rangeLabel: "Last 30 days",
  generatedAt: "23 Aug 2026, 02:33 PM",
  summary: {
    createdTickets: 5,
    resolvedTickets: 2,
    openTickets: 4,
    overdueTickets: 1,
    slaComplianceRate: 75,
    firstResponseSlaComplianceRate: 80,
    resolutionSlaComplianceRate: 67,
    meanResolutionHours: 6.5,
  },
  ticketTrend: [
    {
      key: "2026-08-22",
      label: "22 Aug",
      created: 2,
      resolved: 1,
    },
  ],
  statusBreakdown: [
    {
      key: "OPEN",
      label: "Open",
      value: 4,
    },
  ],
  priorityBreakdown: [
    {
      key: "URGENT",
      label: "Urgent",
      value: 1,
    },
  ],
  categoryBreakdown: [
    {
      key: "=FORMULA",
      label: "=FORMULA",
      value: 1,
    },
  ],
  assetStatusBreakdown: [
    {
      key: "ASSIGNED",
      label: "Assigned",
      value: 3,
    },
  ],
  affectedAssetModels: [
    {
      key: "Latitude 5440",
      label: "Dell Latitude 5440",
      value: 1,
    },
  ],
  technicianWorkload: [
    {
      membershipId: "membership-1",
      userId: "user-1",
      name: "Rafi Akbar",
      role: "TECHNICIAN",
      roleLabel: "Technician",
      openTickets: 2,
      urgentTickets: 1,
      overdueTickets: 1,
    },
  ],
};

test("creates the five operational report sheets", () => {
  const sheets =
    createOperationalReportWorkbookSheets(
      reportData,
    );

  assert.deepEqual(
    sheets.map((sheet) => sheet.sheet),
    [
      "Summary",
      "Ticket Flow",
      "Ticket Breakdown",
      "Assets",
      "Workload",
    ],
  );

  assert.equal(
    sheets.every(
      (sheet) =>
        sheet.showGridLines === false,
    ),
    true,
  );
});

test("styles table headers and protects spreadsheet text", () => {
  const sheets =
    createOperationalReportWorkbookSheets(
      reportData,
    );

  const summary = sheets[0];
  const ticketBreakdown = sheets[2];

  assert.ok(summary);
  assert.ok(ticketBreakdown);

  const organizationCell =
    summary.data[2]?.[1];

  assert.equal(
    typeof organizationCell,
    "object",
  );

  if (isCellObject(organizationCell)) {
    assert.equal(
      organizationCell.value,
      "'=UNSAFE_ORGANIZATION",
    );
  }

  const summaryHeader =
    summary.data[6]?.[0];

  assert.equal(
    typeof summaryHeader,
    "object",
  );

  if (isCellObject(summaryHeader)) {
    assert.equal(
      summaryHeader.fontWeight,
      "bold",
    );
    assert.equal(
      summaryHeader.backgroundColor,
      "#3563E9",
    );
    assert.equal(
      summaryHeader.borderStyle,
      "thin",
    );
  }

  const dangerousCategory =
    ticketBreakdown.data
      .flat()
      .find(
        (cell) =>
          isCellObject(cell) &&
          cell.value === "'=FORMULA",
      );

  assert.ok(dangerousCategory);
});

test("writes a valid XLSX zip buffer", async () => {
  const workbook =
    await createOperationalReportWorkbook(
      reportData,
    );

  assert.equal(
    workbook.subarray(0, 2).toString(),
    "PK",
  );
  assert.ok(workbook.length > 1_000);
});
