"use client";

import {
  ArrowUpRight,
  ChevronDown,
  Clock3,
  Filter,
  MessageSquare,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import {
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  type DashboardMetric,
  type OperationsDashboardCapabilities,
  type SelectOption,
  type TicketPriority,
  type TicketRecord,
  type TicketStatus,
} from "@/features/operations/types/operations-dashboard";
import { NewTicketDialog } from "@/features/tickets/components/new-ticket-dialog";
import type { NewTicketInput } from "@/features/tickets/schemas/new-ticket";
import {
  addTicketReplyAction,
  createTicketAction,
  updateTicketAssigneeAction,
  updateTicketStatusAction,
} from "@/features/tickets/server/ticket-actions";
import type { TicketActionResult } from "@/features/tickets/types/ticket-actions";

type QueueView = "mine" | "all" | "unassigned";
type PriorityFilter = "All" | TicketPriority;

type MutationNotice = {
  tone: "success" | "error";
  message: string;
};

const priorityClasses: Record<
  TicketPriority,
  string
> = {
  Urgent: "text-danger",
  High: "text-warning",
  Normal: "text-muted",
  Low: "text-muted",
};

const statusClasses: Record<
  TicketStatus,
  string
> = {
  Open: "bg-[#98a2b3]",
  Investigating: "bg-warning",
  "Waiting approval": "bg-accent",
  "Waiting requester": "bg-warning",
  "In progress": "bg-success",
  Unassigned: "bg-[#98a2b3]",
  Scheduled: "bg-accent",
  Resolved: "bg-success",
};

const statusOptions: TicketStatus[] = [
  "Open",
  "Unassigned",
  "Investigating",
  "In progress",
  "Waiting requester",
  "Waiting approval",
  "Scheduled",
  "Resolved",
];

function MetricStrip({
  metrics,
}: {
  metrics: DashboardMetric[];
}) {
  return (
    <section
      aria-label="Operations summary"
      className="grid border-y border-line bg-surface sm:grid-cols-2 xl:grid-cols-4"
    >
      {metrics.map((metric, index) => (
        <div
          className={`px-5 py-4 sm:px-6 ${
            index > 0
              ? "border-t border-line sm:border-t-0"
              : ""
          } ${
            index % 2 === 1
              ? "sm:border-l"
              : ""
          } ${
            index > 1
              ? "sm:border-t xl:border-t-0"
              : ""
          } ${
            index > 0 ? "xl:border-l" : ""
          }`}
          key={metric.label}
        >
          <p className="text-[12px] font-medium text-muted">
            {metric.label}
          </p>

          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <p className="text-[22px] font-semibold tracking-[-0.02em] text-ink tabular-nums">
              {metric.value}
            </p>
            <p className="truncate text-[11px] text-muted">
              {metric.note}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}

function TicketQueue({
  tickets,
  showOrganizationViews,
  activeView,
  priorityFilter,
  selectedDatabaseId,
  counts,
  onViewChange,
  onPriorityChange,
  onSelect,
}: {
  tickets: TicketRecord[];
  showOrganizationViews: boolean;
  activeView: QueueView;
  priorityFilter: PriorityFilter;
  selectedDatabaseId: string;
  counts: Record<QueueView, number>;
  onViewChange: (view: QueueView) => void;
  onPriorityChange: (
    priority: PriorityFilter,
  ) => void;
  onSelect: (id: string) => void;
}) {
  const tabs: Array<{
    value: QueueView;
    label: string;
  }> = [
    {
      value: "mine",
      label: "My queue",
    },
    {
      value: "all",
      label: "All open",
    },
    {
      value: "unassigned",
      label: "Unassigned",
    },
  ];

  return (
    <section className="min-w-0 overflow-hidden rounded-[6px] border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">
            {showOrganizationViews
              ? "Operational queue"
              : "My requests"}
          </h2>
          <p className="mt-0.5 text-[12px] text-muted">
            {showOrganizationViews
              ? "Prioritized by SLA and business impact"
              : "Requests submitted by your account"}
          </p>
        </div>

        <div className="relative sm:ml-auto">
          <Filter
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
            strokeWidth={1.8}
          />

          <select
            aria-label="Filter tickets by priority"
            className="h-8 appearance-none rounded-[5px] border border-line bg-surface py-0 pl-8 pr-7 text-[12px] font-medium text-[#4c5563] outline-none hover:bg-canvas focus:border-accent"
            onChange={(event) =>
              onPriorityChange(
                event.target
                  .value as PriorityFilter,
              )
            }
            value={priorityFilter}
          >
            <option value="All">
              All priorities
            </option>
            <option value="Urgent">
              Urgent
            </option>
            <option value="High">High</option>
            <option value="Normal">
              Normal
            </option>
            <option value="Low">Low</option>
          </select>

          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted"
          />
        </div>

        <button
          aria-label="Queue options"
          className="hidden size-8 place-items-center rounded-[5px] text-muted hover:bg-canvas hover:text-ink sm:grid"
          type="button"
        >
          <MoreHorizontal
            aria-hidden="true"
            className="size-4"
          />
        </button>
      </div>

      {showOrganizationViews ? (
        <div
          aria-label="Ticket queues"
          className="flex items-center gap-5 overflow-x-auto border-b border-line px-4"
          role="tablist"
        >
          {tabs.map((tab) => (
            <button
              aria-selected={
                activeView === tab.value
              }
              className={`h-10 whitespace-nowrap border-b-2 text-[12px] ${
                activeView === tab.value
                  ? "border-ink font-medium text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
              key={tab.value}
              onClick={() =>
                onViewChange(tab.value)
              }
              role="tab"
              type="button"
            >
              {tab.label}{" "}
              <span className="ml-1 text-muted tabular-nums">
                {counts[tab.value]}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="h-9 border-b border-line bg-[#fafbfc] text-[11px] font-medium text-muted">
              <th className="w-[92px] px-4 font-medium">
                Ticket
              </th>
              <th className="px-3 font-medium">
                Request
              </th>
              <th className="w-[92px] px-3 font-medium">
                Priority
              </th>
              <th className="w-[126px] px-3 font-medium">
                Status
              </th>
              <th className="w-[80px] px-3 font-medium">
                Owner
              </th>
              <th className="w-[82px] px-4 font-medium">
                SLA
              </th>
            </tr>
          </thead>

          <tbody>
            {tickets.length > 0 ? (
              tickets.map((ticket) => {
                const selected =
                  ticket.databaseId ===
                  selectedDatabaseId;

                return (
                  <tr
                    className={`h-[62px] border-b border-line last:border-b-0 ${
                      selected
                        ? "bg-selected"
                        : "hover:bg-[#fafbfc]"
                    }`}
                    key={ticket.databaseId}
                  >
                    <td className="px-4 text-[12px] font-medium text-[#4c5563] tabular-nums">
                      <button
                        aria-label={`Open ${ticket.id}`}
                        className="text-left hover:text-ink"
                        onClick={() =>
                          onSelect(
                            ticket.databaseId,
                          )
                        }
                        type="button"
                      >
                        {ticket.id}
                      </button>
                    </td>

                    <td className="max-w-0 px-3">
                      <button
                        aria-pressed={selected}
                        className="block w-full text-left"
                        onClick={() =>
                          onSelect(
                            ticket.databaseId,
                          )
                        }
                        type="button"
                      >
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {ticket.title}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-muted">
                          {ticket.requester} -{" "}
                          {ticket.department}
                        </span>
                      </button>
                    </td>

                    <td
                      className={`px-3 text-[12px] font-medium ${
                        priorityClasses[
                          ticket.priority
                        ]
                      }`}
                    >
                      {ticket.priority}
                    </td>

                    <td className="px-3">
                      <span className="inline-flex items-center gap-2 text-[12px] text-[#4c5563]">
                        <span
                          className={`size-1.5 rounded-full ${
                            statusClasses[
                              ticket.status
                            ]
                          }`}
                        />
                        {ticket.status}
                      </span>
                    </td>

                    <td className="px-3 text-[12px] text-[#4c5563]">
                      {ticket.assigneeShort}
                    </td>

                    <td
                      className={`px-4 text-[12px] font-medium tabular-nums ${
                        ticket.priority ===
                        "Urgent"
                          ? "text-danger"
                          : ticket.sla.includes(
                                "h",
                              ) &&
                              Number.parseInt(
                                ticket.sla,
                                10,
                              ) < 2
                            ? "text-warning"
                            : "text-ink"
                      }`}
                    >
                      {ticket.sla}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  className="px-4 py-12 text-center text-[13px] text-muted"
                  colSpan={6}
                >
                  No tickets match this queue
                  and priority.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ContextRail({
  ticket,
  assigneeOptions,
  canAssignTickets,
  canClaimUnassignedTickets,
  currentUserId,
  canUpdateStatus,
  assignmentPending,
  replyOpen,
  replySubmitting,
  statusPending,
  mutationNotice,
  onReplyToggle,
  onReplySubmit,
  onAssigneeChange,
  onStatusChange,
}: {
  ticket: TicketRecord;
  assigneeOptions: SelectOption[];
  canAssignTickets: boolean;
  canClaimUnassignedTickets: boolean;
  currentUserId: string;
  canUpdateStatus: boolean;
  assignmentPending: boolean;
  replyOpen: boolean;
  replySubmitting: boolean;
  statusPending: boolean;
  mutationNotice: MutationNotice | null;
  onReplyToggle: () => void;
  onReplySubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
  onAssigneeChange: (
    assigneeId: string,
  ) => void;
  onStatusChange: (
    status: TicketStatus,
  ) => void;
}) {
  return (
    <aside className="rounded-[6px] border border-line bg-surface xl:sticky xl:top-[76px] xl:self-start">
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium text-muted tabular-nums">
            {ticket.id}
          </span>

          <Link
            aria-label="Open full ticket"
            className="grid size-7 place-items-center rounded-[5px] text-muted hover:bg-canvas hover:text-ink"
            href={`/tickets/${ticket.databaseId}`}
          >
            <ArrowUpRight
              aria-hidden="true"
              className="size-4"
              strokeWidth={1.8}
            />
          </Link>
        </div>

        <h2 className="mt-2 text-[15px] font-semibold leading-5 text-ink">
          {ticket.title}
        </h2>
        <p className="mt-2 text-[12px] leading-5 text-muted">
          {ticket.summary}
        </p>
      </div>

      <div className="border-b border-line p-4">
        <div className="grid grid-cols-2 gap-2">
          {canUpdateStatus ? (
            <label className="relative">
              <span className="sr-only">
                Ticket status
              </span>

              <select
                className="h-8 w-full appearance-none rounded-[5px] border border-action bg-action px-3 pr-7 text-[12px] font-medium text-white outline-none focus:border-accent disabled:cursor-wait disabled:opacity-70"
                disabled={statusPending}
                onChange={(event) =>
                  onStatusChange(
                    event.target
                      .value as TicketStatus,
                  )
                }
                value={ticket.status}
              >
                {statusOptions.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>

              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-white"
              />
            </label>
          ) : (
            <div className="flex h-8 items-center gap-2 rounded-[5px] border border-line bg-canvas px-3 text-[12px] font-medium text-[#4c5563]">
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${
                  statusClasses[ticket.status]
                }`}
              />
              <span className="truncate">
                {ticket.status}
              </span>
            </div>
          )}

          <button
            aria-expanded={replyOpen}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[5px] border border-line px-3 text-[12px] font-medium text-[#4c5563] hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            disabled={replySubmitting}
            onClick={onReplyToggle}
            type="button"
          >
            <MessageSquare
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={1.8}
            />
            Reply
          </button>
        </div>

        {replyOpen ? (
          <form
            className="mt-3"
            onSubmit={onReplySubmit}
          >
            <label
              className="sr-only"
              htmlFor="ticket-reply"
            >
              Reply to requester
            </label>

            <textarea
              autoFocus
              className="min-h-24 w-full resize-y rounded-[5px] border border-line bg-canvas px-2.5 py-2 text-[12px] leading-5 text-ink outline-none placeholder:text-[#8a93a1] focus:border-accent focus:bg-white disabled:cursor-wait disabled:opacity-70"
              disabled={replySubmitting}
              id="ticket-reply"
              name="reply"
              placeholder="Write a concise update..."
              required
            />

            <div className="mt-2 flex justify-end gap-2">
              <button
                className="h-7 rounded-[5px] px-2.5 text-[11px] font-medium text-muted hover:bg-canvas hover:text-ink disabled:opacity-50"
                disabled={replySubmitting}
                onClick={onReplyToggle}
                type="button"
              >
                Cancel
              </button>

              <button
                className="h-7 min-w-[76px] rounded-[5px] bg-action px-2.5 text-[11px] font-medium text-white hover:bg-[#353b44] disabled:cursor-wait disabled:opacity-70"
                disabled={replySubmitting}
                type="submit"
              >
                {replySubmitting
                  ? "Sending..."
                  : "Send reply"}
              </button>
            </div>
          </form>
        ) : null}

        {statusPending ? (
          <p
            className="mt-3 text-[11px] leading-4 text-muted"
            role="status"
          >
            Saving ticket status...
          </p>
        ) : null}

        {mutationNotice ? (
          <p
            className={`mt-3 border-l-2 px-2.5 py-1.5 text-[11px] leading-4 ${
              mutationNotice.tone === "error"
                ? "border-danger bg-[#fff7f6] text-danger"
                : "border-success bg-[#f3faf6] text-[#277a4b]"
            }`}
            role={
              mutationNotice.tone === "error"
                ? "alert"
                : "status"
            }
          >
            {mutationNotice.message}
          </p>
        ) : null}
      </div>

      <div className="border-b border-line px-4 py-3">
        <h3 className="text-[11px] font-medium text-muted">
          Service level
        </h3>

        <div className="mt-2.5 flex items-center gap-2">
          <Clock3
            aria-hidden="true"
            className={`size-4 ${
              ticket.priority === "Urgent"
                ? "text-danger"
                : "text-warning"
            }`}
            strokeWidth={1.8}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] font-medium text-ink">
                {ticket.priority === "Urgent"
                  ? "Resolution at risk"
                  : "Resolution target"}
              </span>

              <span
                className={`text-[12px] font-semibold tabular-nums ${
                  ticket.priority === "Urgent"
                    ? "text-danger"
                    : "text-ink"
                }`}
              >
                {ticket.sla}
              </span>
            </div>

            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eceef1]">
              <div
                className={`h-full ${
                  ticket.priority === "Urgent"
                    ? "w-[88%] bg-danger"
                    : "w-[46%] bg-accent"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      <dl className="space-y-3 border-b border-line px-4 py-3 text-[12px]">
        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
          <dt className="text-muted">
            Requester
          </dt>
          <dd className="truncate font-medium text-ink">
            {ticket.requester}
          </dd>
        </div>

        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
          <dt className="text-muted">
            Assignee
          </dt>
          <dd className="min-w-0 font-medium text-ink">
            {canAssignTickets ? (
              <label className="relative block">
                <span className="sr-only">
                  Assign ticket
                </span>

                <select
                  className="h-8 w-full appearance-none rounded-[5px] border border-line bg-canvas px-2.5 pr-7 text-[12px] font-medium text-ink outline-none hover:bg-white focus:border-accent disabled:cursor-wait disabled:opacity-70"
                  disabled={assignmentPending}
                  onChange={(event) =>
                    onAssigneeChange(
                      event.target.value,
                    )
                  }
                  value={
                    ticket.assigneeId ?? ""
                  }
                >
                  <option value="">
                    Unassigned
                  </option>
                  {assigneeOptions.map(
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

                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted"
                />
              </label>
            ) : canClaimUnassignedTickets &&
              !ticket.assigneeId ? (
              <button
                className="inline-flex h-8 w-full items-center justify-center rounded-[5px] border border-line bg-canvas px-2.5 text-[12px] font-medium text-ink hover:bg-white disabled:cursor-wait disabled:opacity-70"
                disabled={assignmentPending}
                onClick={() =>
                  onAssigneeChange(
                    currentUserId,
                  )
                }
                type="button"
              >
                {assignmentPending
                  ? "Assigning..."
                  : "Assign to me"}
              </button>
            ) : (
              <span className="block truncate">
                {ticket.assignee}
              </span>
            )}

            {assignmentPending ? (
              <span
                className="mt-1 block text-[10px] font-normal text-muted"
                role="status"
              >
                Saving assignment...
              </span>
            ) : null}
          </dd>
        </div>

        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
          <dt className="text-muted">
            Asset
          </dt>
          <dd className="truncate font-medium text-ink">
            {ticket.asset}
          </dd>
        </div>

        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
          <dt className="text-muted">
            Category
          </dt>
          <dd className="truncate font-medium text-ink">
            {ticket.category}
          </dd>
        </div>
      </dl>

      <div
        aria-live="polite"
        className="px-4 py-3"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-medium text-muted">
            Latest activity
          </h3>
          <span className="text-[10px] text-muted">
            {ticket.updatedAt}
          </span>
        </div>

        <p className="mt-2 text-[12px] leading-5 text-[#4c5563]">
          {ticket.latestActivity}
        </p>
      </div>
    </aside>
  );
}

export function OperationsDashboard({
  initialTickets,
  initialMetrics,
  dateLabel,
  organizationName,
  requesterOptions,
  assetOptions,
  assigneeOptions,
  capabilities,
}: {
  initialTickets: TicketRecord[];
  initialMetrics: DashboardMetric[];
  dateLabel: string;
  organizationName: string;
  requesterOptions: SelectOption[];
  assetOptions: SelectOption[];
  assigneeOptions: SelectOption[];
  capabilities: OperationsDashboardCapabilities;
}) {
  const router = useRouter();

  const [activeView, setActiveView] =
    useState<QueueView>("all");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState<PriorityFilter>("All");

  const [
    selectedDatabaseId,
    setSelectedDatabaseId,
  ] = useState(
    initialTickets[0]?.databaseId ?? "",
  );

  const [replyOpen, setReplyOpen] =
    useState(false);

  const [
    replySubmitting,
    setReplySubmitting,
  ] = useState(false);

  const [
    newTicketOpen,
    setNewTicketOpen,
  ] = useState(false);

  const [
    mutationNotice,
    setMutationNotice,
  ] = useState<MutationNotice | null>(null);

  const [
    statusPending,
    startStatusTransition,
  ] = useTransition();

  const [
    assignmentPending,
    startAssignmentTransition,
  ] = useTransition();

  const closeNewTicketDialog = useCallback(
    () => setNewTicketOpen(false),
    [],
  );

  const selectedTicket =
    initialTickets.find(
      (ticket) =>
        ticket.databaseId ===
        selectedDatabaseId,
    ) ?? initialTickets[0];

  const visibleTickets = useMemo(
    () =>
      initialTickets.filter((ticket) => {
        const matchesView =
          activeView === "all" ||
          (activeView === "mine" &&
            ticket.mine) ||
          (activeView === "unassigned" &&
            ticket.status === "Unassigned");

        const matchesPriority =
          priorityFilter === "All" ||
          ticket.priority === priorityFilter;

        return (
          matchesView && matchesPriority
        );
      }),
    [
      activeView,
      initialTickets,
      priorityFilter,
    ],
  );

  const counts: Record<QueueView, number> = {
    mine: initialTickets.filter(
      (ticket) => ticket.mine,
    ).length,
    all: initialTickets.length,
    unassigned: initialTickets.filter(
      (ticket) =>
        ticket.status === "Unassigned",
    ).length,
  };

  function selectTicket(
    databaseId: string,
  ) {
    setSelectedDatabaseId(databaseId);
    setReplyOpen(false);
    setMutationNotice(null);
  }

  function updateStatus(
    status: TicketStatus,
  ) {
    if (
      !capabilities.canUpdateTicketStatus ||
      !selectedTicket ||
      statusPending
    ) {
      return;
    }

    const ticketId =
      selectedTicket.databaseId;

    setMutationNotice(null);

    startStatusTransition(async () => {
      try {
        const result =
          await updateTicketStatusAction({
            ticketId,
            status,
          });

        setMutationNotice({
          tone: result.success
            ? "success"
            : "error",
          message: result.message,
        });

        if (result.success) {
          router.refresh();
        }
      } catch {
        setMutationNotice({
          tone: "error",
          message:
            "The status could not be saved. Check the connection and try again.",
        });
      }
    });
  }

  function updateAssignee(
    assigneeId: string,
  ) {
    if (
      !selectedTicket ||
      assignmentPending
    ) {
      return;
    }

    const canClaimSelectedTicket =
      capabilities.canClaimUnassignedTickets &&
      selectedTicket.assigneeId === null &&
      assigneeId ===
        capabilities.currentUserId;

    if (
      !capabilities.canAssignTickets &&
      !canClaimSelectedTicket
    ) {
      return;
    }

    const ticketId =
      selectedTicket.databaseId;

    setMutationNotice(null);

    startAssignmentTransition(
      async () => {
        try {
          const result =
            await updateTicketAssigneeAction({
              ticketId,
              assigneeId:
                assigneeId || null,
            });

          setMutationNotice({
            tone: result.success
              ? "success"
              : "error",
            message: result.message,
          });

          if (result.success) {
            router.refresh();
          }
        } catch {
          setMutationNotice({
            tone: "error",
            message:
              "The assignee could not be saved. Check the connection and try again.",
          });
        }
      },
    );
  }

  async function submitReply(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedTicket ||
      replySubmitting
    ) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    const reply = String(
      formData.get("reply") ?? "",
    ).trim();

    if (!reply) return;

    const ticketId =
      selectedTicket.databaseId;

    setMutationNotice(null);
    setReplySubmitting(true);

    try {
      const result =
        await addTicketReplyAction({
          ticketId,
          body: reply,
        });

      setMutationNotice({
        tone: result.success
          ? "success"
          : "error",
        message: result.message,
      });

      if (result.success) {
        form.reset();
        setReplyOpen(false);
        router.refresh();
      }
    } catch {
      setMutationNotice({
        tone: "error",
        message:
          "The reply could not be sent. Check the connection and try again.",
      });
    } finally {
      setReplySubmitting(false);
    }
  }

  async function createTicket(
    input: NewTicketInput,
  ): Promise<TicketActionResult> {
    setMutationNotice(null);

    try {
      const result =
        await createTicketAction(input);

      if (result.success) {
        if (result.ticketId) {
          setSelectedDatabaseId(
            result.ticketId,
          );
        }

        setActiveView("all");
        setPriorityFilter("All");
        setReplyOpen(false);
        setNewTicketOpen(false);

        setMutationNotice({
          tone: "success",
          message: result.message,
        });

        router.refresh();
      }

      return result;
    } catch {
      return {
        success: false,
        message:
          "The ticket could not be created. Check the connection and try again.",
      };
    }
  }

  return (
    <main>
      <div className="bg-surface px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[12px] text-muted">
              {dateLabel}
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.025em] text-ink">
              {capabilities.canViewOrganizationQueue
                ? "Operations"
                : "My requests"}
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              {capabilities.canViewOrganizationQueue
                ? `Live service health for ${organizationName}`
                : `Your active requests in ${organizationName}`}
            </p>
          </div>

          <button
            className="inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-[5px] bg-action px-3.5 text-[13px] font-medium text-white hover:bg-[#353b44] sm:self-auto"
            onClick={() =>
              setNewTicketOpen(true)
            }
            type="button"
          >
            <Plus
              aria-hidden="true"
              className="size-4"
              strokeWidth={1.8}
            />
            New ticket
          </button>
        </div>
      </div>

      <MetricStrip
        metrics={initialMetrics}
      />

      <div className="mx-auto grid max-w-[1500px] gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TicketQueue
          activeView={activeView}
          counts={counts}
          onPriorityChange={
            setPriorityFilter
          }
          onSelect={selectTicket}
          onViewChange={setActiveView}
          priorityFilter={priorityFilter}
          selectedDatabaseId={
            selectedDatabaseId
          }
          showOrganizationViews={
            capabilities.canViewOrganizationQueue
          }
          tickets={visibleTickets}
        />

        {selectedTicket ? (
          <ContextRail
            assigneeOptions={
              assigneeOptions
            }
            assignmentPending={
              assignmentPending
            }
            canAssignTickets={
              capabilities.canAssignTickets
            }
            canClaimUnassignedTickets={
              capabilities.canClaimUnassignedTickets
            }
            canUpdateStatus={
              capabilities.canUpdateTicketStatus
            }
            currentUserId={
              capabilities.currentUserId
            }
            mutationNotice={mutationNotice}
            onAssigneeChange={
              updateAssignee
            }
            onReplySubmit={submitReply}
            onReplyToggle={() =>
              setReplyOpen(
                (current) => !current,
              )
            }
            onStatusChange={updateStatus}
            replyOpen={replyOpen}
            replySubmitting={
              replySubmitting
            }
            statusPending={statusPending}
            ticket={selectedTicket}
          />
        ) : (
          <aside className="rounded-[6px] border border-line bg-surface p-4 text-[12px] text-muted">
            No active ticket is available.
          </aside>
        )}
      </div>

      {newTicketOpen ? (
        <NewTicketDialog
          assetOptions={assetOptions}
          onClose={closeNewTicketDialog}
          onCreate={createTicket}
          requesterOptions={
            requesterOptions
          }
          requesterLocked={
            !capabilities.canSelectOtherRequesters
          }
        />
      ) : null}
    </main>
  );
}
