"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FileText } from "lucide-react"
import { PROPOSAL_STATUS_STYLES, formatProposalDate } from "./proposal-format"

export interface ProposalItem {
  id: string
  is_submitted: boolean
  last_generated_at: string | null
  job: { title: string | null; url: string | null; client_country: string | null } | null
}

export function ProposalList({ items }: { items: ProposalItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed border-border py-24 text-center">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">No proposals yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const status = item.is_submitted ? "Submitted" : "Draft"
        return (
          <Link
            key={item.id}
            href={`/proposals/${item.id}`}
            className="flex items-center gap-4 rounded-3xl bg-card px-5 py-4 shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10"
          >
            <Badge className={cn("gap-1.5", PROPOSAL_STATUS_STYLES[status])}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {status}
            </Badge>

            <div className="min-w-0 flex-1">
              <p className="truncate font-heading font-medium">
                {item.job?.title ?? "Job no longer available"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {item.job?.client_country ? `${item.job.client_country} • ` : ""}
                Generated {formatProposalDate(item.last_generated_at)}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
