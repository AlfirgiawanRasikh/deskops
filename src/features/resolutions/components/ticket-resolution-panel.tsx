"use client";

import {
  Check,
  RotateCcw,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ticketResolutionCategories } from "@/features/resolutions/schemas/ticket-resolution-actions";
import {
  confirmTicketResolutionAction,
  reopenTicketAction,
  resolveTicketAction,
} from "@/features/resolutions/server/ticket-resolution-actions";
import type {
  TicketResolutionCategory,
  TicketResolutionData,
  TicketResolutionRecord,
} from "@/features/resolutions/types/ticket-resolution";

type Notice = {
  tone: "success" | "error";
  message: string;
};

const categoryLabels: Record<TicketResolutionCategory, string> = {
  SOFTWARE_CONFIGURATION: "Software configuration",
  ACCOUNT_ACCESS: "Account access",
  HARDWARE_REPAIR: "Hardware repair",
  NETWORK_FIX: "Network fix",
  SECURITY_REMEDIATION: "Security remediation",
  USER_GUIDANCE: "User guidance",
  NO_FAULT_FOUND: "No fault found",
  OTHER: "Other",
};

const statusLabels = {
  PENDING_CONFIRMATION: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  REOPENED: "Reopened",
} as const;

const statusClasses = {
  PENDING_CONFIRMATION:
    "border-[#ead7a6] bg-[#fffaf0] text-warning",
  CONFIRMED:
    "border-[#b9dfca] bg-[#f3faf6] text-success",
  REOPENED:
    "border-[#c9d6ea] bg-[#f5f8fc] text-accent",
} as const;

