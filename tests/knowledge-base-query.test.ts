import assert from "node:assert/strict";
import test from "node:test";

import { parseKnowledgeBaseQuery } from "../src/features/knowledge/schemas/knowledge-base-query";

test("accepts and normalizes supported knowledge filters", () => {
  assert.deepEqual(
    parseKnowledgeBaseQuery({
      q: "  password reset  ",
      category: "Access / Account",
      status: "DRAFT",
      page: "3",
    }),
    {
      query: "password reset",
      category: "Access / Account",
      status: "DRAFT",
      page: 3,
    },
  );
});

test("uses the first repeated knowledge query value", () => {
  assert.equal(
    parseKnowledgeBaseQuery({
      q: ["vpn", "ignored"],
    }).query,
    "vpn",
  );
});

test("defaults invalid knowledge filters safely", () => {
  assert.deepEqual(
    parseKnowledgeBaseQuery({
      q: "x".repeat(81),
      category: "x".repeat(81),
      status: "DELETED",
      page: "0",
    }),
    {
      query: "",
      category: "ALL",
      status: "ALL",
      page: 1,
    },
  );
});
