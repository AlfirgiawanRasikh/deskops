import assert from "node:assert/strict";
import test from "node:test";

import type { KnowledgeArticleSuggestion } from "../src/features/knowledge/types/knowledge-base";
import { findKnowledgeSuggestions } from "../src/features/knowledge/utils/knowledge-suggestions";

const articles: KnowledgeArticleSuggestion[] = [
  {
    id: "password",
    title: "Reset a locked company account",
    summary:
      "Restore access after repeated password failures.",
    category: "Access / Account",
    tags: ["password", "login", "mfa"],
  },
  {
    id: "vpn",
    title: "Reconnect the company VPN",
    summary:
      "Resolve common remote network connection failures.",
    category: "Network / VPN",
    tags: ["vpn", "remote", "network"],
  },
  {
    id: "laptop",
    title: "Prepare a replacement laptop",
    summary:
      "Checklist for a managed replacement device.",
    category: "Hardware / Device",
    tags: ["laptop", "device"],
  },
];

test("prioritizes a matching ticket category", () => {
  const result = findKnowledgeSuggestions({
    articles,
    title: "Cannot connect from home",
    category: "Network / VPN",
  });

  assert.equal(result[0]?.id, "vpn");
});

test("matches meaningful title words against article tags", () => {
  const result = findKnowledgeSuggestions({
    articles,
    title: "My password login is blocked",
    category: "",
  });

  assert.equal(result[0]?.id, "password");
});

test("does not suggest articles before enough context exists", () => {
  assert.deepEqual(
    findKnowledgeSuggestions({
      articles,
      title: "it",
      category: "",
    }),
    [],
  );
});

test("respects the suggestion result limit", () => {
  const result = findKnowledgeSuggestions({
    articles,
    title: "company device network account",
    category: "",
    limit: 1,
  });

  assert.equal(result.length, 1);
});
