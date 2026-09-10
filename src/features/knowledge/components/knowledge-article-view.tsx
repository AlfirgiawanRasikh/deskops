"use client";

import {
  Archive,
  ArrowLeft,
  Clock3,
  Edit3,
  FileText,
  Send,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ArticleFormDialog } from "@/features/knowledge/components/article-form-dialog";
import { updateKnowledgeArticleStatusAction } from "@/features/knowledge/server/knowledge-actions";
import type { KnowledgeArticleDetailData } from "@/features/knowledge/types/knowledge-base";

export function KnowledgeArticleView({
  data,
}: {
  data: KnowledgeArticleDetailData;
}) {
  const router = useRouter();
  const [editing, setEditing] =
    useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [pending, startTransition] =
    useTransition();
  const article = data.article;

  function changeStatus(
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
  ) {
    if (pending) return;

    setNotice(null);
    startTransition(async () => {
      try {
        const result =
          await updateKnowledgeArticleStatusAction(
            {
              articleId: article.id,
              status,
            },
          );

        setNotice({
          tone: result.success
            ? "success"
            : "error",
          message: result.message,
        });

        if (result.success) {
          router.refresh();
        }
      } catch {
        setNotice({
          tone: "error",
          message:
            "The article status could not be updated.",
        });
      }
    });
  }

  return (
    <main className="mx-auto max-w-[1220px] p-4 sm:p-6">
      <Link
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-ink"
        href="/knowledge"
      >
        <ArrowLeft
          aria-hidden="true"
          className="size-3.5"
        />
        Knowledge base
      </Link>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
        <article className="overflow-hidden rounded-[6px] border border-line bg-surface">
          <header className="border-b border-line px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-muted">
              <span>{article.category}</span>
              <span aria-hidden="true">/</span>
              <span className="uppercase tracking-[0.08em]">
                {article.status.toLowerCase()}
              </span>
            </div>
            <h1 className="mt-4 max-w-[820px] text-[26px] font-semibold leading-[1.2] tracking-[-0.025em] text-ink sm:text-[32px]">
              {article.title}
            </h1>
            <p className="mt-3 max-w-[760px] text-[13px] leading-6 text-muted">
              {article.summary}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-[10px] text-muted">
              <span>
                By {article.authorName}
              </span>
              <span>
                Updated {article.updatedAt}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3
                  aria-hidden="true"
                  className="size-3"
                />
                {article.readTimeMinutes} min read
              </span>
            </div>
          </header>

          <div className="px-5 py-7 sm:px-7 sm:py-8">
            <div className="whitespace-pre-wrap text-[13px] leading-7 text-[#343b47]">
              {article.content}
            </div>

            {article.tags.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-5">
                {article.tags.map((tag) => (
                  <span
                    className="rounded-[4px] bg-canvas px-2 py-1 text-[10px] text-[#596273]"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-[76px] lg:self-start">
          {(data.capabilities.canEdit ||
            data.capabilities
              .canManageStatus) ? (
            <section className="rounded-[6px] border border-line bg-surface p-4">
              <p className="text-[11px] font-semibold text-ink">
                Article controls
              </p>
              <p className="mt-1 text-[10px] leading-4 text-muted">
                Draft edits and status changes are recorded in the audit log.
              </p>

              <div className="mt-4 grid gap-2">
                {data.capabilities.canEdit ? (
                  <button
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-[5px] border border-line text-[11px] font-medium text-[#4c5563] hover:bg-canvas hover:text-ink"
                    onClick={() =>
                      setEditing(true)
                    }
                    type="button"
                  >
                    <Edit3
                      aria-hidden="true"
                      className="size-3.5"
                    />
                    Edit article
                  </button>
                ) : null}

                {data.capabilities
                  .canManageStatus &&
                article.status !==
                  "PUBLISHED" ? (
                  <button
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-[5px] bg-action text-[11px] font-semibold text-white hover:bg-[#222831] disabled:opacity-60"
                    disabled={pending}
                    onClick={() =>
                      changeStatus("PUBLISHED")
                    }
                    type="button"
                  >
                    <Send
                      aria-hidden="true"
                      className="size-3.5"
                    />
                    Publish article
                  </button>
                ) : null}

                {data.capabilities
                  .canManageStatus &&
                article.status ===
                  "PUBLISHED" ? (
                  <button
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-[5px] border border-line text-[11px] font-medium text-[#4c5563] hover:bg-canvas hover:text-ink disabled:opacity-60"
                    disabled={pending}
                    onClick={() =>
                      changeStatus("ARCHIVED")
                    }
                    type="button"
                  >
                    <Archive
                      aria-hidden="true"
                      className="size-3.5"
                    />
                    Archive article
                  </button>
                ) : null}

                {data.capabilities
                  .canManageStatus &&
                article.status ===
                  "ARCHIVED" ? (
                  <button
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-[5px] border border-line text-[11px] font-medium text-[#4c5563] hover:bg-canvas hover:text-ink disabled:opacity-60"
                    disabled={pending}
                    onClick={() =>
                      changeStatus("DRAFT")
                    }
                    type="button"
                  >
                    <Undo2
                      aria-hidden="true"
                      className="size-3.5"
                    />
                    Return to draft
                  </button>
                ) : null}
              </div>

              {notice ? (
                <p
                  className={`mt-3 border-l-2 px-2 py-1.5 text-[10px] leading-4 ${
                    notice.tone === "success"
                      ? "border-success bg-[#f3faf5] text-success"
                      : "border-danger bg-[#fff7f6] text-danger"
                  }`}
                  role="status"
                >
                  {notice.message}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-[6px] border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <FileText
                aria-hidden="true"
                className="size-3.5 text-muted"
              />
              <p className="text-[11px] font-semibold text-ink">
                Article details
              </p>
            </div>
            <dl className="mt-4 space-y-3 text-[10px]">
              <div>
                <dt className="text-muted">
                  Author
                </dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {article.authorName}
                </dd>
              </div>
              <div>
                <dt className="text-muted">
                  Created
                </dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {article.createdAt}
                </dd>
              </div>
              <div>
                <dt className="text-muted">
                  Published
                </dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {article.publishedAt ??
                    "Not published"}
                </dd>
              </div>
            </dl>
          </section>

          {data.events.length > 0 ? (
            <section className="rounded-[6px] border border-line bg-surface p-4">
              <p className="text-[11px] font-semibold text-ink">
                Recent activity
              </p>
              <ol className="mt-3 space-y-3">
                {data.events
                  .slice(0, 6)
                  .map((event) => (
                    <li
                      className="border-l border-line pl-3"
                      key={event.id}
                    >
                      <p className="text-[10px] font-medium text-ink">
                        {event.summary}
                      </p>
                      <p className="mt-0.5 text-[9px] text-muted">
                        {event.actorName} ·{" "}
                        {event.occurredAt}
                      </p>
                    </li>
                  ))}
              </ol>
            </section>
          ) : null}
        </aside>
      </div>

      {editing ? (
        <ArticleFormDialog
          article={{
            id: article.id,
            title: article.title,
            summary: article.summary,
            content: article.content,
            category: article.category,
            tags: article.tags,
          }}
          onClose={() =>
            setEditing(false)
          }
        />
      ) : null}
    </main>
  );
}
