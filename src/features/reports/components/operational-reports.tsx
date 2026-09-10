import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Clock3,
  Download,
  Inbox,
  Laptop,
  ShieldCheck,
  TicketPlus,
  TriangleAlert,
  Users,
} from "lucide-react";
import Link from "next/link";

import type {
  OperationalReportData,
  ReportBreakdownItem,
  ReportTrendPoint,
  TechnicianWorkload,
} from "@/features/reports/types/operational-report";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(
    value,
  );
}

function formatDuration(
  hours: number | null,
) {
  if (hours === null) {
    return "—";
  }

  if (hours < 1) {
    return "<1h";
  }

  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }

  const days = hours / 24;

  return `${days.toFixed(1)}d`;
}

function formatComplianceRate(
  value: number | null,
) {
  return value === null
    ? "—"
    : `${value}%`;
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone?:
    | "neutral"
    | "accent"
    | "success"
    | "danger";
}) {
  const iconClass = {
    neutral:
      "bg-[#edf0f4] text-[#596273]",
    accent:
      "bg-selected text-accent",
    success:
      "bg-[#edf8f2] text-[#33845d]",
    danger:
      "bg-[#fff0f0] text-danger",
  }[tone];

  return (
    <article className="border-b border-line px-4 py-3 last:border-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-muted">
            {label}
          </p>
          <p className="mt-1.5 text-[21px] font-semibold tracking-[-0.02em] text-ink">
            {value}
          </p>
        </div>

        <div
          className={`grid size-7 place-items-center rounded-[5px] ${iconClass}`}
        >
          <Icon
            aria-hidden="true"
            className="size-3.5"
            strokeWidth={1.8}
          />
        </div>
      </div>

      <p className="mt-1 text-[10px] leading-4 text-muted">
        {description}
      </p>
    </article>
  );
}

function EmptyPanel({
  message,
}: {
  message: string;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-[11px] text-muted">
        {message}
      </p>
    </div>
  );
}

