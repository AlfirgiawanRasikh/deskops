import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Inbox,
  Search,
  TicketCheck,
} from "lucide-react";
import Link from "next/link";

import type {
  TicketWorkspaceData,
  TicketWorkspacePriorityFilter,
  TicketWorkspaceQuery,
  TicketWorkspaceStatusFilter,
} from "@/features/tickets/types/ticket-workspace";

const statusOptions: Array<{
  value: TicketWorkspaceStatusFilter;
  label: string;
}> = [
  { value: "ALL", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "TRIAGED", label: "Triaged" },
  {
    value: "IN_PROGRESS",
    label: "In progress",
  },
  {
    value: "WAITING_REQUESTER",
    label: "Waiting requester",
  },
  {
    value: "WAITING_APPROVAL",
    label: "Waiting approval",
  },
  {
    value: "SCHEDULED",
    label: "Scheduled",
  },
  {
    value: "RESOLVED",
    label: "Resolved",
  },
  { value: "CLOSED", label: "Closed" },
  {
    value: "CANCELED",
    label: "Canceled",
  },
];

const priorityOptions: Array<{
  value: TicketWorkspacePriorityFilter;
  label: string;
}> = [
  {
    value: "ALL",
    label: "All priorities",
  },
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "NORMAL", label: "Normal" },
  { value: "LOW", label: "Low" },
];

const priorityClasses: Record<
  Exclude<
    TicketWorkspacePriorityFilter,
    "ALL"
  >,
  string
> = {
  URGENT: "text-danger",
  HIGH: "text-warning",
  NORMAL: "text-[#4c5563]",
  LOW: "text-muted",
};

const statusDotClasses: Record<
  Exclude<
    TicketWorkspaceStatusFilter,
    "ALL"
  >,
  string
> = {
  OPEN: "bg-[#98a2b3]",
  TRIAGED: "bg-warning",
  IN_PROGRESS: "bg-success",
  WAITING_REQUESTER: "bg-warning",
  WAITING_APPROVAL: "bg-accent",
  SCHEDULED: "bg-accent",
  RESOLVED: "bg-success",
  CLOSED: "bg-[#667085]",
  CANCELED: "bg-danger",
};

const slaClasses = {
  danger: "text-danger",
  warning: "text-warning",
  neutral: "text-[#4c5563]",
  complete: "text-muted",
} as const;

function createTicketWorkspaceHref(
  basePath: string,
  query: TicketWorkspaceQuery,
  page = query.page,
) {
  const parameters =
    new URLSearchParams();

  if (query.query) {
    parameters.set("q", query.query);
  }

  if (query.status !== "ALL") {
    parameters.set(
      "status",
      query.status,
    );
  }

  if (query.priority !== "ALL") {
    parameters.set(
      "priority",
      query.priority,
    );
  }

  if (page > 1) {
    parameters.set(
      "page",
      String(page),
    );
  }

  const queryString =
    parameters.toString();

  return queryString
    ? `${basePath}?${queryString}`
    : basePath;
}

function createTicketDetailHref(
  ticketId: string,
  returnTo: string,
) {
  const parameters =
    new URLSearchParams({
      returnTo,
    });

  return `/tickets/${ticketId}?${parameters.toString()}`;
}

function PaginationLink({
  href,
  disabled,
  label,
  direction,
}: {
  href: string;
  disabled: boolean;
  label: string;
  direction: "previous" | "next";
}) {
  const Icon =
    direction === "previous"
      ? ChevronLeft
      : ChevronRight;

  const className =
    "inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-line px-2.5 text-[11px] font-medium";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${className} cursor-not-allowed bg-canvas text-[#98a2b3]`}
      >
        {direction === "previous" ? (
          <Icon
            aria-hidden="true"
            className="size-3.5"
          />
        ) : null}
        {label}
        {direction === "next" ? (
          <Icon
            aria-hidden="true"
            className="size-3.5"
          />
        ) : null}
      </span>
    );
  }

  return (
    <Link
      className={`${className} bg-surface text-[#4c5563] hover:bg-canvas hover:text-ink`}
      href={href}
    >
      {direction === "previous" ? (
        <Icon
          aria-hidden="true"
          className="size-3.5"
        />
      ) : null}
      {label}
      {direction === "next" ? (
        <Icon
          aria-hidden="true"
          className="size-3.5"
        />
      ) : null}
    </Link>
  );
}

