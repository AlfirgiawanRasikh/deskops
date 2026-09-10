import assert from "node:assert/strict";
import test from "node:test";

import {
  createKnowledgeArticleSchema,
  updateKnowledgeArticleSchema,
  updateKnowledgeArticleStatusSchema,
} from "../src/features/knowledge/schemas/knowledge-actions";

const validArticle = {
  title: "Reset a locked company account",
  summary:
    "Use this guide when a member cannot access their company account.",
  content:
    "Confirm the member identity and account ownership before making changes. Open the account console, review the lock reason, reset access, and ask the member to sign in again. Confirm that multi-factor authentication still works before closing the request.",
  category: "Access / Account",
  tags: " password, login, password, mfa ",
};

test("creates a normalized knowledge article draft input", () => {
  const result =
    createKnowledgeArticleSchema.parse(
      validArticle,
    );

  assert.deepEqual(result.tags, [
    "password",
    "login",
    "mfa",
  ]);
});

test("accepts an empty knowledge article tag list", () => {
  const result =
    createKnowledgeArticleSchema.parse({
      ...validArticle,
      tags: "",
    });

  assert.deepEqual(result.tags, []);
});

test("rejects article content shorter than one hundred characters", () => {
  const result =
    createKnowledgeArticleSchema.safeParse({
      ...validArticle,
      content: "Too short",
    });

  assert.equal(result.success, false);
});

test("rejects more than eight article tags", () => {
  const result =
    createKnowledgeArticleSchema.safeParse({
      ...validArticle,
      tags: "one,two,three,four,five,six,seven,eight,nine",
    });

  assert.equal(result.success, false);
});

test("accepts a valid article update", () => {
  const result =
    updateKnowledgeArticleSchema.safeParse({
      articleId: "article-1",
      ...validArticle,
    });

  assert.equal(result.success, true);
});

test("accepts supported knowledge article status changes", () => {
  for (const status of [
    "DRAFT",
    "PUBLISHED",
    "ARCHIVED",
  ]) {
    assert.equal(
      updateKnowledgeArticleStatusSchema.safeParse(
        {
          articleId: "article-1",
          status,
        },
      ).success,
      true,
    );
  }
});

test("rejects unsupported knowledge article statuses", () => {
  assert.equal(
    updateKnowledgeArticleStatusSchema.safeParse(
      {
        articleId: "article-1",
        status: "DELETED",
      },
    ).success,
    false,
  );
});
