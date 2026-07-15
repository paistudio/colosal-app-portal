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

    let error
    if (form.id) {
      ;({ error } = await supabase.from("proposal_templates").update(payload).eq("id", form.id))
    } else {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.push("/login")
        return
      }
      ;({ error } = await supabase
        .from("proposal_templates")
        .insert({ ...payload, user_id: userData.user.id }))
    }

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
