import assert from "node:assert/strict";
import test from "node:test";

import type { OperationalReportData } from "../src/features/reports/types/operational-report";
import { createOperationalReportCsv } from "../src/features/reports/utils/operational-report-csv";

function createReportData(): OperationalReportData {
  return {
    organizationName:
      'North "Operations"',
    range: "30d",
    rangeLabel: "Last 30 days",
    generatedAt:
      "23 Aug 2026, 10:00",
    summary: {
      createdTickets: 8,
      resolvedTickets: 5,
      openTickets: 3,
      overdueTickets: 1,
      slaComplianceRate: 80,
      firstResponseSlaComplianceRate: 90,
      resolutionSlaComplianceRate: 70,
      meanResolutionHours: 12.5,
    },
    ticketTrend: [
      {
        key: "2026-08-01",
        label: "1–3 Aug",
        created: 3,
        resolved: 2,
      },
    ],
    statusBreakdown: [
      {
        key: "OPEN",
        label: "Open",
        value: 3,
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
        key: "Hardware",
        label: "Hardware",
        value: 4,
      },
    ],
    assetStatusBreakdown: [
      {
        key: "ASSIGNED",
        label: "Assigned",
        value: 5,
      },
    ],
    affectedAssetModels: [
      {
        key: "=HYPERLINK",
        label: "=HYPERLINK",
        value: 1,
      },
    ],
    technicianWorkload: [
      {
        membershipId:
          "membership-1",
        userId: "user-1",
        name: "+Dangerous Name",
        role: "TECHNICIAN",
        roleLabel: "Technician",
        openTickets: 3,
        urgentTickets: 1,
        overdueTickets: 1,
      },
    ],
  };
}

test("creates a complete operational report CSV", () => {
  const csv =
    createOperationalReportCsv(
      createReportData(),
    );

  assert.match(
    csv,
    /DeskOps operational report/,
  );
  assert.match(
    csv,
    /"Created tickets",8/,
  );
  assert.match(
    csv,
    /"Overall SLA compliance rate","80%"/,
  );
  assert.match(
    csv,
    /"First response SLA compliance rate","90%"/,
  );
  assert.match(
    csv,
    /"Resolution SLA compliance rate","70%"/,
  );
  assert.match(
    csv,
    /"Mean resolution hours",12.5/,
  );
  assert.match(
    csv,
    /Technician workload/,
  );
});

test("escapes quotes in CSV values", () => {
  const csv =
    createOperationalReportCsv(
      createReportData(),
    );

  assert.match(
    csv,
    /"North ""Operations"""/,
  );
});

test("protects spreadsheet formula-like values", () => {
  const csv =
    createOperationalReportCsv(
      createReportData(),
    );

  assert.match(
    csv,
    /"'=HYPERLINK"/,
  );
  assert.match(
    csv,
    /"'\+Dangerous Name"/,
  );
});