export function TicketWorkspace({
  data,
}: {
  data: TicketWorkspaceData;
}) {
  const basePath =
    data.view === "all"
      ? "/tickets"
      : "/tickets/my-queue";

  const hasFilters = Boolean(
    data.query.query ||
      data.query.status !== "ALL" ||
      data.query.priority !== "ALL",
  );

  const returnTo =
    createTicketWorkspaceHref(
      basePath,
      data.query,
    );

  return (
    <main className="mx-auto max-w-[1480px] p-4 sm:p-6">
      <header className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium text-muted">
            {data.organizationName}
          </p>

          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">
            {data.title}
          </h1>

          <p className="mt-1.5 max-w-[760px] text-[13px] leading-5 text-muted">
            {data.description}
          </p>
        </div>

        <Link
          className="inline-flex h-8 items-center justify-center gap-2 self-start rounded-[5px] border border-line bg-surface px-3 text-[11px] font-medium text-[#4c5563] hover:bg-canvas hover:text-ink sm:self-auto"
          href="/"
        >
          <TicketCheck
            aria-hidden="true"
            className="size-3.5"
            strokeWidth={1.8}
          />
          Open operations dashboard
        </Link>
      </header>

      <section
        aria-label="Ticket workspace summary"
        className="mt-5 grid overflow-hidden rounded-[6px] border border-line bg-surface sm:grid-cols-2 xl:grid-cols-4"
      >
        {data.metrics.map((metric) => (
          <div
            className="border-b border-line px-4 py-3 last:border-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
            key={metric.label}
          >
            <p className="text-[11px] font-medium text-muted">
              {metric.label}
            </p>
            <p className="mt-1 text-[21px] font-semibold tracking-[-0.02em] text-ink tabular-nums">
              {metric.value}
            </p>
            <p className="mt-0.5 text-[10px] text-muted">
              {metric.description}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-5 overflow-hidden rounded-[6px] border border-line bg-surface">
        <form
          action={basePath}
          className="grid gap-3 border-b border-line bg-[#fafbfc] p-4 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto]"
          key={`${data.query.query}-${data.query.status}-${data.query.priority}`}
          method="get"
        >
          <label className="relative">
            <span className="sr-only">
              Search tickets
            </span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
              strokeWidth={1.8}
            />
            <input
              className="h-8 w-full rounded-[5px] border border-line bg-surface pl-8 pr-3 text-[12px] text-ink outline-none placeholder:text-[#98a2b3] focus:border-accent"
              defaultValue={data.query.query}
              maxLength={80}
              name="q"
              placeholder="Search ID, title, requester, owner, or category"
              type="search"
            />
          </label>

          <label className="relative">
            <span className="sr-only">
              Filter by status
            </span>
            <select
              className="h-8 w-full appearance-none rounded-[5px] border border-line bg-surface px-2.5 pr-7 text-[11px] text-[#4c5563] outline-none focus:border-accent"
              defaultValue={data.query.status}
              name="status"
            >
              {statusOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
            <Filter
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
              strokeWidth={1.8}
            />
          </label>

          <label className="relative">
            <span className="sr-only">
              Filter by priority
            </span>
            <select
              className="h-8 w-full appearance-none rounded-[5px] border border-line bg-surface px-2.5 pr-7 text-[11px] text-[#4c5563] outline-none focus:border-accent"
              defaultValue={data.query.priority}
              name="priority"
            >
              {priorityOptions.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
            <Filter
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
              strokeWidth={1.8}
            />
          </label>

          <div className="flex gap-2">
            <button
              className="h-8 rounded-[5px] bg-action px-3 text-[11px] font-medium text-white hover:bg-[#15191f]"
              type="submit"
            >
              Apply filters
            </button>

            {hasFilters ? (
              <Link
                className="inline-flex h-8 items-center rounded-[5px] border border-line bg-surface px-3 text-[11px] font-medium text-muted hover:bg-canvas hover:text-ink"
                href={basePath}
              >
                Reset
              </Link>
            ) : null}
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead>
              <tr className="h-9 border-b border-line bg-[#fafbfc] text-[11px] font-medium text-muted">
                <th className="w-[100px] px-4 font-medium">
                  Ticket
                </th>
                <th className="px-3 font-medium">
                  Request
                </th>
                <th className="w-[100px] px-3 font-medium">
                  Priority
                </th>
                <th className="w-[150px] px-3 font-medium">
                  Status
                </th>
                <th className="w-[150px] px-3 font-medium">
                  Owner
                </th>
                <th className="w-[105px] px-3 font-medium">
                  SLA
                </th>
                <th className="w-[160px] px-4 font-medium">
                  Updated
                </th>
              </tr>
            </thead>

            <tbody>
              {data.records.length > 0 ? (
                data.records.map((ticket) => (
                  <tr
                    className="h-[66px] border-b border-line last:border-0 hover:bg-[#fafbfc]"
                    key={ticket.databaseId}
                  >
                    <td className="px-4 align-middle text-[11px] font-medium text-[#4c5563] tabular-nums">
                      <Link
                        className="hover:text-ink"
                        href={createTicketDetailHref(
                          ticket.databaseId,
                          returnTo,
                        )}
                      >
                        {ticket.reference}
                      </Link>
                    </td>

                    <td className="max-w-0 px-3 align-middle">
                      <Link
                        className="block"
                        href={createTicketDetailHref(
                          ticket.databaseId,
                          returnTo,
                        )}
                      >
                        <span className="block truncate text-[12px] font-medium text-ink">
                          {ticket.title}
                        </span>
                        <span className="mt-1 block truncate text-[10px] text-muted">
                          {ticket.requesterName} ·{" "}
                          {ticket.requesterDepartment} ·{" "}
                          {ticket.category}
                        </span>
                      </Link>
                    </td>

                    <td
                      className={`px-3 align-middle text-[11px] font-medium ${
                        priorityClasses[
                          ticket.priority
                        ]
                      }`}
                    >
                      {ticket.priorityLabel}
                    </td>

                    <td className="px-3 align-middle">
                      <span className="inline-flex items-center gap-2 text-[11px] text-[#4c5563]">
                        <span
                          aria-hidden="true"
                          className={`size-1.5 rounded-full ${
                            statusDotClasses[
                              ticket.status
                            ]
                          }`}
                        />
                        {ticket.statusLabel}
                      </span>
                    </td>

                    <td className="max-w-[150px] truncate px-3 align-middle text-[11px] text-[#4c5563]">
                      {ticket.assigneeName}
                    </td>

                    <td
                      className={`px-3 align-middle text-[11px] font-medium tabular-nums ${
                        slaClasses[
                          ticket.slaState
                        ]
                      }`}
                    >
                      {ticket.slaLabel}
                    </td>

                    <td className="px-4 align-middle text-[10px] text-muted tabular-nums">
                      {ticket.updatedAt}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-4 py-14 text-center"
                    colSpan={7}
                  >
                    <div className="mx-auto grid size-9 place-items-center rounded-full bg-canvas text-muted">
                      <Inbox
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={1.8}
                      />
                    </div>
                    <p className="mt-3 text-[12px] font-medium text-ink">
                      No tickets found
                    </p>
                    <p className="mt-1 text-[10px] text-muted">
                      Adjust the filters or clear the search query.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-line bg-[#fafbfc] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-muted">
            Showing{" "}
            <span className="font-medium text-[#4c5563] tabular-nums">
              {data.pagination.firstItem}
            </span>
            {"–"}
            <span className="font-medium text-[#4c5563] tabular-nums">
              {data.pagination.lastItem}
            </span>{" "}
            of{" "}
            <span className="font-medium text-[#4c5563] tabular-nums">
              {data.pagination.totalItems}
            </span>{" "}
            matching tickets
          </p>

          <nav
            aria-label="Ticket pagination"
            className="flex items-center gap-2"
          >
            <PaginationLink
              direction="previous"
              disabled={
                data.pagination.page <= 1
              }
              href={createTicketWorkspaceHref(
                basePath,
                data.query,
                data.pagination.page - 1,
              )}
              label="Previous"
            />

            <span className="px-1 text-[10px] text-muted tabular-nums">
              Page{" "}
              {data.pagination.page} of{" "}
              {data.pagination.totalPages}
            </span>

            <PaginationLink
              direction="next"
              disabled={
                data.pagination.page >=
                data.pagination.totalPages
              }
              href={createTicketWorkspaceHref(
                basePath,
                data.query,
                data.pagination.page + 1,
              )}
              label="Next"
            />
          </nav>
        </footer>
      </section>
    </main>
  );
}
