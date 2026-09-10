import assert from "node:assert/strict";
import test from "node:test";

import type { AuditLogData } from "../src/features/audit/types/audit-log";
import { createAuditLogCsv } from "../src/features/audit/utils/audit-log-csv";

function createAuditData(): AuditLogData {
  return {
    organizationName:
      'North "Operations"',
    generatedAt:
      "10 Sep 2026, 10:00",
    query: {
      query: "",
      category: "ALL",
      actorId: "ALL",
      range: "30d",
      page: 1,
    },
    records: [
      {
        id: "ticket:event-1",
        category: "TICKET",
        categoryLabel: "Ticket",
        action: "Status changed",
        summary:
          "Status: Open → In progress.",
        actor: {
          id: "user-1",
          name: "+Formula Actor",
          email: "owner@example.com",
        },
        resource: {
          label:
            '=HYPERLINK("bad")',
          href: "/tickets/ticket-1",
        },
        source: "Ticket detail",
        occurredAt:
          "10 Sep 2026, 10:00:00",
        occurredAtIso:
          "2026-09-10T10:00:00.000Z",
      },
    ],
    actorOptions: [],
    metrics: [],
    pagination: {
      page: 1,
      pageSize: 5_000,
      totalItems: 1,
      totalPages: 1,
      firstItem: 1,
      lastItem: 1,
    },
  };
}

test("creates a complete filtered audit CSV", () => {
  const csv = createAuditLogCsv(
    createAuditData(),
  );

  assert.match(
    csv,
    /DeskOps audit log/,
  );
  assert.match(
    csv,
    /"Total matching events",1/,
  );
  assert.match(
    csv,
    /"Status changed"/,
  );
  assert.match(
    csv,
    /"2026-09-10T10:00:00.000Z"/,
  );
});

test("escapes quotes and spreadsheet formulas in audit CSV", () => {
  const csv = createAuditLogCsv(
    createAuditData(),
  );

  assert.match(
    csv,
    /"North ""Operations"""/,
  );
  assert.match(
    csv,
    /"'\+Formula Actor"/,
  );
  assert.match(
    csv,
    /"'=HYPERLINK\(""bad""\)"/,
  );
});
