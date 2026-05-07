"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ROUTES, APP_NAME } from "@/constants";
import { NAV_ITEMS, type NavItem as NavItemDef } from "./navItems";

/**
 * Desktop sidebar. Hidden below lg. Renders every entry from the shared
 * NAV_ITEMS list — Settings is split out and pinned to the bottom for
 * spatial consistency with the rest of the app.
 */
function NavItem({ item, pathname }: { item: NavItemDef; pathname: string }) {
  // Match either an exact equality OR an immediate child path. Plain
  // `pathname.startsWith(href)` would light up `/sleep` when on `/sleep-debt`,
  // because /sleep-debt also starts with /sleep. Requiring a trailing slash
  // for the prefix check eliminates that collision.
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      href={item.href as Route}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  // Split Settings off the main list so it stays pinned to the bottom.
  const main = NAV_ITEMS.filter((i) => i.href !== ROUTES.SETTINGS);
  const bottom = NAV_ITEMS.filter((i) => i.href === ROUTES.SETTINGS);

  return (
    <aside className="hidden w-60 flex-col border-r border-gray-200 bg-white lg:flex dark:border-gray-700 dark:bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-5 dark:border-gray-700">
        <Link href={ROUTES.DASHBOARD} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Dumbbell className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100">{APP_NAME}</span>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {main.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-gray-200 px-3 py-4 dark:border-gray-700">
        {bottom.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </aside>
  );
}
