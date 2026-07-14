import { createClient } from "@/lib/supabase/server"
import { fetchUpworkWithAuth } from "@/lib/upwork/token"
import { NextResponse } from "next/server"

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// Mirrors the working n8n request: the term is inlined into the query string.
function buildQuery(term: string) {
  const safe = term.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  return `query { ontologyElementsSearchByPrefLabel(filter: { preferredLabel_any: "${safe}", type: SKILL, entityStatus_eq: ACTIVE }) { id preferredLabel type ... on Skill { legacySkillNid legacySkillId } } }`
}

async function searchUpwork(token: string, term: string) {
  return fetch("https://api.upwork.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": BROWSER_UA,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: buildQuery(term) }),
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const term = searchParams.get("q")?.trim()

  if (!term || term.length < 2) {
    return NextResponse.json({ skills: [] })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("access_token, refresh_token")
    .eq("user_id", user.id)
    .single()

  if (!profile?.access_token) {
    return NextResponse.json({ error: "Upwork not connected" }, { status: 400 })
  }

  const res = await fetchUpworkWithAuth(
    supabase,
    user.id,
    profile.access_token,
    profile.refresh_token,
    (token) => searchUpwork(token, term)
  )

  const json = await res.json().catch(() => null)

  if (!res.ok || json?.errors) {
    console.error("Upwork skills search failed", res.status, JSON.stringify(json?.errors))
    return NextResponse.json({ error: "Failed to search skills" }, { status: 502 })
  }

  const elements = json?.data?.ontologyElementsSearchByPrefLabel ?? []
  const skills = (elements as Array<{ id: string; preferredLabel: string }>).map((e) => ({
    id: e.id,
    label: e.preferredLabel,
  }))

  return NextResponse.json({ skills })
}
