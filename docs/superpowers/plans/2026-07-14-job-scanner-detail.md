# Job Scanner Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a view-only detail page at `/job-scanner/[id]` showing a scan config's filters/notification summary plus a paginated, tab-filtered list of jobs found by that scan, ported from the Bubble `RE_detail_config` prototype.

**Architecture:** One new server-component route (`page.tsx`) does the data fetching (config row + tab counts + paginated job slice) and passes plain props into two presentational components (`config-summary.tsx`, `job-list.tsx`). Tabs and pagination are plain links carrying `?tab=` and `?page=` query params — no client state. `scanner-list.tsx` gets a row-click handler to navigate here.

**Tech Stack:** Next.js 16 (App Router, async `params`/`searchParams`), React 19, Supabase JS client (server client from `lib/supabase/server.ts`), Tailwind v4, shadcn/ui (`Badge`), lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-07-14-job-scanner-detail-design.md`

## Global Constraints

- No test suite configured in this repo — verification gate per task is `npm run typecheck` (must pass with zero errors) plus a final manual browser check, not automated tests.
- Path alias `@/` maps to repo root.
- All edits/creates live under `app/(dashboard)/job-scanner/`.
- Read-only feature: no job action buttons (Dismiss/Apply/View Proposal), no audit log, no editing from this page — all per spec's "Explicitly out of scope".
- Formal, no new dependencies — use `Intl.NumberFormat`/`Intl.DateTimeFormat` for formatting, no date/number libs.

---

### Task 1: Export shared helpers from `scanner-list.tsx`, build `config-summary.tsx`

**Files:**
- Modify: `app/(dashboard)/job-scanner/scanner-list.tsx` (export `timeAgo` and `STATUS_STYLES`, both already defined there — no behavior change)
- Create: `app/(dashboard)/job-scanner/[id]/config-summary.tsx`

**Interfaces:**
- Consumes: nothing from other new files.
- Produces:
  - `scanner-list.tsx` now exports `export function timeAgo(iso: string | null): string` and `export const STATUS_STYLES: Record<string, string>` (currently unexported internals — Task 3 and Task 2 rely on `timeAgo`, Task 3's summary rendering relies on `STATUS_STYLES`).
  - `config-summary.tsx` exports:
    ```ts
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

    export function ConfigSummary({ config }: { config: ScanConfigDetail }): JSX.Element
    ```

- [ ] **Step 1: Export `timeAgo` and `STATUS_STYLES` from `scanner-list.tsx`**

In `app/(dashboard)/job-scanner/scanner-list.tsx`, change:

```ts
function timeAgo(iso: string | null): string {
```
to
```ts
export function timeAgo(iso: string | null): string {
```

and change:

```ts
const STATUS_STYLES: Record<string, string> = {
```
to
```ts
export const STATUS_STYLES: Record<string, string> = {
```

- [ ] **Step 2: Verify typecheck passes with no other changes**

Run: `npm run typecheck`
Expected: no errors (adding `export` to already-used-only-locally symbols cannot break anything).

- [ ] **Step 3: Write `config-summary.tsx`**

Create `app/(dashboard)/job-scanner/[id]/config-summary.tsx`:

```tsx
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
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no errors. (This component isn't imported anywhere yet, so it must type-check standalone — fix any prop/type mismatch now.)

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/job-scanner/scanner-list.tsx" "app/(dashboard)/job-scanner/[id]/config-summary.tsx"
git commit -m "feat: add read-only config summary card for job scanner detail page"
```

---

### Task 2: Build `job-list.tsx`

**Files:**
- Create: `app/(dashboard)/job-scanner/[id]/job-list.tsx`

**Interfaces:**
- Consumes: `timeAgo` from `../scanner-list` (produced in Task 1).
- Produces:
  ```ts
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

  export function JobList(props: JobListProps): JSX.Element
  ```
  Task 3 (`page.tsx`) builds this exact prop shape from Supabase query results.

- [ ] **Step 1: Write `job-list.tsx`**

Create `app/(dashboard)/job-scanner/[id]/job-list.tsx`:

```tsx
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Briefcase } from "lucide-react"
import { timeAgo } from "../scanner-list"

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
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <Link
              href={`/job-scanner/${scanConfigId}?tab=${activeTab}&page=${page - 1}`}
              aria-disabled={page <= 1}
            >
              Previous
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
            <Link
              href={`/job-scanner/${scanConfigId}?tab=${activeTab}&page=${page + 1}`}
              aria-disabled={page >= totalPages}
            >
              Next
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/job-scanner/[id]/job-list.tsx"
git commit -m "feat: add read-only paginated job list for job scanner detail page"
```

---

### Task 3: Build `page.tsx` (data fetching + layout)

**Files:**
- Create: `app/(dashboard)/job-scanner/[id]/page.tsx`

**Interfaces:**
- Consumes:
  - `ConfigSummary`, `ScanConfigDetail` from `./config-summary` (Task 1).
  - `JobList`, `JobRow`, `ApplyStatusTab` from `./job-list` (Task 2).
  - `createClient` from `@/lib/supabase/server` (existing).
- Produces: the route itself — nothing downstream depends on this file.

- [ ] **Step 1: Write `page.tsx`**

Create `app/(dashboard)/job-scanner/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ConfigSummary, type ScanConfigDetail } from "./config-summary"
import { JobList, type ApplyStatusTab, type JobRow } from "./job-list"

const PAGE_SIZE = 20
const TABS: ApplyStatusTab[] = ["All", "New", "Applied", "Dismissed"]

export default async function ScannerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; page?: string }>
}) {
  const { id } = await params
  const sp = await searchParams

  const activeTab: ApplyStatusTab = TABS.includes(sp.tab as ApplyStatusTab)
    ? (sp.tab as ApplyStatusTab)
    : "All"
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1)

  const supabase = await createClient()

  const { data: config } = await supabase
    .from("user_scan_config")
    .select("*")
    .eq("id", id)
    .single()

  if (!config) notFound()

  const baseQuery = supabase.from("upwork_jobs").select("id", { count: "exact", head: true }).eq("scan_config_id", id)

  const [allCount, newCount, appliedCount, dismissedCount] = await Promise.all([
    baseQuery,
    supabase
      .from("upwork_jobs")
      .select("id", { count: "exact", head: true })
      .eq("scan_config_id", id)
      .eq("apply_status", "New"),
    supabase
      .from("upwork_jobs")
      .select("id", { count: "exact", head: true })
      .eq("scan_config_id", id)
      .eq("apply_status", "Applied"),
    supabase
      .from("upwork_jobs")
      .select("id", { count: "exact", head: true })
      .eq("scan_config_id", id)
      .eq("apply_status", "Dismissed"),
  ])

  const counts: Record<ApplyStatusTab, number> = {
    All: allCount.count ?? 0,
    New: newCount.count ?? 0,
    Applied: appliedCount.count ?? 0,
    Dismissed: dismissedCount.count ?? 0,
  }

  let jobsQuery = supabase
    .from("upwork_jobs")
    .select(
      "id, title, contract_type, fixed_price_amount, fixed_price_currency, hourly_budget_min, hourly_budget_max, inserted_at, score_matching, apply_status"
    )
    .eq("scan_config_id", id)
    .order("inserted_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (activeTab !== "All") {
    jobsQuery = jobsQuery.eq("apply_status", activeTab)
  }

  const { data: jobRows } = await jobsQuery

  const configDetail: ScanConfigDetail = {
    id: config.id,
    name: config.name,
    status: config.status,
    keyword: config.keyword,
    category: config.category,
    experience_level: config.experience_level,
    contract_type: config.contract_type,
    budget_min: config.budget_min,
    budget_max: config.budget_max,
    hourly_rate_min: config.hourly_rate_min,
    hourly_rate_max: config.hourly_rate_max,
    skills: Array.isArray(config.skills) ? config.skills : [],
    last_scan: config.last_scan,
    next_scan: config.next_scan,
    scan_result: config.scan_result,
    notif_email: config.notif_email ?? false,
    email: config.email,
    notif_whatsapp: config.notif_whatsapp ?? false,
    whatsapp: config.whatsapp,
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 font-heading text-3xl font-semibold">Scanner Detail</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ConfigSummary config={configDetail} />
        </div>
        <JobList
          scanConfigId={id}
          jobs={(jobRows ?? []) as JobRow[]}
          counts={counts}
          activeTab={activeTab}
          page={page}
          pageSize={PAGE_SIZE}
          activeTabTotal={counts[activeTab]}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/job-scanner/[id]/page.tsx"
git commit -m "feat: add job scanner detail page route"
```

---

### Task 4: Wire row-click navigation in `scanner-list.tsx`

**Files:**
- Modify: `app/(dashboard)/job-scanner/scanner-list.tsx:75-131` (the `items.map(...)` row block)

**Interfaces:**
- Consumes: nothing new (route from Task 3 already exists at `/job-scanner/[id]`).
- Produces: nothing downstream depends on this.

- [ ] **Step 1: Add row click navigation with stopPropagation on interactive children**

In `app/(dashboard)/job-scanner/scanner-list.tsx`, change the row `<div>` (currently `className="flex items-center gap-4 rounded-3xl bg-card px-5 py-4 shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10"`) to add a click handler and cursor style:

```tsx
        <div
          key={item.id}
          onClick={() => router.push(`/job-scanner/${item.id}`)}
          className="flex cursor-pointer items-center gap-4 rounded-3xl bg-card px-5 py-4 shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10"
        >
```

Then wrap the trailing action buttons group (the `<div className="flex items-center gap-1">...</div>` containing Edit/Delete) with a stop-propagation handler so clicking those buttons doesn't also trigger the row navigation:

```tsx
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
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
```

(Only the wrapping `<div>`'s opening tag changes — the buttons inside are unchanged.)

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/job-scanner/scanner-list.tsx"
git commit -m "feat: navigate to scanner detail page on row click"
```

---

### Task 5: Manual end-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (background)
Expected: server up on `http://localhost:3000`.

- [ ] **Step 2: Log in and open the job scanner list**

Navigate to `http://localhost:3000/job-scanner`. Confirm the page loads with existing scanner rows.

- [ ] **Step 3: Click a scanner row (not the pencil/trash icons) and confirm it opens the detail page**

Expected: URL becomes `/job-scanner/<id>`, page renders config summary card (status, name, stats, filters, notification) on the left and a job list with tabs on the right.

- [ ] **Step 4: Click the pencil icon on a list row and confirm it still goes straight to `/job-scanner/<id>/edit`**

Expected: edit form loads, row click did not also fire (no console errors about navigation).

- [ ] **Step 5: On the detail page, click through New / Applied / Dismissed / All tabs**

Expected: URL query param updates (`?tab=New` etc.), job list content and counts change accordingly, no full page flash (Next Link soft nav).

- [ ] **Step 6: If a tab has more than 20 jobs, click Next/Previous pagination and confirm the URL and list update**

Expected: `?page=2` etc. appended, list shows the next slice, Previous/Next disable at the boundaries.

- [ ] **Step 7: Open a scanner with zero jobs (or a `Draft` one with none scanned yet) and confirm the empty state**

Expected: "No job to display" message with icon, no errors.

- [ ] **Step 8: Run typecheck one final time across the whole change set**

Run: `npm run typecheck`
Expected: no errors.

---

## Self-Review Notes

- Spec coverage: two-column layout (Task 3), config summary fields incl. skills/experience/category (Task 1), notification on/off (Task 1), no audit log (omitted, per spec), tabs+counts+pagination read-only job list (Task 2/3), row-click navigation with pencil staying direct to edit (Task 4). All spec sections covered.
- Placeholder scan: none — every step has full code.
- Type consistency: `ScanConfigDetail`, `JobRow`, `ApplyStatusTab`, `JobListProps` are defined once (Tasks 1–2) and consumed with the same shape in Task 3; `timeAgo`/`STATUS_STYLES` exported in Task 1 and imported by name in Tasks 1–2.
