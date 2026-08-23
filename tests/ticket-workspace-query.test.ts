import assert from "node:assert/strict";
import test from "node:test";

import { parseTicketWorkspaceQuery } from "../src/features/tickets/schemas/ticket-workspace-query";

test("accepts and normalizes supported ticket workspace filters", () => {
  assert.deepEqual(
    parseTicketWorkspaceQuery({
      q: "  vpn access  ",
      status: "IN_PROGRESS",
      priority: "HIGH",
      page: "3",
    }),
    {
      query: "vpn access",
      status: "IN_PROGRESS",
      priority: "HIGH",
      page: 3,
    },
  );
});

test("uses the first value for repeated ticket query parameters", () => {
  assert.deepEqual(
    parseTicketWorkspaceQuery({
      q: ["INC-14", "ignored"],
      status: ["OPEN", "CLOSED"],
      priority: [
        "URGENT",
        "LOW",
      ],
      page: ["2", "8"],
    }),
    {
      query: "INC-14",
      status: "OPEN",
      priority: "URGENT",
      page: 2,
    },
  );
});

test("defaults invalid ticket workspace filters safely", () => {
  assert.deepEqual(
    parseTicketWorkspaceQuery({
      status: "UNKNOWN",
      priority: "CRITICAL",
      page: "-9",
    }),
    {
      query: "",
      status: "ALL",
      priority: "ALL",
      page: 1,
    },
  );
});

test("rejects an oversized search term by resetting it", () => {
  const query =
    parseTicketWorkspaceQuery({
      q: "x".repeat(81),
    });

  assert.equal(query.query, "");
});
