"use server";

import { revalidatePath } from "next/cache";

import {
  AuthorizationError,
  getAuthorizedWorkspace,
} from "@/features/auth/server/authorization";
import {
  canCreateKnowledgeArticle,
  canEditKnowledgeArticle,
  canManageKnowledgeArticles,
} from "@/features/knowledge/policies/knowledge-authorization";
import {
  createKnowledgeArticleSchema,
  updateKnowledgeArticleSchema,
  updateKnowledgeArticleStatusSchema,
  type CreateKnowledgeArticleInput,
  type UpdateKnowledgeArticleInput,
  type UpdateKnowledgeArticleStatusInput,
} from "@/features/knowledge/schemas/knowledge-actions";
import type { KnowledgeActionResult } from "@/features/knowledge/types/knowledge-base";
import { prisma } from "@/lib/prisma";

class KnowledgeMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnowledgeMutationError";
  }
}

function firstValidationMessage(
  issues: Array<{ message: string }>,
) {
  return (
    issues[0]?.message ??
    "The article details are invalid."
  );
}

function mutationFailure(
  error: unknown,
): KnowledgeActionResult {
  if (
    error instanceof AuthorizationError ||
    error instanceof KnowledgeMutationError
  ) {
    return {
      success: false,
      message: error.message,
    };
  }

  console.error(
    "Knowledge article mutation failed.",
    error,
  );

  return {
    success: false,
    message:
      "The article could not be saved. Check the connection and try again.",
  };
}

function articleSnapshot(article: {
  title: string;
  summary: string;
  category: string;
  tags: string[];
  status: string;
}) {
  return {
    title: article.title,
    summary: article.summary,
    category: article.category,
    tags: article.tags,
    status: article.status,
  };
}

function changedFields(
  previous: ReturnType<
    typeof articleSnapshot
  >,
  next: ReturnType<typeof articleSnapshot>,
) {
  return [
    "title",
    "summary",
    "category",
    "tags",
  ].filter((field) => {
    const key = field as keyof typeof previous;

    return JSON.stringify(previous[key]) !==
      JSON.stringify(next[key]);
  });
}

