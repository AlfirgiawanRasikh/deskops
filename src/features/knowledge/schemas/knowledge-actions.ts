import { z } from "zod";

function normalizeTags(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return [
    ...new Set(
      values
        .filter(
          (tag): tag is string =>
            typeof tag === "string",
        )
        .map((tag) =>
          tag.trim().toLowerCase(),
        )
        .filter(Boolean),
    ),
  ];
}

const articleFields = {
  title: z
    .string()
    .trim()
    .min(5, "Title must contain at least 5 characters.")
    .max(120, "Title cannot exceed 120 characters."),
  summary: z
    .string()
    .trim()
    .min(20, "Summary must contain at least 20 characters.")
    .max(240, "Summary cannot exceed 240 characters."),
  content: z
    .string()
    .trim()
    .min(100, "Article content must contain at least 100 characters.")
    .max(20_000, "Article content cannot exceed 20,000 characters."),
  category: z
    .string()
    .trim()
    .min(2, "Category must contain at least 2 characters.")
    .max(80, "Category cannot exceed 80 characters."),
  tags: z.preprocess(
    normalizeTags,
    z
      .array(
        z
          .string()
          .max(30, "Each tag cannot exceed 30 characters."),
      )
      .max(8, "Use no more than 8 tags."),
  ),
};

export const createKnowledgeArticleSchema =
  z.object(articleFields);

export const updateKnowledgeArticleSchema =
  z.object({
    articleId: z.string().trim().min(1),
    ...articleFields,
  });

export const updateKnowledgeArticleStatusSchema =
  z.object({
    articleId: z.string().trim().min(1),
    status: z.enum([
      "DRAFT",
      "PUBLISHED",
      "ARCHIVED",
    ]),
  });

export type CreateKnowledgeArticleInput =
  z.infer<
    typeof createKnowledgeArticleSchema
  >;

export type UpdateKnowledgeArticleInput =
  z.infer<
    typeof updateKnowledgeArticleSchema
  >;

export type UpdateKnowledgeArticleStatusInput =
  z.infer<
    typeof updateKnowledgeArticleStatusSchema
  >;
