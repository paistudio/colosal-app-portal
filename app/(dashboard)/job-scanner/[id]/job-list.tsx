import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Briefcase } from "lucide-react"
import { timeAgo } from "../scanner-format"

export type ApplyStatusTab = "All" | "New" | "Applied" | "Dismissed"

export interface JobRow {
  id: string
  title: string | null
  contract_type: string | null
  fixed_price_amount: number | null
  fixed_price_currency: string | null
  hourly_budget_min: number | null
  hourly_budget_max: number | null
  inserted_at: string
  score_matching: number | null
  apply_status: string | null
}

export interface JobListProps {
  scanConfigId: string
  jobs: JobRow[]
  counts: Record<ApplyStatusTab, number>
  activeTab: ApplyStatusTab
  page: number
  pageSize: number
  activeTabTotal: number
}

const TABS: ApplyStatusTab[] = ["All", "New", "Applied", "Dismissed"]

const APPLY_STATUS_STYLES: Record<string, string> = {
  New: "bg-sky-500/10 text-sky-500",
  Applied: "bg-emerald-500/10 text-emerald-500",
  Dismissed: "bg-muted text-muted-foreground",
}

function formatAmount(job: JobRow): string {
  if (job.contract_type === "FIXED") {
    if (job.fixed_price_amount === null) return "—"
    return `Fixed ${job.fixed_price_currency ?? "$"}${new Intl.NumberFormat("en-US").format(job.fixed_price_amount)}`
  }
  const min = job.hourly_budget_min
  const max = job.hourly_budget_max
  if (min === null && max === null) return "—"
  const fmt = (n: number) => `$${new Intl.NumberFormat("en-US").format(n)}`
  if (min !== null && max !== null) return `${fmt(min)} - ${fmt(max)}/hr`
  return `${fmt(min ?? max ?? 0)}/hr`
}

function tabHref(scanConfigId: string, tab: ApplyStatusTab): string {
  return tab === "All"
    ? `/job-scanner/${scanConfigId}`
    : `/job-scanner/${scanConfigId}?tab=${tab}`
}

export function JobList({
  scanConfigId,
  jobs,
  counts,
  activeTab,
  page,
  pageSize,
  activeTabTotal,
}: JobListProps) {
  const totalPages = Math.max(1, Math.ceil(activeTabTotal / pageSize))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={tabHref(scanConfigId, tab)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              tab === activeTab
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {tab} ({counts[tab]})
          </Link>
        ))}
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border py-20 text-center">
          <Briefcase className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No job to display</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="space-y-2 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 truncate font-heading font-medium">
                  {job.title ?? "Untitled job"}
                </p>
                <Badge
                  className={cn(
                    "shrink-0",
                    APPLY_STATUS_STYLES[job.apply_status ?? ""] ?? APPLY_STATUS_STYLES.Dismissed
                  )}
                >
                  {job.apply_status ?? "New"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{formatAmount(job)}</span>
                <span>Scanned {timeAgo(job.inserted_at)}</span>
                {job.score_matching !== null ? <span>Match {job.score_matching}%</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-2">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/job-scanner/${scanConfigId}?tab=${activeTab}&page=${page - 1}`}>
                Previous
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/job-scanner/${scanConfigId}?tab=${activeTab}&page=${page + 1}`}>
                Next
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
