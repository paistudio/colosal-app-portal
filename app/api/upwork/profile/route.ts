import { createClient } from "@/lib/supabase/server"
import { fetchUpworkWithAuth } from "@/lib/upwork/token"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
    (token) =>
      fetch("https://www.upwork.com/api/v3/freelancers/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
  )

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch Upwork profile" }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
