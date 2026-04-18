import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function POST(request) {
  const supabase = await createClient();
  
  // Sign out the user
  await supabase.auth.signOut();

  // Redirect to login page
  return redirect("/login");
}
