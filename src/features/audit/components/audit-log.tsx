import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileClock,
  Laptop,
  Search,
  Settings,
  Ticket,
  UserRoundCog,
} from "lucide-react";
import Link from "next/link";

import type {
  AuditLogData,
  AuditLogQuery,
  AuditLogRecordCategory,
} from "@/features/audit/types/audit-log";

const categoryClasses: Record<
  AuditLogRecordCategory,
  string
> = {
  TICKET:
    "border-[#cfdcf2] bg-[#f2f6fc] text-[#49627d]",
  ASSET:
    "border-[#cde2d5] bg-[#f2f8f4] text-[#3f6f50]",
  MEMBER:
    "border-[#e4d9c5] bg-[#faf7f1] text-[#755d37]",
  WORKSPACE:
    "border-[#ddd6ea] bg-[#f7f4fb] text-[#62517d]",
};

const categoryOptions = [
  {
    value: "ALL",
    label: "All categories",
  },
  {
    value: "TICKET",
    label: "Tickets",
  },
  {
    value: "ASSET",
    label: "Assets",
  },
  {
    value: "MEMBER",
    label: "Members",
  },
  {
    value: "WORKSPACE",
    label: "Workspace",
  },
] as const;

const rangeOptions = [
  {
    value: "7d",
    label: "Last 7 days",
  },
  {
    value: "30d",
    label: "Last 30 days",
  },
  {
    value: "90d",
    label: "Last 90 days",
  },
] as const;

const metricIcons = [
  FileClock,
  Ticket,
  Laptop,
  UserRoundCog,
] as const;

function createAuditHref(
  query: AuditLogQuery,
  page: number,
) {
  const parameters =
    new URLSearchParams();

  if (query.query) {
    parameters.set("q", query.query);
  }

  if (query.category !== "ALL") {
    parameters.set(
      "category",
      query.category,
    );
  }

  if (query.actorId !== "ALL") {
    parameters.set(
      "actor",
      query.actorId,
    );
  }

  if (query.range !== "30d") {
    parameters.set("range", query.range);
  }

  if (page > 1) {
    parameters.set("page", String(page));
  }

  const queryString =
    parameters.toString();

  return queryString
    ? `/audit?${queryString}`
    : "/audit";
}

function createExportHref(
  query: AuditLogQuery,
) {
  const auditHref = createAuditHref(
    query,
    1,
  );
  const queryString =
    auditHref.includes("?")
      ? auditHref.slice(
          auditHref.indexOf("?"),
        )
      : "";

  return `/api/audit${queryString}`;
}

