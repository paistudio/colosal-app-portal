import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ProposalList, type ProposalItem } from "./proposal-list"
import { TemplateList, type TemplateItem } from "./template-list"

type Tab = "proposals" | "templates"

function tabClass(active: boolean): string {
  return cn(
    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
  )
}

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab: Tab = tab === "templates" ? "templates" : "proposals"
  const supabase = await createClient()

  let proposals: ProposalItem[] = []
  let templates: TemplateItem[] = []

  if (activeTab === "proposals") {
    const { data } = await supabase
      .from("proposals")
      .select("id, is_submitted, last_generated_at, job:upwork_jobs(title, url, client_country)")
      .order("last_generated_at", { ascending: false, nullsFirst: false })
    proposals = (data ?? []) as unknown as ProposalItem[]
  } else {
    const { data } = await supabase
      .from("proposal_templates")
      .select("id, name, template")
      .order("created_at", { ascending: false })
    templates = (data ?? []) as TemplateItem[]
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-semibold">Proposals</h1>
        {activeTab === "templates" ? (
          <Button asChild>
            <Link href="/proposals/templates/new">
              <Plus /> New Template
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="mb-6 flex gap-2">
        <Link href="/proposals" className={tabClass(activeTab === "proposals")}>
          Proposals
        </Link>
        <Link href="/proposals?tab=templates" className={tabClass(activeTab === "templates")}>
          Templates
        </Link>
      </div>

      {activeTab === "proposals" ? <ProposalList items={proposals} /> : <TemplateList items={templates} />}
    </div>
  )
}
