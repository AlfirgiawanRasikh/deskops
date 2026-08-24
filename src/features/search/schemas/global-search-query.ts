import { z } from "zod";

export const globalSearchQuerySchema = z
  .string()
  .trim()
  .min(
    2,
    "Enter at least 2 characters.",
  )
  .max(
    80,
    "Search cannot exceed 80 characters.",
  );

export function parseGlobalSearchQuery(
  value: string | null,
) {
  return globalSearchQuerySchema.safeParse(
    value ?? "",
  );
}

export function getGlobalSearchTicketType(
  query: string,
): "INCIDENT" | "SERVICE_REQUEST" | null {
  const normalizedQuery = query
    .trim()
    .toUpperCase();

  if (
    /^INC(?:IDENT)?-?$/.test(
      normalizedQuery,
    )
  ) {
    return "INCIDENT";
  }

  if (
    /^REQ(?:UEST)?-?$/.test(
      normalizedQuery,
    )
  ) {
    return "SERVICE_REQUEST";
  }

  return null;
}
