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
