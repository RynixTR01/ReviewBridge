import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Probe the schema and runtime role, not merely database connectivity.
    // No customer values are returned or disclosed by the response.
    await queryOne(`SELECT u.id,u.auth_user_id,u.billing_status,s.id,w.id,d.identity_hash
      FROM public.users u
      LEFT JOIN public.sources s ON s.user_id=u.id
      LEFT JOIN public.widgets w ON w.user_id=u.id
      LEFT JOIN public.account_deletions d ON false
      LIMIT 0`);
    return Response.json({ status: "ok" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ status: "unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
