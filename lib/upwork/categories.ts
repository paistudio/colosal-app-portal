import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchUpworkWithAuth } from "./token"

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const QUERY = `query { ontologyCategories { id preferredLabel slug subcategories { id preferredLabel } } }`

export interface UpworkCategory {
  id: string
  preferredLabel: string
  slug: string
  subcategories: { id: string; preferredLabel: string }[]
}

export async function fetchUpworkCategories(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  refreshToken: string | null
): Promise<UpworkCategory[]> {
  const res = await fetchUpworkWithAuth(supabase, userId, accessToken, refreshToken, (token) =>
    fetch("https://api.upwork.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": BROWSER_UA,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: QUERY }),
    })
  )

  const json = await res.json().catch(() => null)
  if (!res.ok || json?.errors) return []
  return json?.data?.ontologyCategories ?? []
}
