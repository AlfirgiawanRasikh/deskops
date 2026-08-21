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
import type { ReactNode } from "react";

type NavigationItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  count?: number;
};

const navigationGroups: Array<{
  label: string;
  items: NavigationItem[];
}> = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", icon: LayoutDashboard, active: true },
      { label: "My queue", icon: Inbox, count: 12 },
      { label: "All tickets", icon: Ticket },
      { label: "Assets", icon: Laptop },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "People", icon: Users },
      { label: "Reports", icon: BarChart3 },
      { label: "Settings", icon: Settings },
    ],
  },
];

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

function Sidebar() {
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
              Nusantara Systems
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-muted">
              Production workspace
            </span>
          </span>
          <ChevronDown aria-hidden="true" className="size-3.5 text-muted" />
        </button>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-2">
        {navigationGroups.map((group) => (
          <div className="mb-5" key={group.label}>
            <p className="mb-1.5 px-2 text-[11px] font-medium text-muted">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <li key={item.label}>
                    <a
                      aria-current={item.active ? "page" : undefined}
                      className={`flex h-8 items-center gap-2 rounded-[5px] px-2 text-[13px] transition-colors ${
                        item.active
                          ? "bg-selected font-medium text-ink"
                          : "text-[#4c5563] hover:bg-white/70 hover:text-ink"
                      }`}
                      href="#"
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.count ? (
                        <span className="text-[11px] tabular-nums text-muted">
                          {item.count}
                        </span>
                      ) : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-2">
        <button
          className="flex w-full items-center gap-2 rounded-[5px] px-2 py-2 text-left hover:bg-white/70"
          type="button"
        >
          <div className="grid size-7 place-items-center rounded-full bg-[#dce2ea] text-[11px] font-semibold text-[#364152]">
            AR
          </div>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium text-ink">
              Alfirgiawan Rasikh
            </span>
            <span className="block truncate text-[11px] text-muted">Administrator</span>
          </span>
          <ChevronDown aria-hidden="true" className="size-3.5 text-muted" />
        </button>
      </div>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-line bg-surface/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="mr-4 lg:hidden">
        <Brand />
      </div>

      <label className="relative hidden w-full max-w-[420px] sm:block">
        <span className="sr-only">Search DeskOps</span>
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
          <CircleHelp aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </button>
        <button
          aria-label="Notifications"
          className="relative grid size-8 place-items-center rounded-[5px] text-muted hover:bg-canvas hover:text-ink"
          type="button"
        >
          <Bell aria-hidden="true" className="size-4" strokeWidth={1.8} />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-danger" />
        </button>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <Sidebar />
      <div className="min-w-0">
        <Topbar />
        {children}
      </div>
    </div>
  );
}
