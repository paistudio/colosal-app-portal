"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Pencil, Trash2, Loader2, Radar } from "lucide-react"

export interface ScannerItem {
  id: string
  name: string | null
  keyword: string | null
  status: string
  last_scan: string | null
  todayCount: number
  totalCount: number
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "never"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

export const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-500",
  Inactive: "bg-muted text-muted-foreground",
  Draft: "bg-amber-500/10 text-amber-500",
}

export function ScannerList({ items }: { items: ScannerItem[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    const supabase = createClient()
    const { error } = await supabase.from("user_scan_config").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      setDeleting(null)
      return
    }
    toast.success("Scanner deleted")
    setConfirmId(null)
    setDeleting(null)
    router.refresh()
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed border-border py-24 text-center">
        <Radar className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">No scanners yet.</p>
        <Button asChild variant="outline">
          <Link href="/job-scanner/new">Create your first scanner</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-4 rounded-3xl bg-card px-5 py-4 shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10"
        >
          <Badge
            className={cn(
              "gap-1.5",
              STATUS_STYLES[item.status] ?? STATUS_STYLES.Inactive
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {item.status}
          </Badge>

          <div className="min-w-0 flex-1">
            <p className="truncate font-heading font-medium">{item.name ?? "Untitled scanner"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {item.keyword ? `Keywords: ${item.keyword} • ` : ""}
              Last scan {timeAgo(item.last_scan)}
            </p>
          </div>

          <div className="hidden text-center sm:block">
            <p className="text-lg font-semibold">{item.todayCount}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </div>

          <div className="hidden text-center sm:block">
            <p className="text-lg font-semibold">{item.totalCount}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>

          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon">
              <Link href={`/job-scanner/${item.id}/edit`} aria-label="Edit scanner">
                <Pencil />
              </Link>
            </Button>

            {confirmId === item.id ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                >
                  {deleting === item.id ? <Loader2 className="animate-spin" /> : "Delete"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmId(item.id)}
                aria-label="Delete scanner"
              >
                <Trash2 />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
