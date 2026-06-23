import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("access_token")
    .eq("user_id", user.id)
    .single()

  if (!profile?.access_token) {
    return NextResponse.json({ error: "Upwork not connected" }, { status: 400 })
  }

  const res = await fetch("https://www.upwork.com/api/v3/freelancers/me", {
    headers: {
      Authorization: `Bearer ${profile.access_token}`,
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch Upwork profile" }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
