# Proposals Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/proposals` — a two-tab page (Proposals list, Templates CRUD) reading `public.proposals` and `public.proposal_templates`, plus a read-only `/proposals/[id]` detail view with copy-to-clipboard.

**Architecture:** Server components fetch via `lib/supabase/server.ts` (RLS scopes rows to `auth.uid()` automatically, same as `job-scanner`). Client components (`"use client"`) handle interactivity: copy buttons, delete confirmation, forms. Tab switching is a server-rendered `?tab=` query param (no client state), matching `job-scanner/[id]`'s `JobListTabs` pattern. Template create/edit use full-page routes (`/proposals/templates/new`, `/proposals/templates/[id]/edit`), mirroring the existing `job-scanner/new` + `job-scanner/[id]/edit` convention — no new UI dependency (shadcn `Dialog`) needed.

**Tech Stack:** Next.js 16 server components, Supabase JS client (browser + server), shadcn/ui (`Button`, `Badge`, `Input`, `Label`, `Textarea`), `sonner` toast, `lucide-react` icons.

## Global Constraints

- No test runner is configured in this repo (`package.json` has no `test` script, no jest/vitest). Verification is `npm run typecheck` after each task, plus one final manual browser check. Do not add a test framework — out of scope.
- Path alias `@/` maps to repo root.
- Server Components use `createClient` from `@/lib/supabase/server`; Client Components use `@/lib/supabase/client`.
- Follow existing formatting: Tailwind classes matching `scanner-list.tsx`/`job-list.tsx` (rounded-3xl cards, `ring-1 ring-foreground/5 dark:ring-foreground/10`, `shadow-sm`).
- `proposals.upwork_job_id` is nullable — every join must handle a null job gracefully (render "—" / skip job card, never crash).
- `question_answer` is `jsonb` with no DB-level shape guarantee — parse defensively, never trust the shape.

---

### Task 1: Shared proposal formatting helpers

**Files:**
- Create: `app/(dashboard)/proposals/proposal-format.ts`

**Interfaces:**
- Produces: `PROPOSAL_STATUS_STYLES: Record<string, string>`, `formatProposalDate(date: string | null): string`

- [ ] **Step 1: Write the helper file**

```ts
export const PROPOSAL_STATUS_STYLES: Record<string, string> = {
  Submitted: "bg-emerald-500/10 text-emerald-500",
  Draft: "bg-amber-500/10 text-amber-500",
}

export function formatProposalDate(date: string | null): string {
  if (!date) return "—"
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(date))
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/proposals/proposal-format.ts"
git commit -m "feat: add proposal formatting helpers"
```

---

### Task 2: Proposals tab list + page shell with tab switch

**Files:**
- Create: `app/(dashboard)/proposals/proposal-list.tsx`
- Create: `app/(dashboard)/proposals/page.tsx`
- Test: manual (`npm run typecheck` + browser)

**Interfaces:**
- Consumes: `PROPOSAL_STATUS_STYLES`, `formatProposalDate` from `./proposal-format` (Task 1)
- Produces: `ProposalList` component, `ProposalItem` type — consumed by `page.tsx` in this task; `page.tsx` also renders `TemplateList` from Task 4 (stub placeholder until Task 4 lands — see Step 3 note)

