import assert from "node:assert/strict";
import test from "node:test";

import {
  getAuditLogRangeStart,
  parseAuditLogQuery,
} from "../src/features/audit/schemas/audit-log-query";

test("accepts and normalizes supported audit log filters", () => {
  assert.deepEqual(
    parseAuditLogQuery({
      q: "  INC-1046  ",
      category: "TICKET",
      actor: "user_123",
      range: "90d",
      page: "4",
    }),
    {
      query: "INC-1046",
      category: "TICKET",
      actorId: "user_123",
      range: "90d",
      page: 4,
    },
  );
});

test("uses the first repeated audit query value", () => {
  assert.deepEqual(
    parseAuditLogQuery({
      q: ["status", "ignored"],
      category: [
        "ASSET",
        "MEMBER",
      ],
      actor: ["SYSTEM", "user-2"],
      range: ["7d", "90d"],
      page: ["2", "7"],
    }),
    {
      query: "status",
      category: "ASSET",
      actorId: "SYSTEM",
      range: "7d",
      page: 2,
    },
  );
});

test("defaults invalid audit filters safely", () => {
  assert.deepEqual(
    parseAuditLogQuery({
      q: "x".repeat(81),
      category: "SECURITY",
      actor: "invalid actor value",
      range: "365d",
      page: "-4",
    }),
    {
      query: "",
      category: "ALL",
      actorId: "ALL",
      range: "30d",
      page: 1,
    },
  );
});

test("calculates the selected audit range from the provided clock", () => {
  const now = new Date(
    "2026-09-10T12:00:00.000Z",
  );

  assert.equal(
    getAuditLogRangeStart(
      "7d",
      now,
    ).toISOString(),
    "2026-09-03T12:00:00.000Z",
  );
  assert.equal(
    getAuditLogRangeStart(
      "30d",
      now,
    ).toISOString(),
    "2026-08-11T12:00:00.000Z",
  );
  assert.equal(
    getAuditLogRangeStart(
      "90d",
      now,
    ).toISOString(),
    "2026-06-12T12:00:00.000Z",
  );
});
