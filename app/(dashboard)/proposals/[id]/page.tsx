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

function parseSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((s) => {
      if (typeof s === "string") return s
      const obj = s as { preferredLabel?: string; label?: string }
      return obj?.preferredLabel ?? obj?.label ?? null
    })
    .filter((s): s is string => Boolean(s))
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
      "id, cover_letter_generated, question_answer, is_submitted, last_generated_at, connects_used, attachment, job:upwork_jobs(title, url, description, contract_type, fixed_price_amount, fixed_price_currency, hourly_budget_min, hourly_budget_max, skills, client_country, publish_time, scan_config_id, scan_config:user_scan_config(name))"
    )
    .eq("id", id)
    .single()

  if (!proposal) notFound()

  const job = proposal.job as unknown as {
    title: string | null
    url: string | null
    description: string | null
    contract_type: string | null
    fixed_price_amount: number | null
    fixed_price_currency: string | null
    hourly_budget_min: number | null
    hourly_budget_max: number | null
    skills: unknown
    client_country: string | null
    publish_time: string | null
    scan_config_id: string | null
    scan_config: { name: string | null } | null
  } | null

  const attachmentIds = Array.isArray(proposal.attachment) ? proposal.attachment : []
  const { data: attachmentRows } =
    attachmentIds.length > 0
      ? await supabase.from("attachments").select("id, file_name").in("id", attachmentIds)
      : { data: [] }

  const detail: ProposalDetailData = {
    id: proposal.id,
    is_submitted: proposal.is_submitted,
    last_generated_at: proposal.last_generated_at,
    connects_used: proposal.connects_used,
    cover_letter_generated: proposal.cover_letter_generated,
    question_answer: parseQA(proposal.question_answer),
    attachments: (attachmentRows ?? []).map((a) => ({ id: a.id, file_name: a.file_name })),
    job: job
      ? {
          title: job.title,
          url: job.url,
          description: job.description,
          scan_config_id: job.scan_config_id,
          scan_config_name: job.scan_config?.name ?? null,
          amount: formatAmount(job),
          posted: job.publish_time,
          client_country: job.client_country,
          skills: parseSkills(job.skills),
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
