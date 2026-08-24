import assert from "node:assert/strict";
import test from "node:test";

import {
  getGlobalSearchTicketType,
  parseGlobalSearchQuery,
} from "../src/features/search/schemas/global-search-query";

test("accepts and trims a supported global search query", () => {
  const result =
    parseGlobalSearchQuery(
      "  INC-1042  ",
    );

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(
      result.data,
      "INC-1042",
    );
  }
});

test("rejects a global search query shorter than two characters", () => {
  const result =
    parseGlobalSearchQuery("a");

  assert.equal(result.success, false);
});

test("rejects a global search query longer than eighty characters", () => {
  const result =
    parseGlobalSearchQuery(
      "x".repeat(81),
    );

  assert.equal(result.success, false);
});

test("maps ticket prefixes to their ticket types", () => {
  assert.equal(
    getGlobalSearchTicketType("inc"),
    "INCIDENT",
  );
  assert.equal(
    getGlobalSearchTicketType("INC-"),
    "INCIDENT",
  );
  assert.equal(
    getGlobalSearchTicketType("incident"),
    "INCIDENT",
  );
  assert.equal(
    getGlobalSearchTicketType("req"),
    "SERVICE_REQUEST",
  );
  assert.equal(
    getGlobalSearchTicketType("request"),
    "SERVICE_REQUEST",
  );
});

test("does not broaden complete ticket references", () => {
  assert.equal(
    getGlobalSearchTicketType(
      "INC-1042",
    ),
    null,
  );
  assert.equal(
    getGlobalSearchTicketType(
      "REQ-1039",
    ),
    null,
  );
});
