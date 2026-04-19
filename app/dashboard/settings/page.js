import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm, DangerZone } from "./SettingsClient";

export const metadata = {
  title: "Settings — ReviewBridge",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, plan, created_at")
    .eq("id", user.id)
    .single();

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted mt-1">Manage your account and preferences.</p>
      </div>

      <ProfileForm
        fullName={profile?.full_name || ""}
        email={profile?.email || user.email}
        memberSince={memberSince}
      />

      <DangerZone />
    </div>
  );
}
