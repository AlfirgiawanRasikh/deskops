"use client";

import {
  ArrowUpRight,
  Inbox,
  Laptop,
  LoaderCircle,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  GlobalSearchErrorResponse,
  GlobalSearchResponse,
  GlobalSearchResult,
  GlobalSearchResultKind,
} from "@/features/search/types/global-search";

const resultIcons = {
  ticket: Inbox,
  asset: Laptop,
  person: UserRound,
} satisfies Record<
  GlobalSearchResultKind,
  typeof Inbox
>;

function isGlobalSearchResponse(
  value: unknown,
): value is GlobalSearchResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray(
        (value as GlobalSearchResponse)
          .groups,
      ),
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const containerRef =
    useRef<HTMLDivElement>(null);
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] =
    useState(false);
  const [query, setQuery] =
    useState("");
  const [response, setResponse] =
    useState<GlobalSearchResponse | null>(
      null,
    );
  const [errorMessage, setErrorMessage] =
    useState("");
  const [isLoading, setIsLoading] =
    useState(false);
  const [activeIndex, setActiveIndex] =
    useState(0);

  const results = useMemo(
    () =>
      response?.groups.flatMap(
        (group) => group.results,
      ) ?? [],
    [response],
  );

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResponse(null);
    setErrorMessage("");
    setIsLoading(false);
    setActiveIndex(0);
  }, []);

  const openSearch = useCallback(() => {
    setIsOpen(true);
  }, []);

  const navigateToResult = useCallback(
    (result: GlobalSearchResult) => {
      closeSearch();
      router.push(result.href);
    },
    [closeSearch, router],
  );

  useEffect(() => {
    function handleGlobalShortcut(
      event: KeyboardEvent,
    ) {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement &&
          target.isContentEditable);

      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isTypingTarget
      ) {
        event.preventDefault();
        openSearch();
      }
    }

    window.addEventListener(
      "keydown",
      handleGlobalShortcut,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleGlobalShortcut,
      );
    };
  }, [openSearch]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    function handlePointerDown(
      event: PointerEvent,
    ) {
      const target = event.target;

      if (
        target instanceof Node &&
        !containerRef.current?.contains(
          target,
        )
      ) {
        closeSearch();
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
    };
  }, [closeSearch, isOpen]);

  useEffect(() => {
    const normalizedQuery =
      query.trim();

    if (normalizedQuery.length < 2) {
      return;
    }

    const controller =
      new AbortController();

    const timeout = window.setTimeout(
      async () => {
        try {
          const request = await fetch(
            `/api/search?q=${encodeURIComponent(
              normalizedQuery,
            )}`,
            {
              cache: "no-store",
              signal:
                controller.signal,
            },
          );

          const payload: unknown =
            await request.json();

          if (!request.ok) {
            const errorPayload =
              payload as GlobalSearchErrorResponse;

            throw new Error(
              errorPayload.error ||
                "Search could not be completed.",
            );
          }

          if (
            !isGlobalSearchResponse(
              payload,
            )
          ) {
            throw new Error(
              "Search returned an invalid response.",
            );
          }

          setResponse(payload);
          setActiveIndex(0);
        } catch (error) {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }

          setResponse(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Search could not be completed.",
          );
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      },
      200,
    );

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function handleSearchKeyDown(
    event: ReactKeyboardEvent,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
      return;
    }

    if (results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(
        (currentIndex) =>
          (currentIndex + 1) %
          results.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (currentIndex) =>
          (currentIndex - 1 +
            results.length) %
          results.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const selectedResult =
        results[activeIndex];

      if (selectedResult) {
        navigateToResult(
          selectedResult,
        );
      }
    }
  }

  function handleQueryChange(
    value: string,
  ) {
    setQuery(value);
    setResponse(null);
    setErrorMessage("");
    setActiveIndex(0);
    setIsLoading(
      value.trim().length >= 2,
    );
  }

  let resultOffset = 0;

  return (
    <div
      className="relative flex w-8 shrink-0 sm:w-full sm:max-w-[420px]"
      onKeyDown={handleSearchKeyDown}
      ref={containerRef}
    >
      {!isOpen ? (
        <button
          aria-expanded="false"
          aria-haspopup="listbox"
          className="group flex h-8 w-8 items-center justify-center rounded-[5px] border border-line bg-canvas text-muted transition-colors hover:border-[#c4cad4] hover:bg-white hover:text-ink sm:w-full sm:justify-start sm:px-2.5"
          onClick={openSearch}
          type="button"
        >
          <Search
            aria-hidden="true"
            className="size-4 shrink-0"
            strokeWidth={1.8}
          />

          <span className="ml-2 hidden truncate text-[13px] text-[#8a93a1] sm:block">
            Search tickets, people, or assets
          </span>

          <kbd className="ml-auto hidden rounded-[3px] border border-line bg-surface px-1.5 py-0.5 text-[10px] text-muted sm:block">
            /
          </kbd>
        </button>
      ) : (
        <div className="flex h-8 w-full items-center rounded-[5px] border border-accent bg-white px-2.5 shadow-[0_0_0_2px_rgba(79,98,230,0.08)]">
          <Search
            aria-hidden="true"
            className="size-4 shrink-0 text-muted"
            strokeWidth={1.8}
          />

          <input
            aria-activedescendant={
              results[activeIndex]
                ? `global-search-result-${results[activeIndex].kind}-${results[activeIndex].id}`
                : undefined
            }
            aria-controls="global-search-results"
            aria-expanded="true"
            aria-label="Search tickets, people, or assets"
            autoComplete="off"
            className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent px-2 text-[13px] text-ink outline-none ring-0 placeholder:text-[#8a93a1] focus:border-transparent focus:outline-none focus:ring-0"
            onChange={(event) =>
              handleQueryChange(
                event.target.value,
              )
            }
            placeholder="Search workspace"
            ref={inputRef}
            role="combobox"
            spellCheck={false}
            value={query}
          />

          {isLoading ? (
            <LoaderCircle
              aria-label="Searching"
              className="mr-1 size-4 animate-spin text-muted"
              strokeWidth={1.8}
            />
          ) : null}

          <button
            aria-label="Close search"
            className="grid size-6 shrink-0 place-items-center rounded-[4px] text-muted hover:bg-canvas hover:text-ink"
            onClick={closeSearch}
            type="button"
          >
            <X
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={1.8}
            />
          </button>
        </div>
      )}

      {isOpen &&
      query.trim().length >= 2 ? (
        <section
          aria-label="Search DeskOps"
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-[7px] border border-line bg-surface shadow-[0_10px_28px_rgba(17,24,39,0.12)]"
        >
          <div
            className="max-h-[min(480px,66vh)] overflow-y-auto p-2"
            id="global-search-results"
            role="listbox"
          >
            {isLoading &&
            !response &&
            !errorMessage ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-[11px] text-muted">
                <LoaderCircle
                  aria-hidden="true"
                  className="size-3.5 animate-spin"
                  strokeWidth={1.8}
                />
                Searching workspace...
              </div>
            ) : null}

            {errorMessage ? (
              <div className="px-3 py-7 text-center">
                <p className="text-[12px] font-medium text-danger">
                  {errorMessage}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Check the connection and try again.
                </p>
              </div>
            ) : null}

            {!isLoading &&
            !errorMessage &&
            query.trim().length >= 2 &&
            response &&
            results.length === 0 ? (
              <div className="px-3 py-7 text-center">
                <p className="text-[12px] font-medium text-ink">
                  No matching records
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Try another ID, name, email, asset tag, or keyword.
                </p>
              </div>
            ) : null}

            {!errorMessage
              ? response?.groups.map(
                  (group) => {
                    const groupStart =
                      resultOffset;

                    resultOffset +=
                      group.results.length;

                    return (
                      <div
                        className="mb-2 last:mb-0"
                        key={group.key}
                      >
                        <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                          {group.label}
                        </p>

                        <div className="space-y-0.5">
                          {group.results.map(
                            (
                              result,
                              resultIndex,
                            ) => {
                              const Icon =
                                resultIcons[
                                  result.kind
                                ];
                              const absoluteIndex =
                                groupStart +
                                resultIndex;
                              const isActive =
                                absoluteIndex ===
                                activeIndex;

                              return (
                                <button
                                  aria-selected={
                                    isActive
                                  }
                                  className={`flex w-full items-center gap-3 rounded-[5px] px-2.5 py-2 text-left transition-colors ${
                                    isActive
                                      ? "bg-selected"
                                      : "hover:bg-canvas"
                                  }`}
                                  id={`global-search-result-${result.kind}-${result.id}`}
                                  key={`${result.kind}:${result.id}`}
                                  onClick={() =>
                                    navigateToResult(
                                      result,
                                    )
                                  }
                                  onMouseEnter={() =>
                                    setActiveIndex(
                                      absoluteIndex,
                                    )
                                  }
                                  role="option"
                                  type="button"
                                >
                                  <span className="grid size-8 shrink-0 place-items-center rounded-[5px] border border-line bg-surface text-muted">
                                    <Icon
                                      aria-hidden="true"
                                      className="size-4"
                                      strokeWidth={1.8}
                                    />
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[12px] font-medium text-ink">
                                      {result.title}
                                    </span>
                                    <span className="mt-0.5 block truncate text-[10px] text-muted">
                                      {result.subtitle}
                                    </span>
                                  </span>

                                  <span className="hidden max-w-[170px] truncate text-[10px] text-muted sm:block">
                                    {result.context}
                                  </span>

                                  <ArrowUpRight
                                    aria-hidden="true"
                                    className="size-3.5 shrink-0 text-muted"
                                    strokeWidth={1.8}
                                  />
                                </button>
                              );
                            },
                          )}
                        </div>
                      </div>
                    );
                  },
                )
              : null}
          </div>

          {results.length > 0 ? (
            <footer className="hidden items-center gap-4 border-t border-line bg-canvas px-3 py-2 text-[10px] text-muted sm:flex">
              <span>↑↓ Navigate</span>
              <span>Enter Open</span>
              <span className="ml-auto">
                Esc Close
              </span>
            </footer>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
