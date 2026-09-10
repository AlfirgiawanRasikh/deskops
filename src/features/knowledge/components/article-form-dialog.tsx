"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import {
  createKnowledgeArticleSchema,
  updateKnowledgeArticleSchema,
  type CreateKnowledgeArticleInput,
} from "@/features/knowledge/schemas/knowledge-actions";
import {
  createKnowledgeArticleAction,
  updateKnowledgeArticleAction,
} from "@/features/knowledge/server/knowledge-actions";

type ArticleFields =
  CreateKnowledgeArticleInput;

type FieldErrors = Partial<
  Record<keyof ArticleFields, string>
>;

const inputClassName =
  "h-9 w-full rounded-[5px] border border-line bg-surface px-2.5 text-[13px] text-ink outline-none placeholder:text-[#98a2b3] focus:border-accent disabled:cursor-not-allowed disabled:bg-[#f6f7f9]";

export function ArticleFormDialog({
  article,
  onClose,
}: {
  article?: ArticleFields & {
    id: string;
  };
  onClose: () => void;
}) {
  const router = useRouter();
  const [errors, setErrors] =
    useState<FieldErrors>({});
  const [submitError, setSubmitError] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const editing = Boolean(article);

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
    const fields = {
      title: formData.get("title"),
      summary: formData.get("summary"),
      content: formData.get("content"),
      category: formData.get("category"),
      tags: formData.get("tags"),
    };
    const validation = article
      ? updateKnowledgeArticleSchema.safeParse({
          articleId: article.id,
          ...fields,
        })
      : createKnowledgeArticleSchema.safeParse(
          fields,
        );

    if (!validation.success) {
      const nextErrors: FieldErrors = {};

      for (const issue of validation.error.issues) {
        const field = issue.path[0] as
          | keyof ArticleFields
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
      const result = article
        ? await updateKnowledgeArticleAction(
            validation.data as Parameters<
              typeof updateKnowledgeArticleAction
            >[0],
          )
        : await createKnowledgeArticleAction(
            validation.data as Parameters<
              typeof createKnowledgeArticleAction
            >[0],
          );

      if (!result.success) {
        setSubmitError(result.message);
        return;
      }

      if (!article && result.articleId) {
        router.push(
          `/knowledge/${result.articleId}`,
        );
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setSubmitError(
        "The article could not be saved. Check the connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function fieldError(
    field: keyof ArticleFields,
  ) {
    const message = errors[field];

    return message ? (
      <p
        className="mt-1 text-[11px] leading-4 text-danger"
        id={`knowledge-${field}-error`}
      >
        {message}
      </p>
    ) : null;
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
        aria-labelledby="article-form-title"
        aria-modal="true"
        className="my-auto flex max-h-[calc(100vh-32px)] w-full max-w-[760px] flex-col overflow-hidden rounded-[6px] border border-line bg-surface shadow-[0_20px_60px_rgba(23,26,31,0.16)]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-6 border-b border-line px-5 py-4">
          <div>
            <h2
              className="text-[16px] font-semibold text-ink"
              id="article-form-title"
            >
              {editing
                ? "Edit article"
                : "Create knowledge article"}
            </h2>
            <p className="mt-1 text-[12px] text-muted">
              {editing
                ? "Keep the guidance accurate and easy to scan."
                : "New articles begin as private drafts."}
            </p>
          </div>

          <button
            aria-label="Close article form"
            className="grid size-8 shrink-0 place-items-center rounded-[5px] text-muted hover:bg-canvas hover:text-ink disabled:opacity-50"
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

        <form
          className="flex min-h-0 flex-1 flex-col"
          noValidate
          onSubmit={handleSubmit}
        >
          <fieldset
            className="min-h-0 flex-1 overflow-y-auto"
            disabled={submitting}
          >
            <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 flex justify-between gap-3 text-[12px] font-medium text-[#4c5563]">
                  <span>Title</span>
                  <span className="font-normal text-muted">
                    5-120 characters
                  </span>
                </span>
                <input
                  autoFocus
                  className={inputClassName}
                  defaultValue={article?.title}
                  maxLength={120}
                  name="title"
                  placeholder="Reset a locked company account"
                />
                {fieldError("title")}
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 flex justify-between gap-3 text-[12px] font-medium text-[#4c5563]">
                  <span>Summary</span>
                  <span className="font-normal text-muted">
                    20-240 characters
                  </span>
                </span>
                <textarea
                  className="min-h-20 w-full resize-y rounded-[5px] border border-line bg-surface px-2.5 py-2 text-[13px] leading-5 text-ink outline-none placeholder:text-[#98a2b3] focus:border-accent"
                  defaultValue={article?.summary}
                  maxLength={240}
                  name="summary"
                  placeholder="Explain when this guide should be used and what it resolves."
                />
                {fieldError("summary")}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-[#4c5563]">
                  Category
                </span>
                <input
                  className={inputClassName}
                  defaultValue={article?.category}
                  maxLength={80}
                  name="category"
                  placeholder="Access / Account"
                />
                {fieldError("category")}
              </label>

              <label className="block">
                <span className="mb-1.5 flex justify-between gap-3 text-[12px] font-medium text-[#4c5563]">
                  <span>Tags</span>
                  <span className="font-normal text-muted">
                    Up to 8
                  </span>
                </span>
                <input
                  className={inputClassName}
                  defaultValue={article?.tags.join(", ")}
                  name="tags"
                  placeholder="password, login, account"
                />
                {fieldError("tags")}
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 flex justify-between gap-3 text-[12px] font-medium text-[#4c5563]">
                  <span>Article content</span>
                  <span className="font-normal text-muted">
                    Minimum 100 characters
                  </span>
                </span>
                <textarea
                  className="min-h-72 w-full resize-y rounded-[5px] border border-line bg-surface px-3 py-2.5 font-mono text-[12px] leading-6 text-ink outline-none placeholder:text-[#98a2b3] focus:border-accent"
                  defaultValue={article?.content}
                  maxLength={20_000}
                  name="content"
                  placeholder={
                    "Describe the symptoms, prerequisites, and numbered resolution steps.\n\nInclude a final verification step and when to contact IT."
                  }
                />
                {fieldError("content")}
              </label>
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
              className="h-8 rounded-[5px] px-3 text-[12px] font-medium text-[#4c5563] hover:bg-white hover:text-ink disabled:opacity-50"
              disabled={submitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-8 min-w-[112px] rounded-[5px] bg-action px-3.5 text-[12px] font-medium text-white hover:bg-[#353b44] disabled:cursor-wait disabled:opacity-70"
              disabled={submitting}
              type="submit"
            >
              {submitting
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Create draft"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
