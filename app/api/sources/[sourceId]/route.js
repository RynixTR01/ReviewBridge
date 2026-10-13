import { getCurrentUser } from "@/lib/auth/server";
import { query } from "@/lib/db";

export async function DELETE(request, { params }) {
  const { sourceId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Ownership is checked in the DELETE itself; foreign keys cascade related reviews/widgets.
    const deleted = await query(
      'DELETE FROM public.sources WHERE id = $1 AND user_id = $2 RETURNING id',
      [sourceId, user.id]
    );
    if (deleted.length === 0) {
      return Response.json({ error: "Source not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Delete source error:", error);
    return Response.json({ error: "Failed to delete source" }, { status: 500 });
  }

  return Response.json({ success: true });
}
