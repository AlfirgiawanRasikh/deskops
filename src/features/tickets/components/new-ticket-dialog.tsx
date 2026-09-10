"use client";

import {
  BookOpenText,
  ExternalLink,
  X,
} from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { SelectOption } from "@/features/operations/types/operations-dashboard";
import {
  newTicketSchema,
  type NewTicketInput,
} from "@/features/tickets/schemas/new-ticket";
import type { TicketActionResult } from "@/features/tickets/types/ticket-actions";
import type { KnowledgeArticleSuggestion } from "@/features/knowledge/types/knowledge-base";
import { findKnowledgeSuggestions } from "@/features/knowledge/utils/knowledge-suggestions";

type FieldErrors = Partial<
  Record<keyof NewTicketInput, string>
>;

const inputClassName =
  "h-9 w-full rounded-[5px] border border-line bg-surface px-2.5 text-[13px] text-ink outline-none placeholder:text-[#98a2b3] focus:border-accent disabled:cursor-not-allowed disabled:bg-[#f6f7f9] disabled:text-muted";

export function NewTicketDialog({
  requesterOptions,
  assetOptions,
  suggestedArticles,
  requesterLocked,
  onClose,
  onCreate,
}: {
  requesterOptions: SelectOption[];
  assetOptions: SelectOption[];
  suggestedArticles: KnowledgeArticleSuggestion[];
  requesterLocked: boolean;
  onClose: () => void;
  onCreate: (
    ticket: NewTicketInput,
  ) => Promise<TicketActionResult>;
}) {
  const [errors, setErrors] =
    useState<FieldErrors>({});
  const [submitError, setSubmitError] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [title, setTitle] =
    useState("");
  const [category, setCategory] =
    useState("");
  const visibleSuggestions = useMemo(
    () =>
      requesterLocked
        ? findKnowledgeSuggestions({
            articles: suggestedArticles,
            title,
            category,
          })
        : [],
    [
      category,
      requesterLocked,
      suggestedArticles,
      title,
    ],
  );

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !submitting
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose, submitting]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) return;

    const formData = new FormData(
      event.currentTarget,
    );

    const result = newTicketSchema.safeParse({
      requestType: formData.get("requestType"),
      title: formData.get("title"),
      description: formData.get("description"),
      requesterId: formData.get("requesterId"),
      priority: formData.get("priority"),
      category: formData.get("category"),
      assetId: formData.get("assetId"),
    });

    if (!result.success) {
      const nextErrors: FieldErrors = {};

      for (const issue of result.error.issues) {
        const field = issue.path[0] as
          | keyof NewTicketInput
          | undefined;

        if (field && !nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      }

      setErrors(nextErrors);
      setSubmitError("");
      return;
    }

    setErrors({});
    setSubmitError("");
    setSubmitting(true);

    try {
      const actionResult = await onCreate(
        result.data,
      );

      if (!actionResult.success) {
        setSubmitError(actionResult.message);
      }
    } catch {
      setSubmitError(
        "The ticket could not be created. Check the connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function fieldError(
    field: keyof NewTicketInput,
  ) {
    if (!errors[field]) return null;

    return (
      <p
        className="mt-1 text-[11px] leading-4 text-danger"
        id={`${field}-error`}
      >
        {errors[field]}
      </p>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#171a1f]/35 p-4"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <section
        aria-busy={submitting}
        aria-labelledby="new-ticket-title"
        aria-modal="true"
        className="my-auto w-full max-w-[680px] overflow-hidden rounded-[6px] border border-line bg-surface shadow-[0_20px_60px_rgba(23,26,31,0.16)]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-6 border-b border-line px-5 py-4">
          <div>
            <h2
              className="text-[16px] font-semibold text-ink"
              id="new-ticket-title"
            >
              Create ticket
            </h2>

            <p className="mt-1 text-[12px] text-muted">
              Record the issue clearly so it can
              be routed without delay.
            </p>
          </div>

          <button
            aria-label="Close create ticket dialog"
            className="grid size-8 shrink-0 place-items-center rounded-[5px] text-muted hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            <X
              aria-hidden="true"
              className="size-4"
              strokeWidth={1.8}
            />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit}>
          <fieldset disabled={submitting}>
            <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-[#4c5563]">
                  Request type
                </span>

                <select
                  className={inputClassName}
                  defaultValue="Incident"
                  name="requestType"
                >
                  <option value="Incident">
                    Incident
                  </option>
                  <option value="Service request">
                    Service request
                  </option>
                </select>

                {fieldError("requestType")}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-[#4c5563]">
                  Priority
                </span>

                <select
                  className={inputClassName}
                  defaultValue="Normal"
                  name="priority"
                >
                  <option value="Urgent">
                    Urgent
                  </option>
                  <option value="High">
                    High
                  </option>
                  <option value="Normal">
                    Normal
                  </option>
                  <option value="Low">
                    Low
                  </option>
                </select>

                {fieldError("priority")}
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 flex items-center justify-between gap-3 text-[12px] font-medium text-[#4c5563]">
                  <span>Title</span>
                  <span className="font-normal text-muted">
                    5-120 characters
                  </span>
                </span>

                <input
                  aria-describedby={
                    errors.title
                      ? "title-error"
                      : undefined
                  }
                  aria-invalid={Boolean(
                    errors.title,
                  )}
                  autoFocus
                  className={inputClassName}
                  name="title"
                  onChange={(event) =>
                    setTitle(
                      event.target.value,
                    )
                  }
                  placeholder="Short summary of the issue"
                  type="text"
                />

                {fieldError("title")}
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 flex items-center justify-between gap-3 text-[12px] font-medium text-[#4c5563]">
                  <span>Description</span>
                  <span className="font-normal text-muted">
                    Minimum 15 characters
                  </span>
                </span>

                <textarea
                  aria-describedby={
                    errors.description
                      ? "description-error"
                      : undefined
                  }
                  aria-invalid={Boolean(
                    errors.description,
                  )}
                  className="min-h-28 w-full resize-y rounded-[5px] border border-line bg-surface px-2.5 py-2 text-[13px] leading-5 text-ink outline-none placeholder:text-[#98a2b3] focus:border-accent disabled:cursor-not-allowed disabled:bg-[#f6f7f9]"
                  name="description"
                  placeholder="What happened, who is affected, and what has already been tried?"
                />

                {fieldError("description")}
              </label>

              <div className="block sm:col-span-2">
                <span className="mb-1.5 block text-[12px] font-medium text-[#4c5563]">
                  Requester
                </span>

                {requesterLocked &&
                requesterOptions[0] ? (
                  <>
                    <input
                      name="requesterId"
                      type="hidden"
                      value={requesterOptions[0].value}
                    />
                    <div className="flex h-9 items-center rounded-[5px] border border-line bg-[#f6f7f9] px-2.5 text-[13px] text-[#4c5563]">
                      <span className="truncate">
                        {requesterOptions[0].label}
                      </span>
                    </div>
                  </>
                ) : (
                  <select
                    className={inputClassName}
                    defaultValue=""
                    name="requesterId"
                  >
                    <option disabled value="">
                      Select organization member
                    </option>

                    {requesterOptions.map(
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
                )}

                {fieldError("requesterId")}
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-[#4c5563]">
                  Category
                </span>

                <select
                  className={inputClassName}
                  defaultValue=""
                  name="category"
                  onChange={(event) =>
                    setCategory(
                      event.target.value,
                    )
                  }
                >
                  <option disabled value="">
                    Select category
                  </option>
                  <option value="Network / VPN">
                    Network / VPN
                  </option>
                  <option value="Access / Account">
                    Access / Account
                  </option>
                  <option value="Hardware / Device">
                    Hardware / Device
                  </option>
                  <option value="Software / License">
                    Software / License
                  </option>
                  <option value="Security / Incident">
                    Security / Incident
                  </option>
                </select>

                {fieldError("category")}
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center justify-between gap-3 text-[12px] font-medium text-[#4c5563]">
                  <span>Asset</span>
                  <span className="font-normal text-muted">
                    Optional
                  </span>
                </span>

                <select
                  className={inputClassName}
                  defaultValue=""
                  name="assetId"
                >
                  <option value="">
                    No linked asset
                  </option>

                  {assetOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>

                {fieldError("assetId")}
              </label>

              {requesterLocked &&
              visibleSuggestions.length > 0 ? (
                <section className="overflow-hidden rounded-[5px] border border-[#cfdcf2] bg-[#f7f9fc] sm:col-span-2">
                  <div className="flex items-center gap-2 border-b border-[#dce4ef] px-3 py-2.5">
                    <BookOpenText
                      aria-hidden="true"
                      className="size-3.5 text-[#49627d]"
                      strokeWidth={1.8}
                    />
                    <div>
                      <p className="text-[11px] font-semibold text-ink">
                        Suggested help
                      </p>
                      <p className="mt-0.5 text-[9px] text-muted">
                        These published guides may resolve the issue before submission.
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-[#dce4ef]">
                    {visibleSuggestions.map(
                      (article) => (
                        <Link
                          className="flex items-start justify-between gap-4 px-3 py-2.5 hover:bg-white/70"
                          href={`/knowledge/${article.id}`}
                          key={article.id}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[11px] font-medium text-[#405b78]">
                              {article.title}
                            </span>
                            <span className="mt-0.5 block line-clamp-1 text-[9px] text-muted">
                              {article.summary}
                            </span>
                          </span>
                          <ExternalLink
                            aria-hidden="true"
                            className="mt-0.5 size-3 shrink-0 text-muted"
                          />
                        </Link>
                      ),
                    )}
                  </div>
                </section>
              ) : null}
            </div>
          </fieldset>

          {submitError ? (
            <div
              className="mx-5 mb-4 border-l-2 border-danger bg-[#fff7f6] px-3 py-2.5 text-[12px] leading-5 text-danger"
              role="alert"
            >
              {submitError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-line bg-[#fafbfc] px-5 py-3">
            <button
              className="h-8 rounded-[5px] px-3 text-[12px] font-medium text-[#4c5563] hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>

            <button
              className="h-8 min-w-[104px] rounded-[5px] bg-action px-3.5 text-[12px] font-medium text-white hover:bg-[#353b44] disabled:cursor-wait disabled:opacity-70"
              disabled={submitting}
              type="submit"
            >
              {submitting
                ? "Creating..."
                : "Create ticket"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