- [ ] **Step 1: Write `proposal-list.tsx`**

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors (unused-import errors are fine to ignore only if `page.tsx` isn't written yet — but write Step 3 in the same commit so this passes clean).

- [ ] **Step 3: Write `page.tsx`** (proposals tab wired now; templates tab wired in Task 4 — for now render a "Templates" tab link but empty body when active, so the file compiles standalone)

```tsx
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { ProposalList, type ProposalItem } from "./proposal-list"

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
  if (activeTab === "proposals") {
    const { data } = await supabase
      .from("proposals")
      .select("id, is_submitted, last_generated_at, job:upwork_jobs(title, url, client_country)")
      .order("last_generated_at", { ascending: false, nullsFirst: false })
    proposals = (data ?? []) as unknown as ProposalItem[]
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-semibold">Proposals</h1>
      </div>

      <div className="mb-6 flex gap-2">
        <Link href="/proposals" className={tabClass(activeTab === "proposals")}>
          Proposals
        </Link>
        <Link href="/proposals?tab=templates" className={tabClass(activeTab === "templates")}>
          Templates
        </Link>
      </div>

      {activeTab === "proposals" ? <ProposalList items={proposals} /> : null}
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Manual check**

Run: `npm run dev`, visit `/proposals`. Expect "Proposals" tab active, list of 8 rows (or "No proposals yet." if RLS/user has none) rendering title/status/date. Clicking "Templates" tab shows empty page body (expected — Task 4 fills it).

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/proposals/proposal-list.tsx" "app/(dashboard)/proposals/page.tsx"
git commit -m "feat: add proposals tab list"
```

---

### Task 3: Proposal detail page

**Files:**
- Create: `app/(dashboard)/proposals/[id]/proposal-detail.tsx`
- Create: `app/(dashboard)/proposals/[id]/page.tsx`

**Interfaces:**
- Consumes: none from other tasks (self-contained)
- Produces: `ProposalDetail` component, `ProposalDetailData` type (used only within this task)

- [ ] **Step 1: Write `proposal-detail.tsx`**

```tsx
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
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Copied")
    setTimeout(() => setCopied(false), 1500)
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
```

- [ ] **Step 2: Write `page.tsx`**

```tsx
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
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, click a proposal row from `/proposals`. Expect job card, cover letter block with working Copy button (toast "Copied", clipboard has the text), Q&A pairs each with their own Copy button. Visit a proposal with `upwork_job_id = null` (if any) or a proposal with empty `question_answer` — page must not crash, Q&A section simply omitted.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/proposals/[id]/proposal-detail.tsx" "app/(dashboard)/proposals/[id]/page.tsx"
git commit -m "feat: add proposal detail page with copy-to-clipboard"
```

---

### Task 4: Templates tab list with FK-guarded delete

**Files:**
- Create: `app/(dashboard)/proposals/template-list.tsx`
- Modify: `app/(dashboard)/proposals/page.tsx` (wire templates tab body + "New Template" button)

**Interfaces:**
- Produces: `TemplateList` component, `TemplateItem` type
- Consumes (Task 2): existing `page.tsx` tab-switch shell

- [ ] **Step 1: Write `template-list.tsx`**

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Pencil, Trash2, Loader2, FileStack } from "lucide-react"

export interface TemplateItem {
  id: string
  name: string | null
  template: string
}

