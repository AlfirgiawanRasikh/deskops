import { z } from "zod";

import {
  ticketWorkspacePriorityValues,
  ticketWorkspaceStatusValues,
  type TicketWorkspaceQuery,
  type TicketWorkspaceSearchParams,
} from "@/features/tickets/types/ticket-workspace";

function firstValue(value: unknown) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

const ticketWorkspaceQuerySchema = z.object({
  q: z.preprocess(
    firstValue,
    z.string().trim().max(80).catch(""),
  ),
  status: z.preprocess(
    firstValue,
    z
      .enum(ticketWorkspaceStatusValues)
      .catch("ALL"),
  ),
  priority: z.preprocess(
    firstValue,
    z
      .enum(ticketWorkspacePriorityValues)
      .catch("ALL"),
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

export function parseTicketWorkspaceQuery(
  searchParams: TicketWorkspaceSearchParams,
): TicketWorkspaceQuery {
  const result =
    ticketWorkspaceQuerySchema.parse(
      searchParams,
    );

  return {
    query: result.q,
    status: result.status,
    priority: result.priority,
    page: result.page,
  };
}