export function AuditLog({
  data,
}: {
  data: AuditLogData;
}) {
  const hasFilters =
    data.query.query.length > 0 ||
    data.query.category !== "ALL" ||
    data.query.actorId !== "ALL" ||
    data.query.range !== "30d";

  return (
    <main className="mx-auto max-w-[1480px] p-4 sm:p-6">
      <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-medium text-muted">
            {data.organizationName}
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">
            Audit log
          </h1>
          <p className="mt-1.5 max-w-[760px] text-[13px] leading-5 text-muted">
            Review security-relevant changes across tickets, assets, members, and workspace configuration.
          </p>
        </div>

        <Link
          className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-[5px] bg-action px-3 text-[11px] font-semibold text-white hover:bg-[#222831] lg:self-auto"
          href={createExportHref(
            data.query,
          )}
        >
          <Download
            aria-hidden="true"
            className="size-3.5"
            strokeWidth={1.8}
          />
          Export filtered CSV
        </Link>
      </header>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map(
          (metric, index) => {
            const Icon =
              metricIcons[index] ??
              FileClock;

            return (
              <article
                className="rounded-[6px] border border-line bg-surface px-4 py-3"
                key={metric.label}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-medium text-muted">
                    {metric.label}
                  </p>
                  <Icon
                    aria-hidden="true"
                    className="size-3.5 text-muted"
                    strokeWidth={1.8}
                  />
                </div>
                <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink tabular-nums">
                  {metric.value.toLocaleString(
                    "en",
                  )}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-muted">
                  {metric.description}
                </p>
              </article>
            );
          },
        )}
      </section>

      <section className="mt-4 overflow-hidden rounded-[6px] border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <FileClock
              aria-hidden="true"
              className="size-3.5 text-muted"
              strokeWidth={1.8}
            />
            <div>
              <h2 className="text-[12px] font-semibold text-ink">
                Organization activity
              </h2>
              <p className="mt-0.5 text-[10px] text-muted">
                Read-only records ordered from newest to oldest
              </p>
            </div>
          </div>
        </div>

        <form
          action="/audit"
          className="grid gap-2 border-b border-line bg-[#fafbfc] p-3 md:grid-cols-[minmax(220px,1fr)_160px_minmax(210px,0.8fr)_145px_auto]"
          method="get"
        >
          <label className="relative">
            <span className="sr-only">
              Search audit events
            </span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
              strokeWidth={1.8}
            />
            <input
              className="h-8 w-full rounded-[5px] border border-line bg-surface pl-8 pr-3 text-[11px] text-ink outline-none placeholder:text-muted focus:border-accent"
              defaultValue={data.query.query}
              maxLength={80}
              name="q"
              placeholder="Search action, actor, or resource"
            />
          </label>

          <label>
            <span className="sr-only">
              Filter category
            </span>
            <select
              className="h-8 w-full rounded-[5px] border border-line bg-surface px-2.5 text-[11px] text-ink outline-none focus:border-accent"
              defaultValue={
                data.query.category
              }
              name="category"
            >
              {categoryOptions.map(
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
          </label>

          <label>
            <span className="sr-only">
              Filter actor
            </span>
            <select
              className="h-8 w-full rounded-[5px] border border-line bg-surface px-2.5 text-[11px] text-ink outline-none focus:border-accent"
              defaultValue={
                data.query.actorId
              }
              name="actor"
            >
              {data.actorOptions.map(
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
          </label>

          <label>
            <span className="sr-only">
              Filter date range
            </span>
            <select
              className="h-8 w-full rounded-[5px] border border-line bg-surface px-2.5 text-[11px] text-ink outline-none focus:border-accent"
              defaultValue={data.query.range}
              name="range"
            >
              {rangeOptions.map(
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
          </label>

          <div className="flex gap-2">
            <button
              className="inline-flex h-8 items-center justify-center rounded-[5px] bg-action px-3 text-[11px] font-semibold text-white hover:bg-[#222831]"
              type="submit"
            >
              Apply
            </button>
            {hasFilters ? (
              <Link
                className="inline-flex h-8 items-center justify-center rounded-[5px] border border-line bg-surface px-3 text-[11px] font-medium text-muted hover:bg-canvas hover:text-ink"
                href="/audit"
              >
                Reset
              </Link>
            ) : null}
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead>
              <tr className="h-9 border-b border-line bg-[#fafbfc] text-[10px] font-medium text-muted">
                <th className="w-[175px] px-4 font-medium">
                  Occurred
                </th>
                <th className="w-[110px] px-3 font-medium">
                  Category
                </th>
                <th className="min-w-[330px] px-3 font-medium">
                  Activity
                </th>
                <th className="w-[220px] px-3 font-medium">
                  Actor
                </th>
                <th className="min-w-[260px] px-4 font-medium">
                  Resource
                </th>
              </tr>
            </thead>

            <tbody>
              {data.records.length > 0 ? (
                data.records.map(
                  (event) => (
                    <tr
                      className="border-b border-line last:border-0 hover:bg-[#fafbfc]"
                      key={event.id}
                    >
                      <td className="px-4 py-3 align-top text-[10px] text-muted tabular-nums">
                        <time
                          dateTime={
                            event.occurredAtIso
                          }
                        >
                          {event.occurredAt}
                        </time>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                            categoryClasses[
                              event.category
                            ]
                          }`}
                        >
                          {event.categoryLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <p className="text-[11px] font-semibold text-ink">
                          {event.action}
                        </p>
                        <p className="mt-1 text-[10px] leading-4 text-[#4c5563]">
                          {event.summary}
                        </p>
                        <p className="mt-1 text-[9px] text-muted">
                          Source: {event.source}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <p className="truncate text-[11px] font-medium text-ink">
                          {event.actor.name}
                        </p>
                        {event.actor.email ? (
                          <p className="mt-0.5 truncate text-[9px] text-muted">
                            {event.actor.email}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Link
                          className="line-clamp-2 text-[11px] font-medium leading-4 text-[#405b78] hover:text-ink hover:underline"
                          href={
                            event.resource.href
                          }
                        >
                          {event.resource.label}
                        </Link>
                      </td>
                    </tr>
                  ),
                )
              ) : (
                <tr>
                  <td
                    className="px-4 py-14 text-center"
                    colSpan={5}
                  >
                    <FileClock
                      aria-hidden="true"
                      className="mx-auto size-5 text-muted"
                      strokeWidth={1.6}
                    />
                    <p className="mt-2 text-[12px] font-medium text-ink">
                      No audit events found
                    </p>
                    <p className="mt-1 text-[10px] text-muted">
                      Adjust the filters or choose a longer date range.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-line bg-[#fafbfc] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-muted tabular-nums">
            {data.pagination.totalItems > 0
              ? `Showing ${data.pagination.firstItem}–${data.pagination.lastItem} of ${data.pagination.totalItems} events`
              : "No matching events"}
          </p>

          <div className="flex items-center gap-2">
            <Link
              aria-disabled={
                data.pagination.page <= 1
              }
              className={`inline-flex h-8 items-center gap-1 rounded-[5px] border border-line bg-surface px-2.5 text-[10px] font-medium ${
                data.pagination.page <= 1
                  ? "pointer-events-none text-[#a1a8b3]"
                  : "text-muted hover:bg-canvas hover:text-ink"
              }`}
              href={createAuditHref(
                data.query,
                Math.max(
                  1,
                  data.pagination.page - 1,
                ),
              )}
            >
              <ChevronLeft
                aria-hidden="true"
                className="size-3"
              />
              Previous
            </Link>

            <span className="min-w-[88px] text-center text-[10px] text-muted tabular-nums">
              Page {data.pagination.page} of{" "}
              {data.pagination.totalPages}
            </span>

            <Link
              aria-disabled={
                data.pagination.page >=
                data.pagination.totalPages
              }
              className={`inline-flex h-8 items-center gap-1 rounded-[5px] border border-line bg-surface px-2.5 text-[10px] font-medium ${
                data.pagination.page >=
                data.pagination.totalPages
                  ? "pointer-events-none text-[#a1a8b3]"
                  : "text-muted hover:bg-canvas hover:text-ink"
              }`}
              href={createAuditHref(
                data.query,
                Math.min(
                  data.pagination
                    .totalPages,
                  data.pagination.page + 1,
                ),
              )}
            >
              Next
              <ChevronRight
                aria-hidden="true"
                className="size-3"
              />
            </Link>
          </div>
        </footer>
      </section>

      <section className="mt-4 flex items-start gap-2 rounded-[6px] border border-line bg-surface px-4 py-3">
        <Settings
          aria-hidden="true"
          className="mt-0.5 size-3.5 shrink-0 text-muted"
          strokeWidth={1.8}
        />
        <p className="text-[10px] leading-4 text-muted">
          Audit records are read-only. Internal note content and raw event metadata are intentionally excluded from this view and its CSV export.
          Exports include up to 5,000 of the newest records matching the active filters.
        </p>
      </section>
    </main>
  );
}
