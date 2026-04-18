import { createClient } from "@/lib/supabase/server";

export async function DELETE(request, { params }) {
  const { sourceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify user owns this source
  const { data: source } = await supabase
    .from("sources")
    .select("id, user_id")
    .eq("id", sourceId)
    .eq("user_id", user.id)
    .single();

  if (!source) {
    return Response.json({ error: "Source not found" }, { status: 404 });
  }

  // Delete reviews first (cascade should handle this, but be explicit)
  await supabase.from("reviews").delete().eq("source_id", sourceId);

  // Delete widgets for this source
  await supabase.from("widgets").delete().eq("source_id", sourceId);

  // Delete the source
  const { error } = await supabase.from("sources").delete().eq("id", sourceId);

  if (error) {
    console.error("Delete source error:", error);
    return Response.json({ error: "Failed to delete source" }, { status: 500 });
  }

  return Response.json({ success: true });
}
