import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("username")
    .eq("user_id", user!.id)
    .single()

  const name = profile?.username ?? user?.email?.split("@")[0] ?? "there"

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-24">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Hey, {name} 👋</h1>
        <p className="text-muted-foreground max-w-sm">
          Your Colosal workspace is ready. More features are on the way — stay tuned.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border p-16 text-muted-foreground text-sm">
        Your projects will appear here
      </div>
    </div>
  )
}
