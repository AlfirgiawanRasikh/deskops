import { z } from "zod";

import {
  knowledgeStatusFilters,
  type KnowledgeBaseQuery,
  type KnowledgeBaseSearchParams,
} from "@/features/knowledge/types/knowledge-base";

function firstValue(value: unknown) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

const knowledgeBaseQuerySchema = z.object({
  q: z.preprocess(
    firstValue,
    z.string().trim().max(80).catch(""),
  ),
  category: z.preprocess(
    firstValue,
    z.string().trim().max(80).catch("ALL"),
  ),
  status: z.preprocess(
    firstValue,
    z.enum(knowledgeStatusFilters).catch("ALL"),
  ),
  page: z.preprocess(
    (value) => firstValue(value) ?? "1",
    z.coerce
      .number()
      .int()
      .min(1)
      .max(10_000)
      .catch(1),
  ),
});

export function parseKnowledgeBaseQuery(
  searchParams: KnowledgeBaseSearchParams,
): KnowledgeBaseQuery {
  const result =
    knowledgeBaseQuerySchema.parse(
      searchParams,
    );

  return {
    query: result.q,
    category:
      result.category.length > 0
        ? result.category
        : "ALL",
    status: result.status,
    page: result.page,
  };
}