export function TemplateList({ items }: { items: TemplateItem[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    const supabase = createClient()

    const { count, error: countError } = await supabase
      .from("user_scan_config")
      .select("id", { count: "exact", head: true })
      .eq("proposal_template_id", id)

    if (countError) {
      toast.error(countError.message)
      setDeleting(null)
      return
    }
    if (count && count > 0) {
      toast.error(`Template in use by ${count} scanner${count === 1 ? "" : "s"}`)
      setDeleting(null)
      setConfirmId(null)
      return
    }

    const { error } = await supabase.from("proposal_templates").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      setDeleting(null)
      return
    }
    toast.success("Template deleted")
    setConfirmId(null)
    setDeleting(null)
    router.refresh()
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-4xl border border-dashed border-border py-24 text-center">
        <FileStack className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">No templates yet.</p>
        <Button asChild variant="outline">
          <Link href="/proposals/templates/new">Create your first template</Link>
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
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading font-medium">{item.name || "Untitled template"}</p>
            <p className="truncate text-xs text-muted-foreground">{item.template.slice(0, 120)}</p>
          </div>

          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon">
              <Link href={`/proposals/templates/${item.id}/edit`} aria-label="Edit template">
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
                aria-label="Delete template"
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
```

- [ ] **Step 2: Wire templates tab into `page.tsx`**

Replace the file's contents (from Task 2) with:

```tsx
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
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, visit `/proposals?tab=templates`. Expect 4 template cards with truncated preview. Click delete on one referenced by a scan config (check via `SELECT proposal_template_id FROM user_scan_config WHERE proposal_template_id IS NOT NULL` if unsure which) — expect the "in use by N scanner(s)" toast, no deletion. Delete an unreferenced one — expect success toast + row removed.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/proposals/template-list.tsx" "app/(dashboard)/proposals/page.tsx"
git commit -m "feat: add templates tab with FK-guarded delete"
```

---

### Task 5: Template create/edit form + routes

**Files:**
- Create: `app/(dashboard)/proposals/template-form.tsx`
- Create: `app/(dashboard)/proposals/templates/new/page.tsx`
- Create: `app/(dashboard)/proposals/templates/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: none from other tasks
- Produces: `TemplateForm` component, `TemplateFormData` type

- [ ] **Step 1: Write `template-form.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"

export interface TemplateFormData {
  id?: string
  name: string
  template: string
  ai_instruction: string
}

const EMPTY: TemplateFormData = { name: "", template: "", ai_instruction: "" }

export function TemplateForm({ initial }: { initial?: TemplateFormData }) {
  const router = useRouter()
  const [form, setForm] = useState<TemplateFormData>(initial ?? EMPTY)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.name.trim() || !form.template.trim()) {
      toast.error("Name and template are required")
      return
    }
    setSaving(true)
    const supabase = createClient()

    const payload = {
      name: form.name,
      template: form.template,
      ai_instruction: form.ai_instruction,
    }

    const { error } = form.id
      ? await supabase.from("proposal_templates").update(payload).eq("id", form.id)
      : await supabase.from("proposal_templates").insert(payload)

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }
    toast.success(form.id ? "Template updated" : "Template created")
    router.push("/proposals?tab=templates")
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit gap-1">
        <Link href="/proposals?tab=templates">
          <ArrowLeft className="h-4 w-4" /> Back to Templates
        </Link>
      </Button>

      <h1 className="font-heading text-2xl font-semibold">
        {form.id ? "Edit Template" : "New Template"}
      </h1>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. General Web Dev"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template">Cover Letter Template</Label>
        <Textarea
          id="template"
          rows={10}
          value={form.template}
          onChange={(e) => setForm({ ...form, template: e.target.value })}
          placeholder="Wrap AI-filled sections in [prompt]...[/prompt]"
        />
        <p className="text-xs text-muted-foreground">
          Use <code>[prompt]…[/prompt]</code> to mark sections the AI should fill in per job.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai_instruction">AI Instruction</Label>
        <Textarea
          id="ai_instruction"
          rows={4}
          value={form.ai_instruction}
          onChange={(e) => setForm({ ...form, ai_instruction: e.target.value })}
          placeholder="Guidance for how the AI should fill the [prompt] sections"
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : "Save Template"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Write `templates/new/page.tsx`**

```tsx
import { TemplateForm } from "../../template-form"

export default function NewTemplatePage() {
  return <TemplateForm />
}
```

- [ ] **Step 3: Write `templates/[id]/edit/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TemplateForm, type TemplateFormData } from "../../../template-form"

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: template } = await supabase
    .from("proposal_templates")
    .select("id, name, template, ai_instruction")
    .eq("id", id)
    .single()

  if (!template) notFound()

  const initial: TemplateFormData = {
    id: template.id,
    name: template.name ?? "",
    template: template.template,
    ai_instruction: template.ai_instruction ?? "",
  }

  return <TemplateForm initial={initial} />
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Manual check**

Run: `npm run dev`. From `/proposals?tab=templates`, click "Create your first template" (or "New Template"). Fill name + template, save — expect redirect to `/proposals?tab=templates` with new card visible. Click edit (pencil) on an existing template, change the name, save — expect updated name in list. Try saving with empty name — expect "Name and template are required" toast, no navigation.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/proposals/template-form.tsx" "app/(dashboard)/proposals/templates"
git commit -m "feat: add template create/edit form"
```

---

### Task 6: Final full-flow verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 2: Manual walkthrough**

Run: `npm run dev`. Walk the full flow:
1. Sidebar "Proposals" link → `/proposals`, Proposals tab active by default, rows visible.
2. Click a proposal → detail page, copy cover letter, copy an answer, both toast "Copied" and clipboard content matches.
3. "Back to Proposals" returns to `/proposals`.
4. Switch to Templates tab → 4 cards.
5. Create a template, edit it, attempt delete on one referenced by a scan config (blocked with toast), delete an unreferenced one (succeeds).

No step in this task produces a commit — it's a verification gate only.
