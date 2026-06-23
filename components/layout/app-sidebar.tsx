"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Settings, TrendingUp, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"

const NAV_SECTIONS = [
  {
    label: "WORKSPACE",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/proposals", label: "Proposals", icon: TrendingUp },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col rounded-xl border bg-background shadow-sm transition-all duration-200",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Logo row */}
      <div className="flex h-14 items-center justify-between border-b px-3">
        {!collapsed && (
          <div className="pl-2">
            <Logo />
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-4 p-2 pt-4">
        {NAV_SECTIONS.map(({ label, items }) => (
          <div key={label}>
            {!collapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {label}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map(({ href, label: itemLabel, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? itemLabel : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    pathname === href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && itemLabel}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
