"use client";

import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ArticleFormDialog } from "@/features/knowledge/components/article-form-dialog";
import type {
  KnowledgeArticleStatus,
  KnowledgeBaseData,
  KnowledgeBaseQuery,
} from "@/features/knowledge/types/knowledge-base";

const statusClasses: Record<
  KnowledgeArticleStatus,
  string
> = {
  DRAFT:
    "border-[#e4d9c5] bg-[#faf7f1] text-[#755d37]",
  PUBLISHED:
    "border-[#cde2d5] bg-[#f2f8f4] text-[#3f6f50]",
  ARCHIVED:
    "border-[#d9dce2] bg-[#f5f6f8] text-[#667085]",
};

const metricIcons = [
  BookOpenCheck,
  FolderOpen,
  FileText,
  Clock3,
] as const;

function createKnowledgeHref(
  query: KnowledgeBaseQuery,
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
  if (query.status !== "ALL") {
    parameters.set(
      "status",
      query.status,
    );
  }
  if (page > 1) {
    parameters.set("page", String(page));
  }

  const queryString =
    parameters.toString();

  return queryString
    ? `/knowledge?${queryString}`
    : "/knowledge";
}

export function KnowledgeBase({
  data,
}: {
  data: KnowledgeBaseData;
}) {
  const [createOpen, setCreateOpen] =
    useState(false);
  const hasFilters =
    data.query.query.length > 0 ||
    data.query.category !== "ALL" ||
    data.query.status !== "ALL";

  return (
    <main className="mx-auto max-w-[1480px] p-4 sm:p-6">
      <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-medium text-muted">
            {data.organizationName}
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">
            Knowledge base
          </h1>
          <p className="mt-1.5 max-w-[720px] text-[13px] leading-5 text-muted">
            Find trusted workspace guidance before opening a support request.
          </p>
        </div>

        {data.capabilities.canCreate ? (
          <button
            className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-[5px] bg-action px-3.5 text-[11px] font-semibold text-white hover:bg-[#222831] lg:self-auto"
            onClick={() =>
              setCreateOpen(true)
            }
            type="button"
          >
            <Plus
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={2}
            />
            New article
          </button>
        ) : null}
      </header>

      <section
        className={`mt-4 grid gap-3 sm:grid-cols-2 ${
          data.metrics.length === 4
            ? "xl:grid-cols-4"
            : data.metrics.length === 3
              ? "xl:grid-cols-3"
              : "xl:grid-cols-2"
        }`}
      >
        {data.metrics.map(
          (metric, index) => {
            const Icon =
              metricIcons[index] ??
              FileText;

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
        <form
          action="/knowledge"
          className={`grid gap-2 border-b border-line bg-[#fafbfc] p-3 ${
            data.capabilities.canManageAll
              ? "md:grid-cols-[minmax(240px,1fr)_190px_150px_auto]"
              : "md:grid-cols-[minmax(240px,1fr)_190px_auto]"
          }`}
          method="get"
        >
          <label className="relative">
            <span className="sr-only">
              Search knowledge articles
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
              placeholder="Search title, steps, category, or tag"
            />
          </label>

          <label>
            <span className="sr-only">
              Filter article category
            </span>
            <select
              className="h-8 w-full rounded-[5px] border border-line bg-surface px-2.5 text-[11px] text-ink outline-none focus:border-accent"
              defaultValue={
                data.query.category
              }
              name="category"
            >
              <option value="ALL">
                All categories
              </option>
              {data.categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ),
              )}
            </select>
          </label>

          {data.capabilities.canManageAll ? (
            <label>
              <span className="sr-only">
                Filter article status
              </span>
              <select
                className="h-8 w-full rounded-[5px] border border-line bg-surface px-2.5 text-[11px] text-ink outline-none focus:border-accent"
                defaultValue={
                  data.query.status
                }
                name="status"
              >
                <option value="ALL">
                  All statuses
                </option>
                <option value="PUBLISHED">
                  Published
                </option>
                <option value="DRAFT">
                  Draft
                </option>
                <option value="ARCHIVED">
                  Archived
                </option>
              </select>
            </label>
          ) : null}

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
                href="/knowledge"
              >
                Reset
              </Link>
            ) : null}
          </div>
        </form>

        {data.articles.length > 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3">
            {data.articles.map(
              (article, index) => (
                <Link
                  className={`group min-w-0 p-5 hover:bg-[#fafbfc] ${
                    index > 0
                      ? "border-t border-line"
                      : ""
                  } ${
                    index % 2 !== 0
                      ? "md:border-l"
                      : ""
                  } ${
                    index > 1
                      ? "md:border-t"
                      : ""
                  } ${
                    index % 3 !== 0
                      ? "xl:border-l"
                      : "xl:border-l-0"
                  } ${
                    index > 2
                      ? "xl:border-t"
                      : "xl:border-t-0"
                  }`}
                  href={`/knowledge/${article.id}`}
                  key={article.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {article.category}
                    </span>
                    {article.status !==
                    "PUBLISHED" ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                          statusClasses[
                            article.status
                          ]
                        }`}
                      >
                        {article.status.toLowerCase()}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-4 text-[16px] font-semibold leading-6 text-ink group-hover:text-[#405b78]">
                    {article.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-[12px] leading-5 text-muted">
                    {article.summary}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {article.tags
                      .slice(0, 4)
                      .map((tag) => (
                        <span
                          className="rounded-[4px] bg-canvas px-1.5 py-1 text-[9px] text-[#596273]"
                          key={tag}
                        >
                          {tag}
                        </span>
                      ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-3 text-[9px] text-muted">
                    <span className="truncate">
                      {article.authorName}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {article.readTimeMinutes} min read
                    </span>
                  </div>
                </Link>
              ),
            )}
          </div>
        ) : (
          <div className="px-4 py-16 text-center">
            <BookOpenCheck
              aria-hidden="true"
              className="mx-auto size-6 text-muted"
              strokeWidth={1.6}
            />
            <p className="mt-3 text-[13px] font-medium text-ink">
              No knowledge articles found
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {hasFilters
                ? "Adjust the active filters and try again."
                : data.capabilities.canCreate
                  ? "Create the first draft for this workspace."
                  : "Published guidance will appear here."}
            </p>
          </div>
        )}

        <footer className="flex flex-col gap-3 border-t border-line bg-[#fafbfc] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-muted tabular-nums">
            {data.pagination.totalItems > 0
              ? `Showing ${data.pagination.firstItem}-${data.pagination.lastItem} of ${data.pagination.totalItems} articles`
              : "No matching articles"}
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
              href={createKnowledgeHref(
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
              href={createKnowledgeHref(
                data.query,
                Math.min(
                  data.pagination.totalPages,
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

      {createOpen ? (
        <ArticleFormDialog
          onClose={() =>
            setCreateOpen(false)
          }
        />
      ) : null}
    </main>
  );
}
