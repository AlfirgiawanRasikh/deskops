import assert from "node:assert/strict";
import test from "node:test";

import {
  canCreateKnowledgeArticle,
  canEditKnowledgeArticle,
  canManageKnowledgeArticles,
  canViewKnowledgeArticle,
  canViewKnowledgeBase,
  getKnowledgeArticleReadScope,
} from "../src/features/knowledge/policies/knowledge-authorization";

const roles = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "TECHNICIAN",
  "EMPLOYEE",
] as const;

test("all active workspace roles can open the knowledge base", () => {
  for (const role of roles) {
    assert.equal(
      canViewKnowledgeBase(role),
      true,
    );
  }
});

test("operational roles can create article drafts", () => {
  for (const role of [
    "OWNER",
    "ADMIN",
    "MANAGER",
    "TECHNICIAN",
  ] as const) {
    assert.equal(
      canCreateKnowledgeArticle(role),
      true,
    );
  }

  assert.equal(
    canCreateKnowledgeArticle("EMPLOYEE"),
    false,
  );
});

test("only management roles control publication status", () => {
  for (const role of [
    "OWNER",
    "ADMIN",
    "MANAGER",
  ] as const) {
    assert.equal(
      canManageKnowledgeArticles(role),
      true,
    );
  }

  assert.equal(
    canManageKnowledgeArticles(
      "TECHNICIAN",
    ),
    false,
  );
  assert.equal(
    canManageKnowledgeArticles("EMPLOYEE"),
    false,
  );
});

test("published articles are readable by every workspace role", () => {
  for (const role of roles) {
    assert.equal(
      canViewKnowledgeArticle({
        role,
        userId: "user-1",
        article: {
          authorId: "user-2",
          status: "PUBLISHED",
        },
      }),
      true,
    );
  }
});

test("technicians only read and edit their own drafts", () => {
  const ownDraft = {
    authorId: "technician-1",
    status: "DRAFT",
  };
  const anotherDraft = {
    authorId: "technician-2",
    status: "DRAFT",
  };

  assert.equal(
    canViewKnowledgeArticle({
      role: "TECHNICIAN",
      userId: "technician-1",
      article: ownDraft,
    }),
    true,
  );
  assert.equal(
    canEditKnowledgeArticle({
      role: "TECHNICIAN",
      userId: "technician-1",
      article: ownDraft,
    }),
    true,
  );
  assert.equal(
    canViewKnowledgeArticle({
      role: "TECHNICIAN",
      userId: "technician-1",
      article: anotherDraft,
    }),
    false,
  );
  assert.equal(
    canEditKnowledgeArticle({
      role: "TECHNICIAN",
      userId: "technician-1",
      article: anotherDraft,
    }),
    false,
  );
});

test("technicians cannot edit a published article", () => {
  assert.equal(
    canEditKnowledgeArticle({
      role: "TECHNICIAN",
      userId: "technician-1",
      article: {
        authorId: "technician-1",
        status: "PUBLISHED",
      },
    }),
    false,
  );
});

test("management roles can read and edit any organization article", () => {
  for (const role of [
    "OWNER",
    "ADMIN",
    "MANAGER",
  ] as const) {
    assert.equal(
      canViewKnowledgeArticle({
        role,
        userId: "manager-1",
        article: {
          authorId: "technician-1",
          status: "ARCHIVED",
        },
      }),
      true,
    );
    assert.equal(
      canEditKnowledgeArticle({
        role,
        userId: "manager-1",
        article: {
          authorId: "technician-1",
          status: "ARCHIVED",
        },
      }),
      true,
    );
  }
});

test("employee read scope remains published and tenant scoped", () => {
  assert.deepEqual(
    getKnowledgeArticleReadScope({
      organizationId: "org-1",
      userId: "employee-1",
      role: "EMPLOYEE",
    }),
    {
      organizationId: "org-1",
      status: "PUBLISHED",
    },
  );
});

test("technician read scope exposes only published articles and owned drafts", () => {
  assert.deepEqual(
    getKnowledgeArticleReadScope({
      organizationId: "org-1",
      userId: "technician-1",
      role: "TECHNICIAN",
    }),
    {
      organizationId: "org-1",
      OR: [
        {
          status: "PUBLISHED",
        },
        {
          status: "DRAFT",
          authorId: "technician-1",
        },
      ],
    },
  );
});
