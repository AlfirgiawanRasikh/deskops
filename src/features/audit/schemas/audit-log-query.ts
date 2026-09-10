import { z } from "zod";

import {
  auditLogCategoryValues,
  auditLogRangeValues,
  type AuditLogQuery,
  type AuditLogSearchParams,
} from "@/features/audit/types/audit-log";

function firstValue(value: unknown) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

const auditLogQuerySchema = z.object({
  q: z.preprocess(
    firstValue,
    z.string().trim().max(80).catch(""),
  ),
  category: z.preprocess(
    firstValue,
    z
      .enum(auditLogCategoryValues)
      .catch("ALL"),
  ),
  actor: z.preprocess(
    firstValue,
    z
      .string()
      .trim()
      .max(191)
      .regex(/^[A-Za-z0-9_-]+$/)
      .catch("ALL"),
  ),
  range: z.preprocess(
    firstValue,
    z
      .enum(auditLogRangeValues)
      .catch("30d"),
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

export function parseAuditLogQuery(
  searchParams: AuditLogSearchParams,
): AuditLogQuery {
  const result =
    auditLogQuerySchema.parse(
      searchParams,
    );

  return {
    query: result.q,
    category: result.category,
    actorId:
      result.actor.length > 0
        ? result.actor
        : "ALL",
    range: result.range,
    page: result.page,
  };
}

export function getAuditLogRangeStart(
  range: AuditLogQuery["range"],
  now: Date,
) {
  const days =
    range === "7d"
      ? 7
      : range === "90d"
        ? 90
        : 30;

  return new Date(
    now.getTime() -
      days * 24 * 60 * 60 * 1000,
  );
}
