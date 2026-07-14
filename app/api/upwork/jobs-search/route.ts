import { createClient } from "@/lib/supabase/server"
import { fetchUpworkWithAuth } from "@/lib/upwork/token"
import { NextResponse } from "next/server"

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const QUERY = `query marketplaceJobPostingsSearch(
  $marketPlaceJobFilter: MarketplaceJobPostingsSearchFilter,
  $sortAttributes: [MarketplaceJobPostingSearchSortAttribute]
) {
  marketplaceJobPostingsSearch(
    marketPlaceJobFilter: $marketPlaceJobFilter,
    sortAttributes: $sortAttributes
  ) {
    totalCount
    edges {
      node {
        title
        description
        ciphertext
        job {
          contractorSelection {
            proposalRequirement {
              screeningQuestions { question }
            }
          }
        }
      }
    }
  }
}`

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const keyword = new URL(request.url).searchParams.get("keyword")?.trim()
  if (!keyword) return NextResponse.json({ jobs: [] })

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
    (token) =>
      fetch("https://api.upwork.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": BROWSER_UA,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: QUERY,
          variables: {
            marketPlaceJobFilter: {
              searchExpression_eq: keyword,
              pagination_eq: { after: "0", first: 50 },
            },
            sortAttributes: [{ field: "RECENCY" }],
          },
        }),
      })
  )

  const json = await res.json().catch(() => null)

  if (!res.ok || json?.errors) {
    console.error("Upwork job search failed", res.status, JSON.stringify(json?.errors))
    return NextResponse.json({ error: "Failed to search jobs" }, { status: 502 })
  }

  const edges = json?.data?.marketplaceJobPostingsSearch?.edges ?? []
  const jobs = edges
    .filter(
      (e: any) =>
        (e.node?.job?.contractorSelection?.proposalRequirement?.screeningQuestions ?? [])
          .length > 0
    )
    .map((e: any) => ({
      id: e.node.ciphertext,
      title: e.node.title,
      description: e.node.description,
    }))

  return NextResponse.json({ jobs })
}
