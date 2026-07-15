export const PROPOSAL_STATUS_STYLES: Record<string, string> = {
  Submitted: "bg-emerald-500/10 text-emerald-500",
  Draft: "bg-amber-500/10 text-amber-500",
}

export function formatProposalDate(date: string | null): string {
  if (!date) return "—"
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(date))
}

export function formatProposalDateTime(date: string | null): string {
  if (!date) return "—"
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date))
}
