"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Copy, Check } from "lucide-react"

export interface QAPair {
  question: string
  answer: string
}

export interface ProposalDetailData {
  id: string
  cover_letter_generated: string | null
  question_answer: QAPair[]
  job: {
    title: string | null
    url: string | null
    scan_config_id: string | null
    amount: string
  } | null
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Copied")
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Copy failed")
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} aria-label={label}>
      {copied ? <Check className="text-emerald-600" /> : <Copy />}
      Copy
    </Button>
  )
}

export function ProposalDetail({ data }: { data: ProposalDetailData }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10">
        {data.job?.url ? (
          <a
            href={data.job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-heading text-lg font-semibold hover:underline"
          >
            {data.job.title ?? "Untitled job"}
          </a>
        ) : (
          <p className="font-heading text-lg font-semibold">{data.job?.title ?? "Job no longer available"}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{data.job?.amount ?? "—"}</span>
          {data.job?.scan_config_id ? (
            <Link href={`/job-scanner/${data.job.scan_config_id}`} className="underline">
              View scanner
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold text-muted-foreground">Cover Letter</h2>
          <CopyButton text={data.cover_letter_generated ?? ""} label="Copy cover letter" />
        </div>
        <p className="whitespace-pre-wrap text-sm">{data.cover_letter_generated || "—"}</p>
      </div>

      {data.question_answer.length > 0 ? (
        <div className="space-y-4 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10">
          <h2 className="font-heading text-sm font-semibold text-muted-foreground">Question Answers</h2>
          {data.question_answer.map((qa, i) => (
            <div key={i} className="space-y-1.5 border-t border-border pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{qa.question}</p>
                <CopyButton text={qa.answer} label={`Copy answer ${i + 1}`} />
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{qa.answer}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