export async function createKnowledgeArticleAction(
  rawInput: CreateKnowledgeArticleInput,
): Promise<KnowledgeActionResult> {
  const validation =
    createKnowledgeArticleSchema.safeParse(
      rawInput,
    );

  if (!validation.success) {
    return {
      success: false,
      message: firstValidationMessage(
        validation.error.issues,
      ),
    };
  }

  try {
    const workspace =
      await getAuthorizedWorkspace();

    if (
      !canCreateKnowledgeArticle(
        workspace.membership.role,
      )
    ) {
      throw new AuthorizationError(
        "Your current role cannot create knowledge articles.",
      );
    }

    const input = validation.data;
    const article =
      await prisma.$transaction(
        async (transaction) => {
          const created =
            await transaction.knowledgeArticle.create(
              {
                data: {
                  organizationId:
                    workspace.organization.id,
                  authorId:
                    workspace.user.id,
                  title: input.title,
                  summary: input.summary,
                  content: input.content,
                  category: input.category,
                  tags: input.tags,
                  status: "DRAFT",
                },
              },
            );

          await transaction.knowledgeArticleEvent.create(
            {
              data: {
                articleId: created.id,
                actorId:
                  workspace.user.id,
                action:
                  "KNOWLEDGE_ARTICLE_CREATED",
                toValue:
                  articleSnapshot(created),
                metadata: {
                  source:
                    "knowledge-base",
                },
              },
            },
          );

          return created;
        },
      );

    revalidatePath("/knowledge");

    return {
      success: true,
      message:
        "Draft article created successfully.",
      articleId: article.id,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function updateKnowledgeArticleAction(
  rawInput: UpdateKnowledgeArticleInput,
): Promise<KnowledgeActionResult> {
  const validation =
    updateKnowledgeArticleSchema.safeParse(
      rawInput,
    );

  if (!validation.success) {
    return {
      success: false,
      message: firstValidationMessage(
        validation.error.issues,
      ),
    };
  }

  try {
    const workspace =
      await getAuthorizedWorkspace();
    const input = validation.data;

    const result =
      await prisma.$transaction(
        async (transaction) => {
          const existing =
            await transaction.knowledgeArticle.findFirst(
              {
                where: {
                  id: input.articleId,
                  organizationId:
                    workspace.organization.id,
                },
              },
            );

          if (!existing) {
            throw new KnowledgeMutationError(
              "The article no longer exists in this workspace.",
            );
          }

          if (
            !canEditKnowledgeArticle({
              role: workspace.membership.role,
              userId: workspace.user.id,
              article: existing,
            })
          ) {
            throw new AuthorizationError(
              "Your current role cannot edit this article.",
            );
          }

          const previous =
            articleSnapshot(existing);
          const next = {
            ...previous,
            title: input.title,
            summary: input.summary,
            category: input.category,
            tags: input.tags,
          };
          const fields = changedFields(
            previous,
            next,
          );
          const contentChanged =
            existing.content !== input.content;

          if (
            fields.length === 0 &&
            !contentChanged
          ) {
            return {
              article: existing,
              changed: false,
            };
          }

          const updated =
            await transaction.knowledgeArticle.update(
              {
                where: {
                  id: existing.id,
                },
                data: {
                  title: input.title,
                  summary: input.summary,
                  content: input.content,
                  category: input.category,
                  tags: input.tags,
                },
              },
            );

          await transaction.knowledgeArticleEvent.create(
            {
              data: {
                articleId: updated.id,
                actorId:
                  workspace.user.id,
                action:
                  "KNOWLEDGE_ARTICLE_UPDATED",
                fromValue: previous,
                toValue:
                  articleSnapshot(updated),
                metadata: {
                  source:
                    "knowledge-base",
                  changedFields: [
                    ...fields,
                    ...(contentChanged
                      ? ["content"]
                      : []),
                  ],
                },
              },
            },
          );

          return {
            article: updated,
            changed: true,
          };
        },
      );

    revalidatePath("/knowledge");
    revalidatePath(
      `/knowledge/${result.article.id}`,
    );

    return {
      success: true,
      message: result.changed
        ? "Article changes saved."
        : "No article changes were detected.",
      articleId: result.article.id,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function updateKnowledgeArticleStatusAction(
  rawInput: UpdateKnowledgeArticleStatusInput,
): Promise<KnowledgeActionResult> {
  const validation =
    updateKnowledgeArticleStatusSchema.safeParse(
      rawInput,
    );

  if (!validation.success) {
    return {
      success: false,
      message: firstValidationMessage(
        validation.error.issues,
      ),
    };
  }

  try {
    const workspace =
      await getAuthorizedWorkspace();

    if (
      !canManageKnowledgeArticles(
        workspace.membership.role,
      )
    ) {
      throw new AuthorizationError(
        "Your current role cannot publish or archive articles.",
      );
    }

    const input = validation.data;
    const result =
      await prisma.$transaction(
        async (transaction) => {
          const existing =
            await transaction.knowledgeArticle.findFirst(
              {
                where: {
                  id: input.articleId,
                  organizationId:
                    workspace.organization.id,
                },
              },
            );

          if (!existing) {
            throw new KnowledgeMutationError(
              "The article no longer exists in this workspace.",
            );
          }

          if (existing.status === input.status) {
            return {
              article: existing,
              changed: false,
            };
          }

          const updated =
            await transaction.knowledgeArticle.update(
              {
                where: {
                  id: existing.id,
                },
                data: {
                  status: input.status,
                  publishedAt:
                    input.status ===
                    "PUBLISHED"
                      ? new Date()
                      : input.status ===
                          "DRAFT"
                        ? null
                        : existing.publishedAt,
                },
              },
            );

          await transaction.knowledgeArticleEvent.create(
            {
              data: {
                articleId: updated.id,
                actorId:
                  workspace.user.id,
                action:
                  "KNOWLEDGE_ARTICLE_STATUS_CHANGED",
                fromValue: {
                  status: existing.status,
                },
                toValue: {
                  status: updated.status,
                },
                metadata: {
                  source:
                    "knowledge-base",
                },
              },
            },
          );

          return {
            article: updated,
            changed: true,
          };
        },
      );

    revalidatePath("/knowledge");
    revalidatePath(
      `/knowledge/${result.article.id}`,
    );

    const statusLabel =
      input.status.toLowerCase();

    return {
      success: true,
      message: result.changed
        ? `Article moved to ${statusLabel}.`
        : `Article is already ${statusLabel}.`,
      articleId: result.article.id,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}
