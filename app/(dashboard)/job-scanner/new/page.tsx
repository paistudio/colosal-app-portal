import { createClient } from "@/lib/supabase/server"
import { ScannerForm, type ScanConfig } from "../scanner-form"

export default async function NewScannerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let phone: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("phone")
      .eq("user_id", user.id)
      .single()
    phone = profile?.phone ?? null
  }

  const initial: Partial<ScanConfig> = {
    email: user?.email ?? "",
    whatsapp: phone ?? "",
  }

  return <ScannerForm initial={initial as ScanConfig} />
}
