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
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import {
  demoTickets,
  type TicketPriority,
  type TicketRecord,
  type TicketStatus,
} from "@/features/operations/data/demo-tickets";

type QueueView = "mine" | "all" | "unassigned";
type PriorityFilter = "All" | TicketPriority;

const metrics = [
  { label: "Open requests", value: "28", note: "+3 since yesterday" },
  { label: "SLA at risk", value: "4", note: "2 require action" },
  { label: "First response", value: "18m", note: "Target under 30m" },
  { label: "Assets online", value: "96.8%", note: "629 of 650" },
] as const;

const priorityClasses: Record<TicketPriority, string> = {
  Urgent: "text-danger",
  High: "text-warning",
  Normal: "text-muted",
  Low: "text-muted",
};

const statusClasses: Record<TicketStatus, string> = {
  Investigating: "bg-warning",
  "Waiting approval": "bg-accent",
  "In progress": "bg-success",
  Unassigned: "bg-[#98a2b3]",
  Scheduled: "bg-accent",
  Resolved: "bg-success",
};

const statusOptions: TicketStatus[] = [
  "Unassigned",
  "Investigating",
  "In progress",
  "Waiting approval",
  "Scheduled",
  "Resolved",
];

function MetricStrip() {
  return (
    <section
      aria-label="Operations summary"
      className="grid border-y border-line bg-surface sm:grid-cols-2 xl:grid-cols-4"
    >
      {metrics.map((metric, index) => (
        <div
          className={`px-5 py-4 sm:px-6 ${
            index > 0 ? "border-t border-line sm:border-t-0" : ""
          } ${index % 2 === 1 ? "sm:border-l" : ""} ${
            index > 1 ? "sm:border-t xl:border-t-0" : ""
          } ${index > 0 ? "xl:border-l" : ""}`}
          key={metric.label}
        >
          <p className="text-[12px] font-medium text-muted">{metric.label}</p>
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <p className="text-[22px] font-semibold tracking-[-0.02em] text-ink tabular-nums">
              {metric.value}
            </p>
            <p className="truncate text-[11px] text-muted">{metric.note}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function TicketQueue({
  tickets,
  activeView,
  priorityFilter,
  selectedId,
  counts,
  onViewChange,
  onPriorityChange,
  onSelect,
}: {
  tickets: TicketRecord[];
  activeView: QueueView;
  priorityFilter: PriorityFilter;
  selectedId: string;
  counts: Record<QueueView, number>;
  onViewChange: (view: QueueView) => void;
  onPriorityChange: (priority: PriorityFilter) => void;
  onSelect: (id: string) => void;
}) {
  const tabs: Array<{ value: QueueView; label: string }> = [
    { value: "mine", label: "My queue" },
    { value: "all", label: "All open" },
    { value: "unassigned", label: "Unassigned" },
  ];

  return (
    <section className="min-w-0 overflow-hidden rounded-[6px] border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Operational queue</h2>
          <p className="mt-0.5 text-[12px] text-muted">Prioritized by SLA and business impact</p>
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
            onChange={(event) => onPriorityChange(event.target.value as PriorityFilter)}
            value={priorityFilter}
          >
            <option value="All">All priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Normal">Normal</option>
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
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div
        aria-label="Ticket queues"
        className="flex items-center gap-5 overflow-x-auto border-b border-line px-4"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            aria-selected={activeView === tab.value}
            className={`h-10 whitespace-nowrap border-b-2 text-[12px] ${
              activeView === tab.value
                ? "border-ink font-medium text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
            key={tab.value}
            onClick={() => onViewChange(tab.value)}
            role="tab"
            type="button"
          >
            {tab.label}{" "}
            <span className="ml-1 text-muted tabular-nums">{counts[tab.value]}</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="h-9 border-b border-line bg-[#fafbfc] text-[11px] font-medium text-muted">
              <th className="w-[92px] px-4 font-medium">Ticket</th>
              <th className="px-3 font-medium">Request</th>
              <th className="w-[92px] px-3 font-medium">Priority</th>
              <th className="w-[126px] px-3 font-medium">Status</th>
              <th className="w-[80px] px-3 font-medium">Owner</th>
              <th className="w-[82px] px-4 font-medium">SLA</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length > 0 ? (
              tickets.map((ticket) => {
                const selected = ticket.id === selectedId;

                return (
                  <tr
                    className={`h-[62px] border-b border-line last:border-b-0 ${
                      selected ? "bg-selected" : "hover:bg-[#fafbfc]"
                    }`}
                    key={ticket.id}
                  >
                    <td className="px-4 text-[12px] font-medium text-[#4c5563] tabular-nums">
                      <button
                        aria-label={`Open ${ticket.id}`}
                        className="text-left hover:text-ink"
                        onClick={() => onSelect(ticket.id)}
                        type="button"
                      >
                        {ticket.id}
                      </button>
                    </td>
                    <td className="max-w-0 px-3">
                      <button
                        aria-pressed={selected}
                        className="block w-full text-left"
                        onClick={() => onSelect(ticket.id)}
                        type="button"
                      >
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {ticket.title}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-muted">
                          {ticket.requester} · {ticket.department}
                        </span>
                      </button>
                    </td>
                    <td className={`px-3 text-[12px] font-medium ${priorityClasses[ticket.priority]}`}>
                      {ticket.priority}
                    </td>
                    <td className="px-3">
                      <span className="inline-flex items-center gap-2 text-[12px] text-[#4c5563]">
                        <span className={`size-1.5 rounded-full ${statusClasses[ticket.status]}`} />
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-3 text-[12px] text-[#4c5563]">{ticket.assigneeShort}</td>
                    <td
                      className={`px-4 text-[12px] font-medium tabular-nums ${
                        ticket.priority === "Urgent"
                          ? "text-danger"
                          : ticket.sla.includes("h") && Number.parseInt(ticket.sla, 10) < 2
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
                <td className="px-4 py-12 text-center text-[13px] text-muted" colSpan={6}>
                  No tickets match this queue and priority.
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
  replyOpen,
  onReplyToggle,
  onReplySubmit,
  onStatusChange,
}: {
  ticket: TicketRecord;
  replyOpen: boolean;
  onReplyToggle: () => void;
  onReplySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStatusChange: (status: TicketStatus) => void;
}) {
  return (
    <aside className="rounded-[6px] border border-line bg-surface xl:sticky xl:top-[76px] xl:self-start">
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium text-muted tabular-nums">{ticket.id}</span>
          <button
            aria-label="Open full ticket"
            className="grid size-7 place-items-center rounded-[5px] text-muted hover:bg-canvas hover:text-ink"
            type="button"
          >
            <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </button>
        </div>
        <h2 className="mt-2 text-[15px] font-semibold leading-5 text-ink">{ticket.title}</h2>
        <p className="mt-2 text-[12px] leading-5 text-muted">{ticket.summary}</p>
      </div>

      <div className="border-b border-line p-4">
        <div className="grid grid-cols-2 gap-2">
          <label className="relative">
            <span className="sr-only">Ticket status</span>
            <select
              className="h-8 w-full appearance-none rounded-[5px] border border-action bg-action px-3 pr-7 text-[12px] font-medium text-white outline-none focus:border-accent"
              onChange={(event) => onStatusChange(event.target.value as TicketStatus)}
              value={ticket.status}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-white"
            />
          </label>
          <button
            aria-expanded={replyOpen}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[5px] border border-line px-3 text-[12px] font-medium text-[#4c5563] hover:bg-canvas hover:text-ink"
            onClick={onReplyToggle}
            type="button"
          >
            <MessageSquare aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            Reply
          </button>
        </div>

        {replyOpen ? (
          <form className="mt-3" onSubmit={onReplySubmit}>
            <label className="sr-only" htmlFor="ticket-reply">
              Reply to requester
            </label>
            <textarea
              autoFocus
              className="min-h-24 w-full resize-y rounded-[5px] border border-line bg-canvas px-2.5 py-2 text-[12px] leading-5 text-ink outline-none placeholder:text-[#8a93a1] focus:border-accent focus:bg-white"
              id="ticket-reply"
              name="reply"
              placeholder="Write a concise update…"
              required
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                className="h-7 rounded-[5px] px-2.5 text-[11px] font-medium text-muted hover:bg-canvas hover:text-ink"
                onClick={onReplyToggle}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-7 rounded-[5px] bg-action px-2.5 text-[11px] font-medium text-white hover:bg-[#353b44]"
                type="submit"
              >
                Send reply
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="border-b border-line px-4 py-3">
        <h3 className="text-[11px] font-medium text-muted">Service level</h3>
        <div className="mt-2.5 flex items-center gap-2">
          <Clock3
            aria-hidden="true"
            className={`size-4 ${ticket.priority === "Urgent" ? "text-danger" : "text-warning"}`}
            strokeWidth={1.8}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] font-medium text-ink">
                {ticket.priority === "Urgent" ? "Resolution at risk" : "Resolution target"}
              </span>
              <span
                className={`text-[12px] font-semibold tabular-nums ${
                  ticket.priority === "Urgent" ? "text-danger" : "text-ink"
                }`}
              >
                {ticket.sla}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eceef1]">
              <div
                className={`h-full ${ticket.priority === "Urgent" ? "w-[88%] bg-danger" : "w-[46%] bg-accent"}`}
              />
            </div>
          </div>
        </div>
      </div>

      <dl className="space-y-3 border-b border-line px-4 py-3 text-[12px]">
        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
          <dt className="text-muted">Requester</dt>
          <dd className="truncate font-medium text-ink">{ticket.requester}</dd>
        </div>
        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
          <dt className="text-muted">Assignee</dt>
          <dd className="truncate font-medium text-ink">{ticket.assignee}</dd>
        </div>
        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
          <dt className="text-muted">Asset</dt>
          <dd className="truncate font-medium text-ink">{ticket.asset}</dd>
        </div>
        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
          <dt className="text-muted">Category</dt>
          <dd className="truncate font-medium text-ink">{ticket.category}</dd>
        </div>
      </dl>

      <div aria-live="polite" className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-medium text-muted">Latest activity</h3>
          <span className="text-[10px] text-muted">{ticket.updatedAt}</span>
        </div>
        <p className="mt-2 text-[12px] leading-5 text-[#4c5563]">{ticket.latestActivity}</p>
      </div>
    </aside>
  );
}

export function OperationsDashboard() {
  const [tickets, setTickets] = useState<TicketRecord[]>(demoTickets);
  const [activeView, setActiveView] = useState<QueueView>("mine");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All");
  const [selectedId, setSelectedId] = useState(demoTickets[0].id);
  const [replyOpen, setReplyOpen] = useState(false);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0];

  const visibleTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        const matchesView =
          activeView === "all" ||
          (activeView === "mine" && ticket.mine) ||
          (activeView === "unassigned" && ticket.status === "Unassigned");
        const matchesPriority = priorityFilter === "All" || ticket.priority === priorityFilter;

        return matchesView && matchesPriority;
      }),
    [activeView, priorityFilter, tickets],
  );

  const counts: Record<QueueView, number> = {
    mine: tickets.filter((ticket) => ticket.mine).length,
    all: tickets.length,
    unassigned: tickets.filter((ticket) => ticket.status === "Unassigned").length,
  };

  function selectTicket(id: string) {
    setSelectedId(id);
    setReplyOpen(false);
  }

  function updateStatus(status: TicketStatus) {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedId
          ? {
              ...ticket,
              status,
              latestActivity: `Status changed to ${status}.`,
              updatedAt: "Just now",
            }
          : ticket,
      ),
    );
  }

  function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const reply = String(formData.get("reply") ?? "").trim();

    if (!reply) return;

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedId
          ? {
              ...ticket,
              latestActivity: `You replied: ${reply}`,
              updatedAt: "Just now",
            }
          : ticket,
      ),
    );
    form.reset();
    setReplyOpen(false);
  }

  return (
    <main>
      <div className="bg-surface px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[12px] text-muted">Saturday, 22 August · Jakarta</p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.025em] text-ink">Operations</h1>
            <p className="mt-1 text-[13px] text-muted">Live service health for Nusantara Systems</p>
          </div>
          <button
            className="inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-[5px] bg-action px-3.5 text-[13px] font-medium text-white hover:bg-[#353b44] sm:self-auto"
            title="Ticket creation is the next checkpoint"
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.8} />
            New ticket
          </button>
        </div>
      </div>

      <MetricStrip />

      <div className="mx-auto grid max-w-[1500px] gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TicketQueue
          activeView={activeView}
          counts={counts}
          onPriorityChange={setPriorityFilter}
          onSelect={selectTicket}
          onViewChange={setActiveView}
          priorityFilter={priorityFilter}
          selectedId={selectedId}
          tickets={visibleTickets}
        />
        <ContextRail
          onReplySubmit={submitReply}
          onReplyToggle={() => setReplyOpen((current) => !current)}
          onStatusChange={updateStatus}
          replyOpen={replyOpen}
          ticket={selectedTicket}
        />
      </div>
    </main>
  );
}
