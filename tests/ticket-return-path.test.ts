import assert from "node:assert/strict";
import test from "node:test";

import { parseTicketReturnPath } from "../src/features/tickets/utils/ticket-return-path";

test("preserves supported ticket workspace return paths and filters", () => {
  assert.equal(
    parseTicketReturnPath(
      "/tickets/my-queue?status=OPEN&page=2",
    ),
    "/tickets/my-queue?status=OPEN&page=2",
  );

  assert.equal(
    parseTicketReturnPath(
      "/tickets?priority=URGENT",
    ),
    "/tickets?priority=URGENT",
  );
});

test("uses the first repeated return path value", () => {
  assert.equal(
    parseTicketReturnPath([
      "/tickets/my-queue",
      "/tickets",
    ]),
    "/tickets/my-queue",
  );
});

test("rejects external and unsupported return paths", () => {
  assert.equal(
    parseTicketReturnPath(
      "https://example.com/tickets",
      "/tickets/my-queue",
    ),
    "/tickets/my-queue",
  );

  assert.equal(
    parseTicketReturnPath(
      "/people",
      "/tickets",
    ),
    "/tickets",
  );
});
