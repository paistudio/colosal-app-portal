import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

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

async function refreshUpworkToken(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const credentials = Buffer.from(
    `${process.env.UPWORK_CLIENT_ID}:${process.env.UPWORK_CLIENT_SECRET}`
  ).toString("base64")

  const res = await fetch("https://www.upwork.com/api/v3/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) return null

  const { access_token, refresh_token, expires_in } = await res.json()
  await supabase
    .from("user_profiles")
    .update({
      access_token,
      refresh_token: refresh_token ?? refreshToken,
      expires_at: expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null,
      last_used: new Date().toISOString(),
    })
    .eq("user_id", userId)

  return access_token
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

  let res = await searchUpwork(profile.access_token, term)

  // Token likely expired — refresh and retry once.
  if ((res.status === 401 || res.status === 403) && profile.refresh_token) {
    const newToken = await refreshUpworkToken(supabase, user.id, profile.refresh_token)
    if (newToken) res = await searchUpwork(newToken, term)
  }

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
