import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(`${origin}/onboarding/step-2?error=no_code`)
  }

  // Exchange code for Upwork tokens
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/upwork/callback`
  const credentials = Buffer.from(
    `${process.env.UPWORK_CLIENT_ID}:${process.env.UPWORK_CLIENT_SECRET}`
  ).toString("base64")

  const tokenRes = await fetch("https://www.upwork.com/api/v3/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/onboarding/step-2?error=token_exchange_failed`)
  }

  const { access_token, refresh_token, expires_in } = await tokenRes.json()

  // Store tokens in Supabase
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  await supabase
    .from("user_profiles")
    .update({
      access_token,
      refresh_token,
      expires_at: expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null,
      last_used: new Date().toISOString(),
    })
    .eq("user_id", user.id)

  return NextResponse.redirect(`${origin}/onboarding/step-3`)
}
