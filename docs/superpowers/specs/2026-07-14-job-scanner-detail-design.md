# Job Scanner Detail Page

Source: Bubble prototype reusable element `RE_detail_config` (exported app `colosal-13985 (1).bubble`, element id `bTVlt`).

## Goal

Add a view-only detail page for a single scan configuration, reachable by clicking its row in the job-scanner list. Shows the config's filters/notification summary plus the jobs found by that scan, mirroring the Bubble `RE_detail_config` component but backed by this app's actual Supabase schema.

## Route

`app/(dashboard)/job-scanner/[id]/page.tsx` — new server component, sibling to the existing `[id]/edit/page.tsx`.

## Layout

Two-column on desktop, stacks to single column on mobile:

- **Left column (sticky, ~340px wide)** — `config-summary.tsx`, presentational, read-only:
  - Header: status badge (`Active`/`Inactive`/`Draft`, same styles as `scanner-list.tsx` `STATUS_STYLES`) + config name. "Edit" button linking to `/job-scanner/[id]/edit`.
  - Stats row: Last scan, Next scan (both formatted date/time, "—" if null), Last result (`scan_result` text field, if present).
  - "Filters Configuration" section: Budget (`budget_min`–`budget_max`, currency), Hourly Rate (`hourly_rate_min`–`hourly_rate_max`, currency, "/hour" suffix), Keyword (`keyword`), Category (`category`), Skills (`skills` jsonb, tag list), Experience Level (`experience_level`), Contract Type (`contract_type` array — Fixed/Hourly badges).
  - "Notification" section: Email row (icon on/off by `notif_email`, value = `email`), WhatsApp row (icon on/off by `notif_whatsapp`, value = `whatsapp`).
  - No Audit Log section — Bubble's version was static placeholder text with no backing table in this schema; dropped rather than faked.

- **Right column** — `job-list.tsx`, presentational, read-only:
  - Tabs: All / New / Applied / Dismissed, each showing a count. Backed by `apply_status` enum (`New`, `Applied`, `Dismissed`) on `upwork_jobs`. Implemented as plain links carrying `?tab=` in the URL (no client state).
  - Paginated list, 20 rows/page, via `?page=` in the URL and `.range()` on the query, newest first (`inserted_at desc`).
  - Each job card: title (`title`), contract amount — `Fixed $<fixed_price_amount>` if `contract_type === 'FIXED'`, else `$<hourly_budget_min>-<hourly_budget_max>/hr`; scanned time ago (`inserted_at`, reuse `timeAgo()` pattern from `scanner-list.tsx`); match score (`score_matching`, shown as `<n>%`); apply status badge (`apply_status`).
  - No action buttons (Dismiss/Apply/View Proposal) in this iteration — read-only list only.
  - Empty state: "No job to display" (matches Bubble copy) when the filtered/paginated result set is empty.

## Data fetching (in `page.tsx`)

Three queries against Supabase, run in parallel with `Promise.all`:

1. `user_scan_config` full row by `id` (`.single()`); `notFound()` if missing.
2. Count of `upwork_jobs` for this `scan_config_id`, grouped by `apply_status` (for tab counts) — either one grouped query or 4 small `count`-only queries filtered per status.
3. `upwork_jobs` page slice: filtered by `scan_config_id`, and by `apply_status` when `tab !== 'All'`, ordered `inserted_at desc`, `.range((page-1)*20, page*20-1)`.

`searchParams` (`tab`, `page`) read from the page's props (Next 16 async `searchParams`).

## Navigation change

`scanner-list.tsx` (existing, `"use client"`):
- Row gets `onClick` → `router.push('/job-scanner/' + item.id)`.
- Existing Edit (pencil) and Delete buttons get `e.stopPropagation()` in their click handlers so the row navigation doesn't fire — Edit keeps its direct link to `/edit`, Delete keeps its inline confirm flow.

## Files

- `app/(dashboard)/job-scanner/[id]/page.tsx` (new)
- `app/(dashboard)/job-scanner/[id]/config-summary.tsx` (new)
- `app/(dashboard)/job-scanner/[id]/job-list.tsx` (new)
- `app/(dashboard)/job-scanner/scanner-list.tsx` (edit — row click navigation only)

## Explicitly out of scope

- Live job actions (Dismiss / Apply Proposal / View Proposal) — deferred, list is read-only for now.
- Audit log — no backing table, not built.
- Editing anything from the detail page itself — all edits still go through the existing `/edit` form.
