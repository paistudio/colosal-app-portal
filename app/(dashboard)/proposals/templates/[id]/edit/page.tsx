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
