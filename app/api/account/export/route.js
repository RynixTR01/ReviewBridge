import { getCurrentUser } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { accountExportChunks } from "@/lib/account-export";
import { isRateLimited } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (await isRateLimited(request, `account-export:${user.id}`, {
    scope: "account", failClosed: true, limit: 3, windowMs: 3600_000,
  })) return Response.json({ error: "Please try again later." }, { status: 429 });
  const iterator = accountExportChunks(query, user.id);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const next = await iterator.next();
        if (next.done) controller.close();
        else controller.enqueue(encoder.encode(next.value));
      } catch {
        console.error("Account export could not complete.");
        controller.error(new Error("Export incomplete. Please retry."));
      }
    },
    async cancel() { await iterator.return(); },
  });
  return new Response(stream, { headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": 'attachment; filename="reviewbridge-account.json"',
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
  } });
}