function BreakdownPanel({
  title,
  description,
  items,
  barClassName,
}: {
  title: string;
  description: string;
  items: ReportBreakdownItem[];
  barClassName: string;
}) {
  const maximumValue = Math.max(
    1,
    ...items.map((item) => item.value),
  );

  const total = items.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  return (
    <section className="overflow-hidden rounded-[6px] border border-line bg-surface">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-[12px] font-semibold text-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-[10px] text-muted">
            {description}
          </p>
        </div>

        <span className="text-[10px] tabular-nums text-muted">
          {formatNumber(total)}
        </span>
      </header>

      {items.length > 0 ? (
        <div className="space-y-3 px-4 py-3.5">
          {items.map((item) => {
            const percentage =
              (item.value / maximumValue) *
              100;

            return (
              <div key={item.key}>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[11px] text-[#4c5563]">
                    {item.label}
                  </p>
                  <p className="text-[11px] font-medium tabular-nums text-ink">
                    {formatNumber(item.value)}
                  </p>
                </div>

                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#edf0f3]">
                  <div
                    className={`h-full rounded-full ${barClassName}`}
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyPanel message="No data is available for this report." />
      )}
    </section>
  );
}

function TicketTrendPanel({
  points,
}: {
  points: ReportTrendPoint[];
}) {
  const maximumValue = Math.max(
    1,
    ...points.flatMap((point) => [
      point.created,
      point.resolved,
    ]),
  );

  return (
    <section className="overflow-hidden rounded-[6px] border border-line bg-surface">
      <header className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[12px] font-semibold text-ink">
            Ticket flow
          </h2>
          <p className="mt-0.5 text-[10px] text-muted">
            Tickets created and resolved during the selected period
          </p>
        </div>

        <div className="flex items-center gap-3 text-[9px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent" />
            Created
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" />
            Resolved
          </span>
        </div>
      </header>

      {points.length > 0 ? (
        <div className="divide-y divide-line">
          {points.map((point) => (
            <div
              className="grid grid-cols-[76px_minmax(0,1fr)_28px] items-center gap-3 px-4 py-2.5"
              key={point.key}
            >
              <p className="truncate text-[9px] text-muted">
                {point.label}
              </p>

              <div className="space-y-1.5">
                <div
                  aria-label={`${point.created} tickets created`}
                  className="h-1.5 overflow-hidden rounded-full bg-[#edf0f3]"
                >
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${
                        (point.created /
                          maximumValue) *
                        100
                      }%`,
                    }}
                  />
                </div>

                <div
                  aria-label={`${point.resolved} tickets resolved`}
                  className="h-1.5 overflow-hidden rounded-full bg-[#edf0f3]"
                >
                  <div
                    className="h-full rounded-full bg-success"
                    style={{
                      width: `${
                        (point.resolved /
                          maximumValue) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="text-right text-[9px] leading-[14px] tabular-nums">
                <p className="text-accent">
                  {point.created}
                </p>
                <p className="text-[#33845d]">
                  {point.resolved}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanel message="No ticket activity was recorded for this period." />
      )}
    </section>
  );
}

function WorkloadTable({
  members,
}: {
  members: TechnicianWorkload[];
}) {
  return (
    <section className="overflow-hidden rounded-[6px] border border-line bg-surface">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-[12px] font-semibold text-ink">
            Technician workload
          </h2>
          <p className="mt-0.5 text-[10px] text-muted">
            Current assigned work for active operational members
          </p>
        </div>

        <Users
          aria-hidden="true"
          className="size-4 text-muted"
          strokeWidth={1.8}
        />
      </header>

      {members.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead className="bg-[#fafbfc] text-[9px] font-medium uppercase tracking-[0.04em] text-muted">
              <tr>
                <th className="px-4 py-2.5">
                  Member
                </th>
                <th className="px-3 py-2.5">
                  Role
                </th>
                <th className="px-3 py-2.5 text-right">
                  Open
                </th>
                <th className="px-3 py-2.5 text-right">
                  Urgent
                </th>
                <th className="px-4 py-2.5 text-right">
                  SLA breached
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {members.map((member) => (
                <tr
                  className="hover:bg-[#fafbfc]"
                  key={member.membershipId}
                >
                  <td className="px-4 py-3">
                    <p className="max-w-[220px] truncate text-[11px] font-medium text-ink">
                      {member.name}
                    </p>
                  </td>

                  <td className="px-3 py-3 text-[10px] text-muted">
                    {member.roleLabel}
                  </td>

                  <td className="px-3 py-3 text-right text-[11px] tabular-nums text-[#4c5563]">
                    {member.openTickets}
                  </td>

                  <td className="px-3 py-3 text-right text-[11px] tabular-nums text-[#4c5563]">
                    {member.urgentTickets}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        member.overdueTickets > 0
                          ? "text-[11px] font-medium tabular-nums text-danger"
                          : "text-[11px] tabular-nums text-[#4c5563]"
                      }
                    >
                      {member.overdueTickets}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyPanel message="No active managers or technicians were found." />
      )}
    </section>
  );
}

export function OperationalReports({
  data,
}: {
  data: OperationalReportData;
}) {
  const rangeOptions = [
    {
      value: "7d",
      label: "7 days",
    },
    {
      value: "30d",
      label: "30 days",
    },
    {
      value: "90d",
      label: "90 days",
    },
  ] as const;

  return (
    <main className="mx-auto max-w-[1480px] p-4 sm:p-6">
      <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-medium text-muted">
            {data.organizationName}
          </p>

          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">
            Operational reports
          </h1>

          <p className="mt-1.5 max-w-[760px] text-[13px] leading-5 text-muted">
            Ticket flow, service targets, technician workload, recurring issues, and asset inventory.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[9px] text-muted">
              Generated {data.generatedAt}
            </p>

            <Link
              className="inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-action bg-action px-2.5 text-[10px] font-medium text-white transition-colors hover:bg-[#2f3540]"
              href={`/api/reports/operational/xlsx?range=${data.range}`}
            >
              <Download
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={1.8}
              />
              Export Excel
            </Link>

            <Link
              className="inline-flex h-7 items-center rounded-[5px] border border-line bg-surface px-2.5 text-[10px] font-medium text-[#4c5563] transition-colors hover:bg-canvas hover:text-ink"
              href={`/api/reports/operational?range=${data.range}`}
            >
              CSV
            </Link>
          </div>

          <div className="inline-flex rounded-[5px] border border-line bg-surface p-0.5">
            {rangeOptions.map((option) => {
              const isActive =
                option.value === data.range;

              return (
                <Link
                  aria-current={
                    isActive
                      ? "page"
                      : undefined
                  }
                  className={`rounded-[4px] px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                    isActive
                      ? "bg-action text-white"
                      : "text-muted hover:bg-canvas hover:text-ink"
                  }`}
                  href={`/reports?range=${option.value}`}
                  key={option.value}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <section
        aria-label="Operational report summary"
        className="mt-5 grid overflow-hidden rounded-[6px] border border-line bg-surface sm:grid-cols-2 xl:grid-cols-6"
      >
        <SummaryCard
          description={data.rangeLabel}
          icon={TicketPlus}
          label="Created"
          tone="accent"
          value={formatNumber(
            data.summary.createdTickets,
          )}
        />

        <SummaryCard
          description={data.rangeLabel}
          icon={CheckCircle2}
          label="Resolved"
          tone="success"
          value={formatNumber(
            data.summary.resolvedTickets,
          )}
        />

        <SummaryCard
          description="Current organization backlog"
          icon={Inbox}
          label="Open"
          value={formatNumber(
            data.summary.openTickets,
          )}
        />

        <SummaryCard
          description="Missed an active SLA target"
          icon={TriangleAlert}
          label="SLA breached"
          tone={
            data.summary.overdueTickets > 0
              ? "danger"
              : "neutral"
          }
          value={formatNumber(
            data.summary.overdueTickets,
          )}
        />

        <SummaryCard
          description={`${formatComplianceRate(
            data.summary
              .firstResponseSlaComplianceRate,
          )} response · ${formatComplianceRate(
            data.summary
              .resolutionSlaComplianceRate,
          )} resolution`}
          icon={ShieldCheck}
          label="SLA compliance"
          tone={
            data.summary.slaComplianceRate !==
              null &&
            data.summary.slaComplianceRate <
              80
              ? "danger"
              : "success"
          }
          value={formatComplianceRate(
            data.summary.slaComplianceRate,
          )}
        />

        <SummaryCard
          description="For tickets resolved in range"
          icon={Clock3}
          label="Mean resolution"
          value={formatDuration(
            data.summary
              .meanResolutionHours,
          )}
        />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <TicketTrendPanel
          points={data.ticketTrend}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <BreakdownPanel
            barClassName="bg-accent"
            description="Current unresolved work"
            items={data.statusBreakdown}
            title="Backlog by status"
          />

          <BreakdownPanel
            barClassName="bg-[#7f8ca3]"
            description="Current unresolved work"
            items={data.priorityBreakdown}
            title="Backlog by priority"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <WorkloadTable
          members={
            data.technicianWorkload
          }
        />

        <BreakdownPanel
          barClassName="bg-[#64748b]"
          description="Current inventory"
          items={
            data.assetStatusBreakdown
          }
          title="Assets by status"
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <BreakdownPanel
          barClassName="bg-[#6b7fc5]"
          description={data.rangeLabel}
          items={data.categoryBreakdown}
          title="Top ticket categories"
        />

        <section className="overflow-hidden rounded-[6px] border border-line bg-surface">
          <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-[12px] font-semibold text-ink">
                Affected asset models
              </h2>
              <p className="mt-0.5 text-[10px] text-muted">
                Linked tickets created during the selected period
              </p>
            </div>

            <Laptop
              aria-hidden="true"
              className="size-4 text-muted"
              strokeWidth={1.8}
            />
          </header>

          {data.affectedAssetModels.length >
          0 ? (
            <div className="divide-y divide-line">
              {data.affectedAssetModels.map(
                (item, index) => (
                  <div
                    className="flex items-center gap-3 px-4 py-3"
                    key={item.key}
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-[4px] bg-[#edf0f4] text-[9px] font-medium text-muted">
                      {index + 1}
                    </span>

                    <p className="min-w-0 flex-1 truncate text-[11px] text-[#4c5563]">
                      {item.label}
                    </p>

                    <p className="text-[11px] font-medium tabular-nums text-ink">
                      {item.value}
                    </p>
                  </div>
                ),
              )}
            </div>
          ) : (
            <EmptyPanel message="No asset-linked tickets were created in this period." />
          )}
        </section>
      </div>
    </main>
  );
}
