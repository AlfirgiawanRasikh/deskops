"use client";

import {
  Bell,
  CheckCheck,
  CircleAlert,
  Inbox,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  TicketCheck,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  NotificationCenterItem,
  NotificationCenterResponse,
  NotificationErrorResponse,
  NotificationKind,
} from "@/features/notifications/types/notification-center";

const notificationIconByKind = {
  TICKET_CREATED: Inbox,
  TICKET_ASSIGNED: UserRoundCheck,
  TICKET_STATUS_CHANGED: TicketCheck,
  TICKET_REPLY_ADDED: MessageSquareText,
  TICKET_INTERNAL_NOTE_ADDED:
    MessageSquareText,
} satisfies Record<
  NotificationKind,
  typeof Bell
>;

function isNotificationCenterResponse(
  value: unknown,
): value is NotificationCenterResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray(
        (
          value as NotificationCenterResponse
        ).notifications,
      ) &&
      typeof (
        value as NotificationCenterResponse
      ).unreadCount === "number",
  );
}

function formatRelativeTime(
  value: string,
) {
  const timestamp = new Date(value);
  const elapsed =
    Date.now() - timestamp.getTime();

  if (
    Number.isNaN(timestamp.getTime()) ||
    elapsed < 0
  ) {
    return "Recently";
  }

  const minutes = Math.floor(
    elapsed / 60_000,
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(timestamp);
}

export function NotificationCenter() {
  const router = useRouter();
  const containerRef =
    useRef<HTMLDivElement>(null);
  const loadRequestIdRef =
    useRef(0);

  const [isOpen, setIsOpen] =
    useState(false);
  const [response, setResponse] =
    useState<NotificationCenterResponse>({
      notifications: [],
      unreadCount: 0,
    });
  const [hasLoaded, setHasLoaded] =
    useState(false);
  const [isLoading, setIsLoading] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [isClearingRead, setIsClearingRead] =
    useState(false);

  const loadNotifications = useCallback(
    async () => {
      const requestId =
        ++loadRequestIdRef.current;

      setIsLoading(true);

      try {
        const request = await fetch(
          "/api/notifications",
          {
            cache: "no-store",
          },
        );

        const payload: unknown =
          await request.json();

        if (!request.ok) {
          const errorPayload =
            payload as NotificationErrorResponse;

          throw new Error(
            errorPayload.error ||
              "Notifications could not be loaded.",
          );
        }

        if (
          !isNotificationCenterResponse(
            payload,
          )
        ) {
          throw new Error(
            "Notifications returned an invalid response.",
          );
        }

        if (
          requestId !==
          loadRequestIdRef.current
        ) {
          return;
        }

        setResponse(payload);
        setErrorMessage("");
      } catch (error) {
        if (
          requestId !==
          loadRequestIdRef.current
        ) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Notifications could not be loaded.",
        );
      } finally {
        if (
          requestId ===
          loadRequestIdRef.current
        ) {
          setHasLoaded(true);
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => {
        void loadNotifications();
      },
      0,
    );

    const interval = window.setInterval(
      () => {
        void loadNotifications();
      },
      60_000,
    );

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(
      event: PointerEvent,
    ) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(
          event.target,
        )
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );
    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen]);

  function optimisticallyRead(
    notificationId: string,
  ) {
    setResponse((current) => {
      const selected =
        current.notifications.find(
          (notification) =>
            notification.id ===
            notificationId,
        );

      if (!selected || selected.isRead) {
        return current;
      }

      return {
        unreadCount: Math.max(
          0,
          current.unreadCount - 1,
        ),
        notifications:
          current.notifications.map(
            (notification) =>
              notification.id ===
              notificationId
                ? {
                    ...notification,
                    isRead: true,
                  }
                : notification,
          ),
      };
    });
  }

  async function markAsRead(
    notificationId: string,
  ) {
    loadRequestIdRef.current += 1;
    optimisticallyRead(notificationId);

    try {
      const request = await fetch(
        "/api/notifications",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "read",
            notificationId,
          }),
        },
      );

      if (!request.ok) {
        throw new Error();
      }

      await loadNotifications();
    } catch {
      await loadNotifications();
    }
  }

  async function markAllAsRead() {
    const previousResponse = response;

    loadRequestIdRef.current += 1;

    setResponse((current) => ({
      unreadCount: 0,
      notifications:
        current.notifications.map(
          (notification) => ({
            ...notification,
            isRead: true,
          }),
        ),
    }));

    try {
      const request = await fetch(
        "/api/notifications",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "read-all",
          }),
        },
      );

      if (!request.ok) {
        throw new Error();
      }

      await loadNotifications();
    } catch {
      setResponse(previousResponse);
      setErrorMessage(
        "Notifications could not be updated.",
      );
    }
  }

  async function clearReadNotifications() {
    const previousResponse = response;

    loadRequestIdRef.current += 1;
    setIsClearingRead(true);
    setResponse((current) => ({
      unreadCount: current.unreadCount,
      notifications:
        current.notifications.filter(
          (notification) =>
            !notification.isRead,
        ),
    }));

    try {
      const request = await fetch(
        "/api/notifications",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "clear-read",
          }),
        },
      );

      if (!request.ok) {
        throw new Error();
      }

      await loadNotifications();
    } catch {
      setResponse(previousResponse);
      setErrorMessage(
        "Read notifications could not be cleared.",
      );
    } finally {
      setIsClearingRead(false);
    }
  }

  async function openNotification(
    notification: NotificationCenterItem,
  ) {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    setIsOpen(false);

    if (notification.href) {
      router.push(notification.href);
    }
  }

  const badgeLabel =
    response.unreadCount > 9
      ? "9+"
      : String(response.unreadCount);

  const hasReadNotifications =
    response.notifications.some(
      (notification) =>
        notification.isRead,
    );

  return (
    <div
      className="relative"
      ref={containerRef}
    >
      <button
        aria-controls="notification-center-panel"
        aria-expanded={isOpen}
        aria-label={
          response.unreadCount > 0
            ? `Notifications, ${response.unreadCount} unread`
            : "Notifications"
        }
        className="relative grid size-8 place-items-center rounded-[5px] text-muted hover:bg-canvas hover:text-ink"
        onClick={() => {
          setIsOpen((current) => !current);

          if (!isOpen) {
            void loadNotifications();
          }
        }}
        type="button"
      >
        <Bell
          aria-hidden="true"
          className="size-4"
          strokeWidth={1.8}
        />

        {response.unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-semibold leading-4 text-white">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <section
          aria-label="Notification center"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[6px] border border-line bg-surface shadow-[0_12px_32px_rgba(23,26,31,0.14)]"
          id="notification-center-panel"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-[13px] font-semibold text-ink">
                Notifications
              </h2>
              <p className="mt-0.5 text-[10px] text-muted">
                {response.unreadCount > 0
                  ? `${response.unreadCount} unread update${
                      response.unreadCount === 1
                        ? ""
                        : "s"
                    }`
                  : "You are all caught up"}
              </p>
            </div>

            {hasReadNotifications ||
            response.unreadCount > 0 ? (
              <div className="flex items-center gap-1">
                {hasReadNotifications ? (
                  <button
                    className="inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2 text-[10px] font-medium text-muted hover:bg-canvas hover:text-ink disabled:cursor-wait disabled:opacity-60"
                    disabled={isClearingRead}
                    onClick={() => {
                      void clearReadNotifications();
                    }}
                    type="button"
                  >
                    <Trash2
                      aria-hidden="true"
                      className="size-3.5"
                      strokeWidth={1.8}
                    />
                    {isClearingRead
                      ? "Clearing..."
                      : "Clear read"}
                  </button>
                ) : null}

                {response.unreadCount > 0 ? (
                  <button
                    className="inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2 text-[10px] font-medium text-muted hover:bg-canvas hover:text-ink"
                    onClick={() => {
                      void markAllAsRead();
                    }}
                    type="button"
                  >
                    <CheckCheck
                      aria-hidden="true"
                      className="size-3.5"
                      strokeWidth={1.8}
                    />
                    Mark all read
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="max-h-[min(480px,calc(100vh-100px))] overflow-y-auto">
            {isLoading && !hasLoaded ? (
              <div className="grid min-h-40 place-items-center px-5 py-8 text-center">
                <div>
                  <LoaderCircle
                    aria-hidden="true"
                    className="mx-auto size-5 animate-spin text-muted"
                    strokeWidth={1.8}
                  />
                  <p className="mt-2 text-[11px] text-muted">
                    Loading notifications...
                  </p>
                </div>
              </div>
            ) : errorMessage &&
              response.notifications.length ===
                0 ? (
              <div className="px-5 py-8 text-center">
                <CircleAlert
                  aria-hidden="true"
                  className="mx-auto size-5 text-danger"
                  strokeWidth={1.8}
                />
                <p className="mt-2 text-[11px] leading-4 text-muted">
                  {errorMessage}
                </p>
                <button
                  className="mx-auto mt-3 inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-line px-2.5 text-[10px] font-medium text-ink hover:bg-canvas"
                  onClick={() => {
                    void loadNotifications();
                  }}
                  type="button"
                >
                  <RefreshCw
                    aria-hidden="true"
                    className="size-3"
                    strokeWidth={1.8}
                  />
                  Try again
                </button>
              </div>
            ) : response.notifications.length ===
              0 ? (
              <div className="px-5 py-10 text-center">
                <Bell
                  aria-hidden="true"
                  className="mx-auto size-5 text-[#98a2b3]"
                  strokeWidth={1.6}
                />
                <p className="mt-2 text-[12px] font-medium text-ink">
                  No notifications yet
                </p>
                <p className="mt-1 text-[10px] leading-4 text-muted">
                  Ticket assignments and updates will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {response.notifications.map(
                  (notification) => {
                    const Icon =
                      notificationIconByKind[
                        notification.kind
                      ];

                    return (
                      <li key={notification.id}>
                        <button
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-canvas/70 ${
                            notification.isRead
                              ? "bg-surface"
                              : "bg-[#f7f9fc]"
                          }`}
                          onClick={() => {
                            void openNotification(
                              notification,
                            );
                          }}
                          type="button"
                        >
                          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-selected text-[#4c5563]">
                            <Icon
                              aria-hidden="true"
                              className="size-3.5"
                              strokeWidth={1.8}
                            />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-3">
                              <span className="truncate text-[11px] font-medium text-ink">
                                {notification.title}
                              </span>
                              <span className="shrink-0 text-[9px] text-muted">
                                {formatRelativeTime(
                                  notification.createdAt,
                                )}
                              </span>
                            </span>
                            <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-muted">
                              {notification.body}
                            </span>
                          </span>

                          {!notification.isRead ? (
                            <span
                              aria-label="Unread"
                              className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  },
                )}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
