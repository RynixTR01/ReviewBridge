"use server";

import { createHash, randomBytes } from "node:crypto";
import { getCurrentUser } from "@/lib/auth/server";
import { getNeonClient, query, queryOne } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { recipientFingerprint } from "@/lib/privacy-fingerprint";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Serializable isolation makes capacity checks safe even when two requests
// start together. Retrying uses a fresh snapshot after a concurrent change.
async function mutateBrandAtomically(sql, params) {
  const db = getNeonClient();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const [rows] = await db.transaction([db.query(sql, params)], { isolationLevel: "Serializable" });
      return rows[0] ?? null;
    } catch (error) {
      if (error?.code !== "40001" || attempt === 2) throw error;
    }
  }
}

async function getAgencyOwner() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await queryOne("SELECT plan FROM public.users WHERE id = $1", [user.id]);
  return profile?.plan === "agency" ? user : null;
}

export async function createBrandAction(_previousState, formData) {
  const user = await getAgencyOwner();
  const locale = await getLocale();
  if (!user) return { error: t(locale, "Marka yönetimi Ajans planına dahildir.", "Brand management is available on the Agency plan.") };
  const name = String(formData.get("name") || "").trim();
  const rawDomain = String(formData.get("domain") || "").trim();
  if (name.length < 2 || name.length > 100) return { error: t(locale, "Marka adı 2–100 karakter olmalı.", "Brand name must be 2–100 characters.") };
  let domain = null;
  if (rawDomain) {
    try {
      const url = new URL(rawDomain.includes("://") ? rawDomain : `https://${rawDomain}`);
      if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(url.hostname)) return { error: t(locale, "Geçerli bir alan adı girin.", "Enter a valid website domain.") };
      domain = url.hostname.toLowerCase();
    } catch { return { error: t(locale, "Geçerli bir alan adı girin.", "Enter a valid website domain.") }; }
  }
  const created = await mutateBrandAtomically(
    `WITH owner_profile AS MATERIALIZED (
       SELECT id FROM public.users WHERE id = $1 AND plan = 'agency' FOR UPDATE
     )
     INSERT INTO public.agency_brands (owner_user_id, name, website_domain)
     SELECT id, $2, $3 FROM owner_profile
     WHERE (SELECT count(*) FROM public.agency_brands WHERE owner_user_id = $1) < 100
     RETURNING id`,
    [user.id, name, domain],
  );
  if (!created) return { error: t(locale, "Marka oluşturulamadı. Ajans planınızı ve 100 marka sınırını kontrol edin.", "Brand could not be created. Check your Agency plan and the 100-brand limit.") };
  revalidatePath("/dashboard/brands");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function assignSourceBrandAction(formData) {
  const user = await getAgencyOwner();
  if (!user) return;
  const sourceId = String(formData.get("sourceId") || "");
  const brandId = String(formData.get("brandId") || "");
  if (!UUID.test(sourceId) || (brandId && !UUID.test(brandId))) return;
  await query(
    `UPDATE public.sources s SET brand_id = $1::uuid
     WHERE s.id = $2 AND s.user_id = $3
       AND ($1::uuid IS NULL OR EXISTS (
         SELECT 1 FROM public.agency_brands b WHERE b.id = $1::uuid AND b.owner_user_id = $3
       ))`,
    [brandId || null, sourceId, user.id],
  );
  revalidatePath("/dashboard/brands");
  revalidatePath("/dashboard");
}

