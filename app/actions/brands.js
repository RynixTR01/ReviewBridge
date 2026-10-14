"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { query, queryOne } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const count = await queryOne("SELECT count(*)::int AS count FROM public.agency_brands WHERE owner_user_id = $1", [user.id]);
  if (count.count >= 100) return { error: t(locale, "En fazla 100 marka oluşturabilirsiniz.", "You can create up to 100 brands.") };
  await query("INSERT INTO public.agency_brands (owner_user_id, name, website_domain) VALUES ($1, $2, $3)", [user.id, name, domain]);
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

export async function addBrandMemberAction(_previousState, formData) {
  const user = await getAgencyOwner();
  const locale = await getLocale();
  if (!user) return { error: t(locale, "Bu işlem Ajans planı sahibine özeldir.", "This action is available to Agency plan owners.") };
  const brandId = String(formData.get("brandId") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "");
  if (!UUID.test(brandId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !["viewer", "editor"].includes(role)) {
    return { error: t(locale, "Geçerli bir e-posta ve rol seçin.", "Choose a valid email and role.") };
  }
  const brand = await queryOne("SELECT id FROM public.agency_brands WHERE id = $1 AND owner_user_id = $2", [brandId, user.id]);
  if (!brand) return { error: t(locale, "Marka bulunamadı.", "Brand not found.") };
  const member = await queryOne("SELECT id FROM public.users WHERE lower(email) = $1", [email]);
  if (!member || member.id === user.id) return { error: t(locale, "Bu e-postaya ait kayıtlı bir ekip hesabı bulunamadı.", "No registered team account was found for this email.") };
  const count = await queryOne("SELECT count(*)::int AS count FROM public.agency_brand_members WHERE brand_id = $1", [brandId]);
  if (count.count >= 20) return { error: t(locale, "Bu markada en fazla 20 ekip üyesi olabilir.", "A brand can have up to 20 team members.") };
  await query(
    `INSERT INTO public.agency_brand_members (brand_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (brand_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [brandId, member.id, role],
  );
  revalidatePath("/dashboard/brands");
  return { success: true };
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
