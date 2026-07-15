import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const MODEL = "gpt-4o-mini"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const kind = body?.kind as "cover" | "question" | undefined
  const jobTitle = body?.jobTitle as string | undefined
  const jobDescription = body?.jobDescription as string | undefined
  const instruction = (body?.instruction as string | undefined) ?? ""
  const base = (body?.base as string | undefined) ?? ""

  if (!kind || !jobTitle || !base.trim()) {
    return NextResponse.json({ error: "Missing kind, job, or template" }, { status: 400 })
  }

  const job = { title: jobTitle, description: jobDescription }

  const systemPrompt =
    kind === "cover"
      ? `You write Upwork cover letters. The user gives a template containing [prompt]...[/prompt] sections. Rewrite the template, replacing each [prompt]...[/prompt] section with content tailored to the job below, and keep everything else verbatim. Return only the final cover letter text, no markers, no commentary.`
      : `You answer Upwork screening questions using the freelancer's background knowledge below. Write one concise, tailored answer to a typical screening question for the job below. Return only the answer text, no commentary.`

  const userPrompt = `Job title: ${job.title ?? "Untitled"}\nJob description: ${job.description ?? "N/A"}\n\n${
    kind === "cover" ? "Cover letter template" : "Answer knowledge"
  }:\n${base}\n\n${instruction ? `Extra instructions: ${instruction}` : ""}`

  const res = await fetch(`${process.env.SUMOPOD_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUMOPOD_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    console.error("sumopod generation failed", res.status, errText)
    return NextResponse.json({ error: "AI generation failed" }, { status: 502 })
  }

  const json = await res.json()
  const raw = json?.choices?.[0]?.message?.content?.trim() ?? ""
  // Some models emit the literal two-char sequence "\n" instead of a real newline.
  const text = raw.replace(/\\n/g, "\n")
  return NextResponse.json({ text })
}
