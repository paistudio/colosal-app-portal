import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Mail, MessageCircle, Pencil } from "lucide-react"
import { STATUS_STYLES } from "../scanner-list"

export interface ScanConfigDetail {
  id: string
  name: string | null
  status: string
  keyword: string | null
  category: string | null
  experience_level: string | null
  contract_type: string[] | null
  budget_min: number | null
  budget_max: number | null
  hourly_rate_min: number | null
  hourly_rate_max: number | null
  skills: { id?: string; preferredLabel?: string; label?: string }[] | null
  last_scan: string | null
  next_scan: string | null
  scan_result: string | null
  notif_email: boolean
  email: string | null
  notif_whatsapp: boolean
  whatsapp: string | null
}

function formatCurrency(n: number | null): string | null {
  if (n === null || n === undefined) return null
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)
}

function formatRange(min: number | null, max: number | null, suffix = ""): string {
  const a = formatCurrency(min)
  const b = formatCurrency(max)
  if (a && b) return `${a} - ${b}${suffix}`
  if (a) return `${a}+${suffix}`
  if (b) return `Up to ${b}${suffix}`
  return "—"
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-heading text-sm font-semibold text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

export function ConfigSummary({ config }: { config: ScanConfigDetail }) {
  const skillLabels = (config.skills ?? [])
    .map((s) => s.preferredLabel ?? s.label)
    .filter((label): label is string => Boolean(label))

  return (
    <div className="space-y-6 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge
            className={cn("gap-1.5", STATUS_STYLES[config.status] ?? STATUS_STYLES.Inactive)}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {config.status}
          </Badge>
          <p className="mt-2 truncate font-heading text-lg font-semibold">
            {config.name ?? "Untitled scanner"}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/job-scanner/${config.id}/edit`}>
            <Pencil /> Edit
          </Link>
        </Button>
      </div>

      <div className="space-y-2 rounded-2xl bg-muted/40 p-4">
        <Row label="Last scan" value={formatDateTime(config.last_scan)} />
        <Row label="Next scan" value={formatDateTime(config.next_scan)} />
        {config.scan_result ? <Row label="Last result" value={config.scan_result} /> : null}
      </div>

      <Section title="Filters Configuration">
        <div className="space-y-2">
          <Row label="Budget" value={formatRange(config.budget_min, config.budget_max)} />
          <Row
            label="Hourly Rate"
            value={formatRange(config.hourly_rate_min, config.hourly_rate_max, "/hour")}
          />
          <Row label="Keyword" value={config.keyword || "—"} />
          <Row label="Category" value={config.category || "—"} />
          <Row label="Experience Level" value={config.experience_level || "—"} />
          <Row
            label="Contract Type"
            value={config.contract_type && config.contract_type.length > 0 ? config.contract_type.join(", ") : "—"}
          />
        </div>
        {skillLabels.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {skillLabels.map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))}
          </div>
        ) : null}
      </Section>

      <Section title="Notification">
        <div className="space-y-2">
          <div className={cn("flex items-center gap-2 text-sm", !config.notif_email && "opacity-50")}>
            <Mail className="h-4 w-4" />
            <span className="flex-1 truncate">{config.email || "No email set"}</span>
            <Badge variant={config.notif_email ? "default" : "outline"}>
              {config.notif_email ? "On" : "Off"}
            </Badge>
          </div>
          <div className={cn("flex items-center gap-2 text-sm", !config.notif_whatsapp && "opacity-50")}>
            <MessageCircle className="h-4 w-4" />
            <span className="flex-1 truncate">{config.whatsapp || "No number set"}</span>
            <Badge variant={config.notif_whatsapp ? "default" : "outline"}>
              {config.notif_whatsapp ? "On" : "Off"}
            </Badge>
          </div>
        </div>
      </Section>
    </div>
  )
}
