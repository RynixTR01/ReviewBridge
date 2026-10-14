import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const expectedHost = process.argv[2];
const url = process.env.DATABASE_URL;
if (!url || !expectedHost || new URL(url).hostname !== expectedHost || expectedHost.includes("pooler")) {
  throw new Error("An explicit temporary-branch direct connection is required.");
}
const sql = neon(url);
const [owner, viewer, editor, outsider] = Array.from({ length: 4 }, () => randomUUID());
const testId = randomBytes(6).toString("hex");

try {
  for (const [index, id] of [owner, viewer, editor, outsider].entries()) {
    await sql.query("INSERT INTO public.users (id, email, plan) VALUES ($1, $2, $3)", [id, `agency-check-${testId}-${index}@example.invalid`, index === 0 ? "agency" : "free"]);
  }
  const first = (await sql.query("INSERT INTO public.agency_brands (owner_user_id, name) VALUES ($1, 'Brand A') RETURNING id", [owner]))[0].id;
  const second = (await sql.query("INSERT INTO public.agency_brands (owner_user_id, name) VALUES ($1, 'Brand B') RETURNING id", [owner]))[0].id;
  for (const [brand, name] of [[first, "A"], [second, "B"]]) {
    await sql.query("INSERT INTO public.sources (user_id, brand_id, platform, place_id, business_name) VALUES ($1, $2, 'first_party', $3, $4)", [owner, brand, randomBytes(24).toString("hex"), `Brand ${name}`]);
  }
  await sql.query("INSERT INTO public.agency_brand_members (brand_id, user_id, role) VALUES ($1, $2, 'viewer'), ($1, $3, 'editor')", [first, viewer, editor]);

  async function visibleFor(actor) {
    return sql.query(`SELECT s.business_name FROM public.sources s
      LEFT JOIN public.agency_brand_members m ON m.brand_id = s.brand_id AND m.user_id = $1
      JOIN public.users owner_profile ON owner_profile.id = s.user_id
      WHERE s.user_id = $2 AND (s.user_id = $1 OR (m.user_id = $1 AND owner_profile.plan = 'agency'))
      ORDER BY s.business_name`, [actor, owner]);
  }
  const shared = await sql.query(`SELECT s.business_name, m.role FROM public.sources s
    JOIN public.agency_brand_members m ON m.brand_id = s.brand_id AND m.user_id = $1
    JOIN public.users owner_profile ON owner_profile.id = s.user_id AND owner_profile.plan = 'agency'
    WHERE s.user_id = $2 ORDER BY s.business_name`, [viewer, owner]);
  assert.deepEqual(shared.map((row) => row.business_name), ["Brand A"]);
  assert.deepEqual((await visibleFor(outsider)).map((row) => row.business_name), []);
  const editorAccess = await sql.query(`SELECT s.business_name FROM public.sources s
    JOIN public.users owner_profile ON owner_profile.id = s.user_id
    LEFT JOIN public.agency_brand_members m ON m.brand_id = s.brand_id AND m.user_id = $1
    WHERE s.user_id = $2 AND owner_profile.plan = 'agency' AND m.role = 'editor'`, [editor, owner]);
  assert.deepEqual(editorAccess.map((row) => row.business_name), ["Brand A"]);
  await sql.query("UPDATE public.users SET plan = 'free' WHERE id = $1", [owner]);
  assert.equal((await visibleFor(viewer)).length, 0);
  process.stdout.write("Agency tenant isolation and downgrade guard passed.\n");
} finally {
  await sql.query("DELETE FROM public.users WHERE id = ANY($1::uuid[])", [[owner, viewer, editor, outsider]]);
}
