"use client";

import {
  ArrowLeft,
  Clock3,
  LockKeyhole,
  MessageSquare,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import {
  useState,
  useTransition,
} from "react";

import { TicketApprovalPanel } from "@/features/approvals/components/ticket-approval-panel";
import { TicketResolutionPanel } from "@/features/resolutions/components/ticket-resolution-panel";

import {
  addTicketInternalNoteAction,
  addTicketReplyAction,
  updateTicketAssigneeAction,
} from "@/features/tickets/server/ticket-actions";
import type {
  TicketDetailData,
  TicketDetailSlaObjective,
} from "@/features/tickets/types/ticket-detail";

type ComposerMode =
  | "PUBLIC"
  | "INTERNAL";

type Notice = {
  tone: "success" | "error";
  message: string;
};

const slaBadgeClasses = {
  danger:
    "border-[#f0c5ca] bg-[#fff7f6] text-danger",
  warning:
    "border-[#ead7a6] bg-[#fffaf0] text-warning",
  neutral:
    "border-line bg-canvas text-[#4c5563]",
  complete:
    "border-[#b9dfca] bg-[#f3faf6] text-success",
} as const;

const slaBarClasses = {
  danger: "bg-danger",
  warning: "bg-warning",
  neutral: "bg-accent",
  complete: "bg-success",
} as const;

export function TicketDetailView({
  ticket,
  canAddInternalNotes,
  canAssignTickets,
  canClaimUnassignedTickets,
  currentUserId,
  backHref,
  backLabel,
}: {
  ticket: TicketDetailData;
  canAddInternalNotes: boolean;
  canAssignTickets: boolean;
  canClaimUnassignedTickets: boolean;
  currentUserId: string;
  backHref: string;
  backLabel: string;
}) {
  const router = useRouter();

  const [composerMode, setComposerMode] =
    useState<ComposerMode>("PUBLIC");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const [assignmentNotice, setAssignmentNotice] =
    useState<Notice | null>(null);

  const [selectedAssigneeId, setSelectedAssigneeId] =
    useState(ticket.assignee?.id ?? "");

  const [assignmentPending, startAssignmentTransition] =
    useTransition();

  function updateAssignee(
    assigneeId: string,
  ) {
    if (
      (!canAssignTickets &&
        !canClaimUnassignedTickets) ||
      assignmentPending ||
      ["Waiting approval", "Resolved", "Closed", "Canceled"].includes(
        ticket.status,
      )
    ) {
      return;
    }

    const previousAssigneeId =
      ticket.assignee?.id ?? "";

    setSelectedAssigneeId(assigneeId);
    setAssignmentNotice(null);

    startAssignmentTransition(
      async () => {
        try {
          const result =
            await updateTicketAssigneeAction({
              ticketId:
                ticket.databaseId,
              assigneeId:
                assigneeId || null,
            });

          setAssignmentNotice({
            tone: result.success
              ? "success"
              : "error",
            message: result.message,
          });

          if (result.success) {
            router.refresh();
          } else {
            setSelectedAssigneeId(
              previousAssigneeId,
            );
          }
        } catch {
          setSelectedAssigneeId(
            previousAssigneeId,
          );
          setAssignmentNotice({
            tone: "error",
            message:
              "The assignee could not be saved. Check the connection and try again.",
          });
        }
      },
    );
  }

  async function submitMessage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = String(
      formData.get("body") ?? "",
    ).trim();

    if (!body) {
      return;
    }

    setNotice(null);
    setIsSubmitting(true);

    try {
      const result =
        composerMode === "INTERNAL"
          ? await addTicketInternalNoteAction({
              ticketId:
                ticket.databaseId,
              body,
            })
          : await addTicketReplyAction({
              ticketId:
                ticket.databaseId,
              body,
            });

      setNotice({
        tone: result.success
          ? "success"
          : "error",
        message: result.message,
      });

      if (result.success) {
        form.reset();
        router.refresh();
      }
    } catch {
      setNotice({
        tone: "error",
        message:
          "The message could not be saved. Check the connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1380px] p-4 sm:p-6">
      <Link
        className="inline-flex h-8 items-center gap-1.5 rounded-[5px] px-2 text-[12px] font-medium text-muted hover:bg-surface hover:text-ink"
        href={backHref}
      >
        <ArrowLeft
          aria-hidden="true"
          className="size-3.5"
          strokeWidth={1.8}
        />
        {backLabel}
      </Link>

      <header className="mt-3 border-b border-line pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted tabular-nums">
              {ticket.displayId} -{" "}
              {ticket.requestType}
            </p>
            <h1 className="mt-1.5 text-[22px] font-semibold leading-7 tracking-[-0.02em] text-ink">
              {ticket.title}
            </h1>
            <p className="mt-2 max-w-[820px] text-[13px] leading-5 text-muted">
              {ticket.description}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4 rounded-[5px] border border-line bg-surface px-3 py-2 text-[12px]">
            <span>
              <span className="block text-[10px] text-muted">
                Status
              </span>
              <span className="mt-0.5 block font-medium text-ink">
                {ticket.status}
              </span>
            </span>
            <span className="h-7 w-px bg-line" />
            <span>
              <span className="block text-[10px] text-muted">
                Priority
              </span>
              <span className="mt-0.5 block font-medium text-ink">
                {ticket.priority}
              </span>
            </span>
          </div>
        </div>
      </header>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-[6px] border border-line bg-surface">
          <div className="border-b border-line px-4 py-3 sm:px-5">
            <h2 className="text-[14px] font-semibold text-ink">
              Conversation
            </h2>
            <p className="mt-0.5 text-[11px] text-muted">
              Public replies are visible to the requester.
            </p>
          </div>

          <div className="divide-y divide-line">
            {ticket.comments.length > 0 ? (
              ticket.comments.map(
                (comment) => (
                  <article
                    className={`px-4 py-4 sm:px-5 ${
                      comment.visibility ===
                      "INTERNAL"
                        ? "bg-[#fffbf2]"
                        : ""
                    }`}
                    key={comment.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-ink">
                          {comment.authorName}
                        </p>
                        <p className="truncate text-[10px] text-muted">
                          {comment.authorEmail}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {comment.visibility ===
                        "INTERNAL" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warning">
                            <LockKeyhole
                              aria-hidden="true"
                              className="size-3"
                              strokeWidth={1.8}
                            />
                            Internal
                          </span>
                        ) : null}
                        <span className="text-[10px] text-muted">
                          {comment.createdAt}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-[13px] leading-6 text-[#3f4752]">
                      {comment.body}
                    </p>
                  </article>
                ),
              )
            ) : (
              <div className="px-5 py-10 text-center">
                <MessageSquare
                  aria-hidden="true"
                  className="mx-auto size-5 text-[#98a2b3]"
                  strokeWidth={1.6}
                />
                <p className="mt-2 text-[12px] text-muted">
                  No conversation has been added yet.
                </p>
              </div>
            )}
          </div>

          <form
            className="border-t border-line bg-[#fafbfc] p-4 sm:p-5"
            onSubmit={submitMessage}
          >
            {canAddInternalNotes ? (
              <div
                aria-label="Message visibility"
                className="mb-3 flex items-center gap-1"
              >
                <button
                  aria-pressed={
                    composerMode === "PUBLIC"
                  }
                  className={`h-7 rounded-[5px] px-2.5 text-[11px] font-medium ${
                    composerMode === "PUBLIC"
                      ? "bg-selected text-ink"
                      : "text-muted hover:bg-white hover:text-ink"
                  }`}
                  onClick={() =>
                    setComposerMode("PUBLIC")
                  }
                  type="button"
                >
                  Public reply
                </button>
                <button
                  aria-pressed={
                    composerMode === "INTERNAL"
                  }
                  className={`h-7 rounded-[5px] px-2.5 text-[11px] font-medium ${
                    composerMode === "INTERNAL"
                      ? "bg-[#fff3d6] text-[#7a5615]"
                      : "text-muted hover:bg-white hover:text-ink"
                  }`}
                  onClick={() =>
                    setComposerMode(
                      "INTERNAL",
                    )
                  }
                  type="button"
                >
                  Internal note
                </button>
              </div>
            ) : null}

            <label
              className="sr-only"
              htmlFor="ticket-message"
            >
              {composerMode === "INTERNAL"
                ? "Internal note"
                : "Reply to requester"}
            </label>

            <textarea
              className="min-h-28 w-full resize-y rounded-[5px] border border-line bg-white px-3 py-2.5 text-[13px] leading-5 text-ink outline-none placeholder:text-[#8a93a1] focus:border-accent disabled:cursor-wait disabled:opacity-70"
              disabled={isSubmitting}
              id="ticket-message"
              maxLength={2000}
              name="body"
              placeholder={
                composerMode === "INTERNAL"
                  ? "Add context for the service team..."
                  : "Write an update for the requester..."
              }
              required
            />

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] text-muted">
                {composerMode === "INTERNAL"
                  ? "Only operational roles can read this note."
                  : "The requester can read this reply."}
              </p>

              <button
                className="inline-flex h-8 items-center justify-center gap-1.5 self-end rounded-[5px] bg-action px-3 text-[12px] font-medium text-white hover:bg-[#353b44] disabled:cursor-wait disabled:opacity-70"
                disabled={isSubmitting}
                type="submit"
              >
                <Send
                  aria-hidden="true"
                  className="size-3.5"
                  strokeWidth={1.8}
                />
                {isSubmitting
                  ? "Saving..."
                  : composerMode ===
                      "INTERNAL"
                    ? "Add note"
                    : "Send reply"}
              </button>
            </div>

            {notice ? (
              <p
                className={`mt-3 border-l-2 px-2.5 py-1.5 text-[11px] leading-4 ${
                  notice.tone === "error"
                    ? "border-danger bg-[#fff7f6] text-danger"
                    : "border-success bg-[#f3faf6] text-[#277a4b]"
                }`}
                role={
                  notice.tone === "error"
                    ? "alert"
                    : "status"
                }
              >
                {notice.message}
              </p>
            ) : null}
          </form>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-[76px] xl:self-start">
          <section className="overflow-hidden rounded-[6px] border border-line bg-surface">
            <div className="border-b border-line px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock3
                    aria-hidden="true"
                    className="size-3.5 text-muted"
                    strokeWidth={1.8}
                  />
                  <h2 className="text-[12px] font-semibold text-ink">
                    Service level
                  </h2>
                </div>

                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                    slaBadgeClasses[
                      ticket.sla.tone
                    ]
                  }`}
                >
                  {ticket.sla.status}
                </span>
              </div>

              <p className="mt-1 text-[10px] text-muted tabular-nums">
                {ticket.sla.phase} ·{" "}
                {ticket.sla.timing}
              </p>
            </div>

            <div className="divide-y divide-line">
              <SlaObjectiveRow
                completionLabel="Responded"
                objective={
                  ticket.sla.firstResponse
                }
              />
              <SlaObjectiveRow
                completionLabel="Resolved"
                objective={
                  ticket.sla.resolution
                }
              />
            </div>
          </section>

          <TicketApprovalPanel
            approval={ticket.approval}
            ticketId={ticket.databaseId}
          />

          <TicketResolutionPanel
            resolution={ticket.resolution}
            ticketId={ticket.databaseId}
          />

          <section className="rounded-[6px] border border-line bg-surface">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[12px] font-semibold text-ink">
                Ticket details
              </h2>
            </div>

            <dl className="space-y-3 px-4 py-3 text-[12px]">
              <DetailRow
                label="Requester"
                value={`${ticket.requester.name} - ${ticket.requester.department}`}
              />
              {canAssignTickets ? (
                <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
                  <dt className="self-center text-muted">
                    Assignee
                  </dt>
                  <dd>
                    <select
                      aria-label="Ticket assignee"
                      className="h-8 w-full rounded-[5px] border border-line bg-white px-2 text-[11px] font-medium text-ink outline-none focus:border-accent disabled:cursor-wait disabled:opacity-70"
                      disabled={
                        assignmentPending ||
                        ["Waiting approval", "Resolved", "Closed", "Canceled"].includes(
                          ticket.status,
                        )
                      }
                      onChange={(event) =>
                        updateAssignee(
                          event.target.value,
                        )
                      }
                      value={
                        selectedAssigneeId
                      }
                    >
                      <option value="">
                        Unassigned
                      </option>
                      {ticket.assigneeOptions.map(
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
                  </dd>
                </div>
              ) : canClaimUnassignedTickets &&
                !ticket.assignee &&
                !["Waiting approval", "Resolved", "Closed", "Canceled"].includes(
                  ticket.status,
                ) ? (
                <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
                  <dt className="self-center text-muted">
                    Assignee
                  </dt>
                  <dd>
                    <button
                      className="inline-flex h-8 w-full items-center justify-center rounded-[5px] border border-line bg-white px-2 text-[11px] font-medium text-ink hover:bg-canvas disabled:cursor-wait disabled:opacity-70"
                      disabled={
                        assignmentPending
                      }
                      onClick={() =>
                        updateAssignee(
                          currentUserId,
                        )
                      }
                      type="button"
                    >
                      {assignmentPending
                        ? "Assigning..."
                        : "Assign to me"}
                    </button>
                  </dd>
                </div>
              ) : (
                <DetailRow
                  label="Assignee"
                  value={
                    ticket.assignee?.name ??
                    "Unassigned"
                  }
                />
              )}
              <DetailRow
                label="Category"
                value={ticket.category}
              />
              <DetailRow
                label="Asset"
                value={
                  ticket.asset?.label ??
                  "Not linked"
                }
              />
              <DetailRow
                label="Created"
                value={ticket.createdAt}
              />
              <DetailRow
                label="Updated"
                value={ticket.updatedAt}
              />
            </dl>

            {ticket.status ===
            "Waiting approval" ? (
              <p className="mx-4 mb-3 text-[10px] leading-4 text-muted">
                Assignment is locked until the approval is decided.
              </p>
            ) : null}

            {assignmentNotice ? (
              <p
                className={`mx-4 mb-3 border-l-2 px-2.5 py-1.5 text-[10px] leading-4 ${
                  assignmentNotice.tone ===
                  "error"
                    ? "border-danger bg-[#fff7f6] text-danger"
                    : "border-success bg-[#f3faf6] text-[#277a4b]"
                }`}
                role={
                  assignmentNotice.tone ===
                  "error"
                    ? "alert"
                    : "status"
                }
              >
                {assignmentNotice.message}
              </p>
            ) : null}
          </section>

          <section className="rounded-[6px] border border-line bg-surface">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Clock3
                aria-hidden="true"
                className="size-3.5 text-muted"
                strokeWidth={1.8}
              />
              <h2 className="text-[12px] font-semibold text-ink">
                Activity
              </h2>
            </div>

            {ticket.activity.length > 0 ? (
              <ol className="divide-y divide-line">
                {ticket.activity.map(
                  (activity) => (
                    <li
                      className="px-4 py-3"
                      key={activity.id}
                    >
                      <p className="text-[11px] leading-4 text-[#4c5563]">
                        {activity.description}
                      </p>
                      <p className="mt-1 text-[10px] text-muted">
                        {activity.createdAt}
                      </p>
                    </li>
                  ),
                )}
              </ol>
            ) : (
              <p className="px-4 py-5 text-[11px] text-muted">
                No activity is available.
              </p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
      <dt className="text-muted">
        {label}
      </dt>
      <dd className="break-words font-medium text-ink">
        {value}
      </dd>
    </div>
  );
}

function SlaObjectiveRow({
  objective,
  completionLabel,
}: {
  objective: TicketDetailSlaObjective;
  completionLabel: string;
}) {
  const completion =
    objective.completedAt
      ? `${completionLabel} ${objective.completedAt}`
      : objective.status === "Canceled"
        ? "Canceled before completion"
        : "Pending";

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-ink">
          {objective.label}
        </p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
            slaBadgeClasses[objective.tone]
          }`}
        >
          {objective.status}
        </span>
      </div>

      <p className="mt-1 text-[10px] text-muted tabular-nums">
        {objective.timing}
      </p>

      <div
        aria-label={`${objective.label} progress ${objective.progress}%`}
        className="mt-2 h-1 overflow-hidden rounded-full bg-[#eceef1]"
        role="progressbar"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={
          objective.progress
        }
      >
        <div
          aria-hidden="true"
          className={`h-full ${
            slaBarClasses[objective.tone]
          }`}
          style={{
            width: `${objective.progress}%`,
          }}
        />
      </div>

      <div className="mt-2 space-y-0.5 text-[9px] leading-4 text-muted tabular-nums">
        <p>
          {objective.dueAt
            ? `Due ${objective.dueAt}`
            : "No deadline"}
        </p>
        <p>{completion}</p>
      </div>
    </div>
  );
}
