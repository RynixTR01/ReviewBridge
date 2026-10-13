import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export async function POST(request) {
  await auth.signOut();

  // Redirect to login page
  return redirect("/login");
}
