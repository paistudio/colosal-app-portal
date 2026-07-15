import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ScannerList, type ScannerItem } from "./scanner-list"

export default async function JobScannerPage() {
  const supabase = await createClient()

  const { data: configs } = await supabase
    .from("user_scan_config")
    .select(
      "id, name, keyword, status, last_scan, contract_type, budget_min, budget_max, hourly_rate_min, hourly_rate_max, skills, experience_level, category, client_hire_rate, question_instruction, question_answer_base, attachments, notif_email, email, notif_whatsapp, whatsapp"
    )
    .eq("is_archived", false)
    .order("created_at", { ascending: false })

  // Job counts per config (RLS scopes rows to the current user).
  const { data: jobRows } = await supabase
    .from("upwork_jobs")
    .select("scan_config_id, inserted_at")

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const totals = new Map<string, number>()
  const today = new Map<string, number>()
  for (const row of jobRows ?? []) {
    const id = row.scan_config_id as string
    if (!id) continue
    totals.set(id, (totals.get(id) ?? 0) + 1)
    if (row.inserted_at && new Date(row.inserted_at) >= startOfToday) {
      today.set(id, (today.get(id) ?? 0) + 1)
    }
  }

  const items: ScannerItem[] = (configs ?? []).map((c) => ({
    ...c,
    todayCount: today.get(c.id) ?? 0,
    totalCount: totals.get(c.id) ?? 0,
  })) as ScannerItem[]

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-semibold">Job Scanner</h1>
        <Button asChild>
          <Link href="/job-scanner/new">
            <Plus /> New Configuration
          </Link>
        </Button>
      </div>

      <ScannerList items={items} />
    </div>
  )
}
