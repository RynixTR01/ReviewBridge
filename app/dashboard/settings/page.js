import { getCurrentUser } from "@/lib/auth/server";
import { queryOne } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProfileForm, DangerZone } from "./SettingsClient";

export const metadata = {
  title: "Settings — ReviewBridge",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await queryOne(
    "SELECT full_name, email, plan, created_at FROM public.users WHERE id = $1",
    [user.id]
  );

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
