"use client";

import {
  Check,
  ClipboardCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  decideTicketApprovalAction,
  requestTicketApprovalAction,
} from "@/features/approvals/server/request-approval-actions";
import type { TicketApprovalData } from "@/features/approvals/types/request-approval";

type Notice = {
  tone: "success" | "error";
  message: string;
};

const statusCopy = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;

const statusClasses = {
  PENDING:
    "border-[#ead7a6] bg-[#fffaf0] text-warning",
  APPROVED:
    "border-[#b9dfca] bg-[#f3faf6] text-success",
  REJECTED:
    "border-[#f0c5ca] bg-[#fff7f6] text-danger",
} as const;

export function TicketApprovalPanel({
  ticketId,
  approval,
}: {
  ticketId: string;
  approval: TicketApprovalData;
}) {
  const router = useRouter();
  const [isRequestOpen, setIsRequestOpen] =
    useState(false);
  const [approverId, setApproverId] =
    useState(
      approval.approverOptions[0]
        ?.value ?? "",
    );
  const [requestNote, setRequestNote] =
    useState("");
  const [decisionNote, setDecisionNote] =
    useState("");
  const [notice, setNotice] =
    useState<Notice | null>(null);
  const [isPending, startTransition] =
    useTransition();

  const pendingApproval =
    approval.history.find(
      (record) =>
        record.status === "PENDING",
    );

  const decidedHistory =
    approval.history.filter(
      (record) =>
        record.status !== "PENDING",
    );

  function submitRequest() {
    if (!approverId || isPending) {
      return;
    }

    setNotice(null);

    startTransition(async () => {
      try {
        const result =
          await requestTicketApprovalAction({
            ticketId,
            approverId,
            note: requestNote,
          });

        setNotice({
          tone: result.success
            ? "success"
            : "error",
          message: result.message,
        });

        if (result.success) {
          setIsRequestOpen(false);
          setRequestNote("");
          router.refresh();
        }
      } catch {
        setNotice({
          tone: "error",
          message:
            "The approval request could not be sent. Check the connection and try again.",
        });
      }
    });
  }

  function submitDecision(
    decision: "APPROVED" | "REJECTED",
  ) {
    if (!pendingApproval || isPending) {
      return;
    }

    setNotice(null);

    startTransition(async () => {
      try {
        const result =
          await decideTicketApprovalAction({
            approvalId: pendingApproval.id,
            decision,
            note: decisionNote,
          });

        setNotice({
          tone: result.success
            ? "success"
            : "error",
          message: result.message,
        });

        if (result.success) {
          setDecisionNote("");
          router.refresh();
        }
      } catch {
        setNotice({
          tone: "error",
          message:
            "The approval decision could not be saved. Check the connection and try again.",
        });
      }
    });
  }

  if (!approval.eligible) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[6px] border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck
            aria-hidden="true"
            className="size-3.5 text-muted"
            strokeWidth={1.8}
          />
          <h2 className="text-[12px] font-semibold text-ink">
            Approval
          </h2>
        </div>

        {pendingApproval ? (
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${statusClasses.PENDING}`}
          >
            Pending
          </span>
        ) : null}
      </div>

      <div className="px-4 py-3">
        {pendingApproval ? (
          <div>
            <p className="text-[11px] font-medium text-ink">
              Waiting for {pendingApproval.approver.name}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-muted">
              Requested by {pendingApproval.requestedBy.name} on {pendingApproval.requestedAt}.
            </p>

            {pendingApproval.requestNote ? (
              <p className="mt-2 whitespace-pre-wrap border-l-2 border-line pl-2.5 text-[11px] leading-4 text-[#4c5563]">
                {pendingApproval.requestNote}
              </p>
            ) : null}

            {pendingApproval.canDecide ? (
              <div className="mt-3 border-t border-line pt-3">
                <label
                  className="text-[10px] font-medium text-muted"
                  htmlFor="approval-decision-note"
                >
                  Decision note
                </label>
                <textarea
                  className="mt-1.5 min-h-20 w-full resize-y rounded-[5px] border border-line bg-white px-2.5 py-2 text-[11px] leading-4 text-ink outline-none placeholder:text-[#98a2b3] focus:border-accent disabled:cursor-wait disabled:opacity-70"
                  disabled={isPending}
                  id="approval-decision-note"
                  maxLength={500}
                  onChange={(event) =>
                    setDecisionNote(
                      event.target.value,
                    )
                  }
                  placeholder="Optional for approval, required for rejection..."
                  value={decisionNote}
                />

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[5px] bg-action px-2 text-[11px] font-medium text-white hover:bg-[#353b44] disabled:cursor-wait disabled:opacity-60"
                    disabled={isPending}
                    onClick={() =>
                      submitDecision("APPROVED")
                    }
                    type="button"
                  >
                    <Check
                      aria-hidden="true"
                      className="size-3.5"
                      strokeWidth={2}
                    />
                    Approve
                  </button>
                  <button
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[5px] border border-[#e7b8bd] bg-white px-2 text-[11px] font-medium text-danger hover:bg-[#fff7f6] disabled:cursor-wait disabled:opacity-60"
                    disabled={
                      isPending ||
                      decisionNote.trim()
                        .length < 5
                    }
                    onClick={() =>
                      submitDecision("REJECTED")
                    }
                    type="button"
                  >
                    <X
                      aria-hidden="true"
                      className="size-3.5"
                      strokeWidth={2}
                    />
                    Reject
                  </button>
                </div>
                <p className="mt-1.5 text-[9px] leading-3 text-muted">
                  Rejection requires a reason of at least 5 characters.
                </p>
              </div>
            ) : null}
          </div>
        ) : approval.canRequest ? (
          isRequestOpen ? (
            <div>
              <label
                className="text-[10px] font-medium text-muted"
                htmlFor="approval-approver"
              >
                Approver
              </label>
              <select
                className="mt-1.5 h-8 w-full rounded-[5px] border border-line bg-white px-2 text-[11px] font-medium text-ink outline-none focus:border-accent disabled:cursor-wait disabled:opacity-70"
                disabled={isPending}
                id="approval-approver"
                onChange={(event) =>
                  setApproverId(
                    event.target.value,
                  )
                }
                value={approverId}
              >
                {approval.approverOptions.map(
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

              <label
                className="mt-3 block text-[10px] font-medium text-muted"
                htmlFor="approval-request-note"
              >
                Request note (optional)
              </label>
              <textarea
                className="mt-1.5 min-h-20 w-full resize-y rounded-[5px] border border-line bg-white px-2.5 py-2 text-[11px] leading-4 text-ink outline-none placeholder:text-[#98a2b3] focus:border-accent disabled:cursor-wait disabled:opacity-70"
                disabled={isPending}
                id="approval-request-note"
                maxLength={500}
                onChange={(event) =>
                  setRequestNote(
                    event.target.value,
                  )
                }
                placeholder="Explain what needs approval..."
                value={requestNote}
              />

              <div className="mt-2 flex justify-end gap-2">
                <button
                  className="h-8 rounded-[5px] px-2.5 text-[11px] font-medium text-muted hover:bg-canvas hover:text-ink disabled:opacity-60"
                  disabled={isPending}
                  onClick={() =>
                    setIsRequestOpen(false)
                  }
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-8 rounded-[5px] bg-action px-3 text-[11px] font-medium text-white hover:bg-[#353b44] disabled:cursor-wait disabled:opacity-60"
                  disabled={
                    isPending || !approverId
                  }
                  onClick={submitRequest}
                  type="button"
                >
                  {isPending
                    ? "Sending..."
                    : "Send request"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[11px] leading-4 text-muted">
                Submit this service request to an Owner, Admin, or Manager before proceeding.
              </p>
              {approval.approverOptions.length >
              0 ? (
                <button
                  className="mt-3 h-8 w-full rounded-[5px] bg-action px-3 text-[11px] font-medium text-white hover:bg-[#353b44]"
                  onClick={() =>
                    setIsRequestOpen(true)
                  }
                  type="button"
                >
                  Request approval
                </button>
              ) : (
                <p className="mt-2 text-[10px] leading-4 text-warning">
                  No eligible approver is available.
                </p>
              )}
            </div>
          )
        ) : decidedHistory.length === 0 ? (
          <p className="text-[11px] leading-4 text-muted">
            No approval has been requested.
          </p>
        ) : null}

        {decidedHistory.length > 0 ? (
          <div
            className={`${
              pendingApproval ||
              approval.canRequest
                ? "mt-3 border-t border-line pt-3"
                : ""
            } space-y-3`}
          >
            {decidedHistory
              .slice(0, 3)
              .map((record) => (
                <div key={record.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${statusClasses[record.status]}`}
                    >
                      {statusCopy[record.status]}
                    </span>
                    <span className="text-[9px] text-muted">
                      {record.decidedAt}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-4 text-muted">
                    {record.approver.name} decided the request from {record.requestedBy.name}.
                  </p>
                  {record.decisionNote ? (
                    <p className="mt-1 whitespace-pre-wrap text-[11px] leading-4 text-[#4c5563]">
                      {record.decisionNote}
                    </p>
                  ) : null}
                </div>
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
            role={
              notice.tone === "error"
                ? "alert"
                : "status"
            }
          >
            {notice.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