export function TicketResolutionPanel({
  ticketId,
  resolution,
}: {
  ticketId: string;
  resolution: TicketResolutionData;
}) {
  const router = useRouter();
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [category, setCategory] = useState<TicketResolutionCategory>(
    "SOFTWARE_CONFIGURATION",
  );
  const [summary, setSummary] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeResolution = resolution.history.find(
    (record) => record.status === "PENDING_CONFIRMATION",
  );
  const previousResolutions = resolution.history.filter(
    (record) => record.id !== activeResolution?.id,
  );

  if (!resolution.canResolve && resolution.history.length === 0) {
    return null;
  }

  function runAction(action: () => Promise<{ success: boolean; message: string }>) {
    if (isPending) {
      return;
    }

    setNotice(null);
    startTransition(async () => {
      try {
        const result = await action();
        setNotice({
          tone: result.success ? "success" : "error",
          message: result.message,
        });

        if (result.success) {
          setIsResolveOpen(false);
          setIsReopenOpen(false);
          setSummary("");
          setReopenReason("");
          router.refresh();
        }
      } catch {
        setNotice({
          tone: "error",
          message:
            "The resolution action could not be saved. Check the connection and try again.",
        });
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-[6px] border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Wrench
            aria-hidden="true"
            className="size-3.5 text-muted"
            strokeWidth={1.8}
          />
          <h2 className="text-[12px] font-semibold text-ink">
            Resolution
          </h2>
        </div>

        {activeResolution ? (
          <ResolutionStatus record={activeResolution} />
        ) : null}
      </div>

      <div className="px-4 py-3">
        {activeResolution ? (
          <div>
            <p className="text-[11px] font-medium text-ink">
              {activeResolution.categoryLabel}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-muted">
              Resolved by {activeResolution.resolvedBy.name} on {activeResolution.resolvedAt}.
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[#4c5563]">
              {activeResolution.summary}
            </p>

            {activeResolution.canConfirm ? (
              <div className="mt-3 border-t border-line pt-3">
                <p className="text-[10px] leading-4 text-muted">
                  Confirm the fix to close this ticket, or reopen it by {activeResolution.reopenDeadline}.
                </p>

                {isReopenOpen ? (
                  <div className="mt-2">
                    <label
                      className="text-[10px] font-medium text-muted"
                      htmlFor="resolution-reopen-reason"
                    >
                      Reopen reason
                    </label>
                    <textarea
                      className="mt-1.5 min-h-20 w-full resize-y rounded-[5px] border border-line bg-white px-2.5 py-2 text-[11px] leading-4 text-ink outline-none placeholder:text-[#98a2b3] focus:border-accent disabled:cursor-wait disabled:opacity-70"
                      disabled={isPending}
                      id="resolution-reopen-reason"
                      maxLength={1000}
                      onChange={(event) => setReopenReason(event.target.value)}
                      placeholder="Explain what is still not working..."
                      value={reopenReason}
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        className="h-8 rounded-[5px] px-2.5 text-[11px] font-medium text-muted hover:bg-canvas hover:text-ink disabled:opacity-60"
                        disabled={isPending}
                        onClick={() => setIsReopenOpen(false)}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-[#c9d6ea] bg-white px-3 text-[11px] font-medium text-accent hover:bg-[#f5f8fc] disabled:cursor-wait disabled:opacity-60"
                        disabled={isPending || reopenReason.trim().length < 10}
                        onClick={() =>
                          runAction(() =>
                            reopenTicketAction({
                              resolutionId: activeResolution.id,
                              reason: reopenReason,
                            }),
                          )
                        }
                        type="button"
                      >
                        <RotateCcw className="size-3.5" strokeWidth={1.8} />
                        Reopen ticket
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[5px] bg-action px-2 text-[11px] font-medium text-white hover:bg-[#353b44] disabled:cursor-wait disabled:opacity-60"
                      disabled={isPending}
                      onClick={() =>
                        runAction(() =>
                          confirmTicketResolutionAction({
                            resolutionId: activeResolution.id,
                          }),
                        )
                      }
                      type="button"
                    >
                      <Check className="size-3.5" strokeWidth={2} />
                      Confirm fix
                    </button>
                    <button
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[5px] border border-line bg-white px-2 text-[11px] font-medium text-ink hover:bg-canvas disabled:opacity-60"
                      disabled={isPending || !activeResolution.canReopen}
                      onClick={() => setIsReopenOpen(true)}
                      type="button"
                    >
                      <RotateCcw className="size-3.5" strokeWidth={1.8} />
                      Reopen
                    </button>
                  </div>
                )}

                {!activeResolution.canReopen ? (
                  <p className="mt-2 text-[9px] leading-3 text-warning">
                    The 7-day reopen window has expired. You can still confirm the resolution.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 border-t border-line pt-3 text-[10px] leading-4 text-muted">
                Waiting for the requester to confirm the resolution or reopen the ticket.
              </p>
            )}
          </div>
        ) : resolution.canResolve ? (
          isResolveOpen ? (
            <div>
              <label
                className="text-[10px] font-medium text-muted"
                htmlFor="resolution-category"
              >
                Resolution category
              </label>
              <select
                className="mt-1.5 h-8 w-full rounded-[5px] border border-line bg-white px-2 text-[11px] font-medium text-ink outline-none focus:border-accent disabled:cursor-wait disabled:opacity-70"
                disabled={isPending}
                id="resolution-category"
                onChange={(event) =>
                  setCategory(event.target.value as TicketResolutionCategory)
                }
                value={category}
              >
                {ticketResolutionCategories.map((value) => (
                  <option key={value} value={value}>
                    {categoryLabels[value]}
                  </option>
                ))}
              </select>

              <label
                className="mt-3 block text-[10px] font-medium text-muted"
                htmlFor="resolution-summary"
              >
                Resolution summary
              </label>
              <textarea
                className="mt-1.5 min-h-24 w-full resize-y rounded-[5px] border border-line bg-white px-2.5 py-2 text-[11px] leading-4 text-ink outline-none placeholder:text-[#98a2b3] focus:border-accent disabled:cursor-wait disabled:opacity-70"
                disabled={isPending}
                id="resolution-summary"
                maxLength={2000}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Describe the fix and any verification performed..."
                value={summary}
              />

              <div className="mt-2 flex justify-end gap-2">
                <button
                  className="h-8 rounded-[5px] px-2.5 text-[11px] font-medium text-muted hover:bg-canvas hover:text-ink disabled:opacity-60"
                  disabled={isPending}
                  onClick={() => setIsResolveOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-8 rounded-[5px] bg-action px-3 text-[11px] font-medium text-white hover:bg-[#353b44] disabled:cursor-wait disabled:opacity-60"
                  disabled={isPending || summary.trim().length < 20}
                  onClick={() =>
                    runAction(() =>
                      resolveTicketAction({ ticketId, category, summary }),
                    )
                  }
                  type="button"
                >
                  {isPending ? "Saving..." : "Resolve ticket"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[11px] leading-4 text-muted">
                Record the fix before asking the requester to confirm completion.
              </p>
              <button
                className="mt-3 h-8 w-full rounded-[5px] bg-action px-3 text-[11px] font-medium text-white hover:bg-[#353b44]"
                onClick={() => setIsResolveOpen(true)}
                type="button"
              >
                Add resolution
              </button>
            </div>
          )
        ) : null}

        {previousResolutions.length > 0 ? (
          <div className={`${activeResolution || resolution.canResolve ? "mt-3 border-t border-line pt-3" : ""} space-y-3`}>
            <p className="text-[10px] font-medium text-muted">
              Previous resolutions
            </p>
            {previousResolutions.slice(0, 3).map((record) => (
              <ResolutionHistoryItem key={record.id} record={record} />
            ))}
          </div>
        ) : null}

        {notice ? (
          <p
            className={`mt-3 border-l-2 px-2.5 py-1.5 text-[10px] leading-4 ${
              notice.tone === "error"
                ? "border-danger bg-[#fff7f6] text-danger"
                : "border-success bg-[#f3faf6] text-[#277a4b]"
            }`}
            role={notice.tone === "error" ? "alert" : "status"}
          >
            {notice.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ResolutionStatus({ record }: { record: TicketResolutionRecord }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${statusClasses[record.status]}`}
    >
      {statusLabels[record.status]}
    </span>
  );
}

function ResolutionHistoryItem({ record }: { record: TicketResolutionRecord }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <ResolutionStatus record={record} />
        <span className="text-[9px] text-muted">{record.resolvedAt}</span>
      </div>
      <p className="mt-1.5 text-[10px] font-medium text-ink">
        {record.categoryLabel} by {record.resolvedBy.name}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-[10px] leading-4 text-muted">
        {record.summary}
      </p>
      {record.reopenReason ? (
        <p className="mt-1.5 border-l-2 border-[#c9d6ea] pl-2 text-[10px] leading-4 text-[#4c5563]">
          Reopen reason: {record.reopenReason}
        </p>
      ) : null}
      {record.confirmedAt ? (
        <p className="mt-1 text-[9px] text-muted">
          Confirmed {record.confirmedAt}
        </p>
      ) : record.reopenedAt ? (
        <p className="mt-1 text-[9px] text-muted">
          Reopened {record.reopenedAt}
        </p>
      ) : null}
    </div>
  );
}