export async function inviteBrandMemberAction(_previousState, formData) {
  const user = await getAgencyOwner();
  const locale = await getLocale();
  if (!user) return { error: t(locale, "Bu işlem Ajans planı sahibine özeldir.", "This action is available to Agency plan owners.") };
  const brandId = String(formData.get("brandId") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "client");
  if (!UUID.test(brandId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !["viewer", "editor", "client"].includes(role)) {
    return { error: t(locale, "E-posta adresini ve rolü kontrol edin.", "Check the email address and role.") };
  }
  if (user.email?.toLowerCase() === email) return { error: t(locale, "Kendi hesabınıza davet gönderemezsiniz.", "You cannot invite your own account.") };
  const rawToken = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const emailFingerprint = recipientFingerprint(brandId, email);
  const invitation = await mutateBrandAtomically(
    `WITH owned_brand AS MATERIALIZED (
       SELECT b.id FROM public.agency_brands b
       JOIN public.users owner_profile ON owner_profile.id = b.owner_user_id AND owner_profile.plan = 'agency'
       WHERE b.id = $1 AND b.owner_user_id = $6 FOR UPDATE OF b
     )
     INSERT INTO public.agency_brand_invitations (brand_id, email, email_fingerprint, role, token_hash, invited_by)
     SELECT id, $2, $3, $4, $5, $6 FROM owned_brand
     WHERE NOT EXISTS (
       SELECT 1 FROM public.agency_brand_members m JOIN public.users member_profile ON member_profile.id = m.user_id
       WHERE m.brand_id = $1 AND lower(member_profile.email) = $2
     ) AND (
       (SELECT count(*) FROM public.agency_brand_members WHERE brand_id = $1)
       + (SELECT count(*) FROM public.agency_brand_invitations WHERE brand_id = $1
           AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now() AND lower(email) <> $2)
     ) < 20
     ON CONFLICT (brand_id, lower(email)) WHERE accepted_at IS NULL AND revoked_at IS NULL
     DO UPDATE SET role = EXCLUDED.role, token_hash = EXCLUDED.token_hash,
       email_fingerprint = EXCLUDED.email_fingerprint, invited_by = EXCLUDED.invited_by,
       created_at = now(), expires_at = now() + interval '7 days'
     RETURNING id`,
    [brandId, email, emailFingerprint, role, tokenHash, user.id],
  );
  if (!invitation) return { error: t(locale, "Davet oluşturulamadı. Marka size ait olmalı, bu adres henüz üye olmamalı ve üyelerle açık davetlerin toplamı 20'yi geçmemeli.", "Invitation could not be created. You must own the brand, this email must not already be a member, and members plus open invitations must not exceed 20.") };
  revalidatePath("/dashboard/brands");
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://review-bridge.vercel.app";
  return { success: true, inviteUrl: new URL(`/join/brand/${rawToken}`, base).toString() };
}

export async function acceptBrandInvitationAction(rawToken) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/join/brand/${rawToken}`)}`);
  if (!/^[a-f0-9]{48}$/.test(String(rawToken || ""))) redirect("/dashboard/brands?invite=invalid");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const accepted = await queryOne(
    `WITH eligible AS (
       UPDATE public.agency_brand_invitations invitation
       SET accepted_at = now(), accepted_user_id = $2, email = NULL
       FROM public.agency_brands brand
       JOIN public.users owner_profile ON owner_profile.id = brand.owner_user_id AND owner_profile.plan = 'agency'
       WHERE invitation.brand_id = brand.id
         AND invitation.token_hash = $1
         AND lower(invitation.email) = lower($3)
         AND invitation.accepted_at IS NULL AND invitation.revoked_at IS NULL
         AND invitation.expires_at > now()
       RETURNING invitation.brand_id, invitation.role
     )
     INSERT INTO public.agency_brand_members (brand_id, user_id, role)
     SELECT brand_id, $2, role FROM eligible
     ON CONFLICT (brand_id, user_id) DO UPDATE SET role = EXCLUDED.role
     RETURNING brand_id`,
    [tokenHash, user.id, user.email],
  );
  if (!accepted) redirect("/dashboard/brands?invite=invalid");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/brands");
  redirect(`/dashboard/brands/${accepted.brand_id}`);
}

export async function removeBrandMemberAction(formData) {
  const user = await getAgencyOwner();
  if (!user) return;
  const brandId = String(formData.get("brandId") || "");
  const memberId = String(formData.get("memberId") || "");
  if (!UUID.test(brandId) || !UUID.test(memberId)) return;
  await query(
    `DELETE FROM public.agency_brand_members m USING public.agency_brands b
     WHERE m.brand_id = b.id AND b.id = $1 AND b.owner_user_id = $2 AND m.user_id = $3`,
    [brandId, user.id, memberId],
  );
  revalidatePath("/dashboard/brands");
  revalidatePath("/dashboard");
}

export async function revokeBrandInvitationAction(formData) {
  const user = await getAgencyOwner();
  if (!user) return;
  const brandId = String(formData.get("brandId") || "");
  const invitationId = String(formData.get("invitationId") || "");
  if (!UUID.test(brandId) || !UUID.test(invitationId)) return;
  await query(
    `UPDATE public.agency_brand_invitations invitation
     SET revoked_at = now(), email = NULL
     FROM public.agency_brands brand
     WHERE invitation.id = $1 AND invitation.brand_id = brand.id
       AND brand.id = $2 AND brand.owner_user_id = $3
       AND invitation.accepted_at IS NULL AND invitation.revoked_at IS NULL`,
    [invitationId, brandId, user.id],
  );
  revalidatePath("/dashboard/brands");
}
