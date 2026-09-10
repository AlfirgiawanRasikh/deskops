import assert from "node:assert/strict";
import test from "node:test";

import { formatKnowledgeAuditEvent } from "../src/features/audit/utils/audit-event-formatters";

const baseEvent = {
  id: "event-1",
  action: "KNOWLEDGE_ARTICLE_UPDATED",
  fromValue: null,
  toValue: null,
  metadata: {
    source: "knowledge-base",
    changedFields: [
      "summary",
      "content",
    ],
  },
  createdAt: new Date(
    "2026-09-10T08:00:00.000Z",
  ),
  actor: {
    id: "user-1",
    name: "Maya Sari",
    email: "maya@deskops.local",
  },
  article: {
    id: "article-1",
    title: "Reconnect the company VPN",
    category: "Network / VPN",
  },
};

test("formats knowledge edits with a scoped article link", () => {
  const event = formatKnowledgeAuditEvent(
    baseEvent,
    "Asia/Jakarta",
  );

  assert.equal(
    event.category,
    "KNOWLEDGE",
  );
  assert.equal(
    event.action,
    "Knowledge article updated",
  );
  assert.equal(
    event.summary,
    "Updated summary, content.",
  );
  assert.deepEqual(event.resource, {
    label:
      "Network / VPN · Reconnect the company VPN",
    href: "/knowledge/article-1",
  });
});

test("formats knowledge publication status without raw metadata", () => {
  const event = formatKnowledgeAuditEvent(
    {
      ...baseEvent,
      action:
        "KNOWLEDGE_ARTICLE_STATUS_CHANGED",
      fromValue: {
        status: "DRAFT",
      },
      toValue: {
        status: "PUBLISHED",
      },
    },
    "Asia/Jakarta",
  );

  assert.equal(
    event.summary,
    "Status: Draft → Published.",
  );
});
