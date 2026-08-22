import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  ChevronDown,
  CircleHelp,
  Inbox,
  Laptop,
  LayoutDashboard,
  Search,
  Settings,
  Ticket,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import type { WorkspaceRole } from "@/features/auth/server/authorization";

type NavigationKey =
  | "overview"
  | "queue"
  | "tickets"
  | "assets"
  | "people"
  | "reports"
  | "settings";

type NavigationItem = {
  key: NavigationKey;
  label: string;
  icon: LucideIcon;
  href?: string;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

type AppShellUser = {
  name: string;
  email: string;
  role: WorkspaceRole;
};

type AppShellProps = {
  activeNavigation?: NavigationKey;
  children: ReactNode;
  currentUser: AppShellUser;
  organizationName: string;
};

function getNavigationGroups(
  role: WorkspaceRole,
): NavigationGroup[] {
  const workspaceItems: NavigationItem[] = [
    {
      key: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      href: "/",
    },
    {
      key: "queue",
      label:
        role === "EMPLOYEE"
          ? "My requests"
          : "My queue",
      icon: Inbox,
      href: "/",
    },
  ];

  if (role !== "EMPLOYEE") {
    workspaceItems.push({
      key: "tickets",
      label: "All tickets",
      icon: Ticket,
      href: "/",
    });
  }

  workspaceItems.push({
    key: "assets",
    label: "Assets",
    icon: Laptop,
    href: "/assets",
  });

  const manageItems: NavigationItem[] = [];

  if (
    role === "OWNER" ||
    role === "ADMIN" ||
    role === "MANAGER"
  ) {
    manageItems.push(
      {
        key: "people",
        label: "People",
        icon: Users,
        href: "/people",
      },
      {
        key: "reports",
        label: "Reports",
        icon: BarChart3,
      },
    );
  }

  if (
    role === "OWNER" ||
    role === "ADMIN"
  ) {
    manageItems.push({
      key: "settings",
      label: "Settings",
      icon: Settings,
    });
  }

  return [
    {
      label: "Workspace",
      items: workspaceItems,
    },
    ...(manageItems.length > 0
      ? [
          {
            label: "Manage",
            items: manageItems,
          },
        ]
      : []),
  ];
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function getRoleLabel(role: WorkspaceRole) {
  return role
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-7 place-items-center rounded-[5px] bg-action text-[12px] font-semibold text-white">
        D
      </div>

      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold leading-none text-ink">
          DeskOps
        </p>

        <p className="mt-1 truncate text-[11px] leading-none text-muted">
          Service workspace
        </p>
      </div>
    </div>
  );
}

function AccountMenu({
  user,
  compact = false,
}: {
  user: AppShellUser;
  compact?: boolean;
}) {
  const initials = getInitials(user.name);
  const roleLabel = getRoleLabel(user.role);

  return (
    <details className="group relative">
      <summary
        aria-label={
          compact
            ? "Open account menu"
            : undefined
        }
        className={
          compact
            ? "grid size-8 cursor-pointer list-none place-items-center rounded-[5px] hover:bg-canvas [&::-webkit-details-marker]:hidden"
            : "flex w-full cursor-pointer list-none items-center gap-2 rounded-[5px] px-2 py-2 text-left hover:bg-white/70 [&::-webkit-details-marker]:hidden"
        }
      >
        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[#dce2ea] text-[11px] font-semibold text-[#364152]">
          {initials}
        </div>

        {!compact ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink">
                {user.name}
              </span>

              <span className="block truncate text-[11px] text-muted">
                {roleLabel}
              </span>
            </span>

            <ChevronDown
              aria-hidden="true"
              className="size-3.5 text-muted transition-transform group-open:rotate-180"
            />
          </>
        ) : null}
      </summary>

      <div
        className={`absolute z-30 rounded-[6px] border border-line bg-surface p-2 shadow-[0_6px_18px_rgba(23,26,31,0.08)] ${
          compact
            ? "right-0 top-[calc(100%+8px)] w-64"
            : "bottom-[calc(100%+8px)] left-0 right-0"
        }`}
      >
        <div className="border-b border-line px-2 pb-2">
          <p className="truncate text-[12px] font-medium text-ink">
            {user.name}
          </p>

          <p className="mt-0.5 truncate text-[11px] text-muted">
            {user.email}
          </p>

          <p className="mt-0.5 text-[11px] text-muted">
            {roleLabel}
          </p>
        </div>

        <div className="pt-2">
          <SignOutButton />
        </div>
      </div>
    </details>
  );
}

function Sidebar({
  activeNavigation,
  user,
  organizationName,
}: {
  activeNavigation: NavigationKey;
  user: AppShellUser;
  organizationName: string;
}) {
  const groups = getNavigationGroups(
    user.role,
  );

  return (
    <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-sidebar lg:flex">
      <div className="px-4 pb-3 pt-4">
        <Brand />
      </div>

      <div className="px-3 pb-4">
        <button
          className="flex w-full items-center justify-between rounded-[6px] border border-line bg-surface px-2.5 py-2 text-left"
          type="button"
        >
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-medium text-ink">
              {organizationName}
            </span>

            <span className="mt-0.5 block truncate text-[11px] text-muted">
              Production workspace
            </span>
          </span>

          <ChevronDown
            aria-hidden="true"
            className="size-3.5 text-muted"
          />
        </button>
      </div>

      <nav
        aria-label="Primary navigation"
        className="flex-1 overflow-y-auto px-2"
      >
        {groups.map((group) => (
          <div
            className="mb-5"
            key={group.label}
          >
            <p className="mb-1.5 px-2 text-[11px] font-medium text-muted">
              {group.label}
            </p>

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.key ===
                  activeNavigation;

                const className = `flex h-8 items-center gap-2 rounded-[5px] px-2 text-[13px] transition-colors ${
                  isActive
                    ? "bg-selected font-medium text-ink"
                    : item.href
                      ? "text-[#4c5563] hover:bg-white/70 hover:text-ink"
                      : "cursor-not-allowed text-[#98a2b3]"
                }`;

                const content = (
                  <>
                    <Icon
                      aria-hidden="true"
                      className="size-4 shrink-0"
                      strokeWidth={1.8}
                    />

                    <span className="flex-1 truncate">
                      {item.label}
                    </span>
                  </>
                );

                return (
                  <li key={item.key}>
                    {item.href ? (
                      <Link
                        aria-current={
                          isActive
                            ? "page"
                            : undefined
                        }
                        className={className}
                        href={item.href}
                      >
                        {content}
                      </Link>
                    ) : (
                      <span
                        aria-disabled="true"
                        className={className}
                        title="Coming later"
                      >
                        {content}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-2">
        <AccountMenu user={user} />
      </div>
    </aside>
  );
}

function Topbar({
  user,
}: {
  user: AppShellUser;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-line bg-surface/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="mr-4 lg:hidden">
        <Brand />
      </div>

      <label className="relative hidden w-full max-w-[420px] sm:block">
        <span className="sr-only">
          Search DeskOps
        </span>

        <Search
          aria-hidden="true"
          className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          strokeWidth={1.8}
        />

        <input
          className="h-8 w-full rounded-[5px] border border-line bg-canvas pl-8 pr-14 text-[13px] text-ink outline-none placeholder:text-[#8a93a1] focus:border-accent focus:bg-white"
          placeholder="Search tickets, people, or assets"
          type="search"
        />

        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted">
          Ctrl K
        </kbd>
      </label>

      <div className="ml-auto flex items-center gap-1">
        <button
          aria-label="Help"
          className="grid size-8 place-items-center rounded-[5px] text-muted hover:bg-canvas hover:text-ink"
          type="button"
        >
          <CircleHelp
            aria-hidden="true"
            className="size-4"
            strokeWidth={1.8}
          />
        </button>

        <button
          aria-label="Notifications"
          className="relative grid size-8 place-items-center rounded-[5px] text-muted hover:bg-canvas hover:text-ink"
          type="button"
        >
          <Bell
            aria-hidden="true"
            className="size-4"
            strokeWidth={1.8}
          />

          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-danger" />
        </button>

        <div className="ml-1 lg:hidden">
          <AccountMenu compact user={user} />
        </div>
      </div>
    </header>
  );
}

export function AppShell({
  activeNavigation = "overview",
  children,
  currentUser,
  organizationName,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <Sidebar
        activeNavigation={activeNavigation}
        organizationName={organizationName}
        user={currentUser}
      />

      <div className="min-w-0">
        <Topbar user={currentUser} />
        {children}
      </div>
    </div>
  );
}