import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ProposalDetail, type ProposalDetailData, type QAPair } from "./proposal-detail"

function parseQA(raw: unknown): QAPair[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is QAPair =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as QAPair).question === "string" &&
      typeof (item as QAPair).answer === "string"
  )
}

function formatAmount(job: {
  contract_type: string | null
  fixed_price_amount: number | null
  fixed_price_currency: string | null
  hourly_budget_min: number | null
  hourly_budget_max: number | null
} | null): string {
  if (!job) return "—"
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

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from("proposals")
    .select(
      "id, cover_letter_generated, question_answer, job:upwork_jobs(title, url, scan_config_id, contract_type, fixed_price_amount, fixed_price_currency, hourly_budget_min, hourly_budget_max)"
    )
    .eq("id", id)
    .single()

  if (!proposal) notFound()

  const job = proposal.job as unknown as {
    title: string | null
    url: string | null
    scan_config_id: string | null
    contract_type: string | null
    fixed_price_amount: number | null
    fixed_price_currency: string | null
    hourly_budget_min: number | null
    hourly_budget_max: number | null
  } | null

  const detail: ProposalDetailData = {
    id: proposal.id,
    cover_letter_generated: proposal.cover_letter_generated,
    question_answer: parseQA(proposal.question_answer),
    job: job
      ? {
          title: job.title,
          url: job.url,
          scan_config_id: job.scan_config_id,
          amount: formatAmount(job),
        }
      : null,
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 w-fit gap-1">
        <Link href="/proposals">
          <ArrowLeft className="h-4 w-4" /> Back to Proposals
        </Link>
      </Button>
      <ProposalDetail data={detail} />
    </div>
  )
}
