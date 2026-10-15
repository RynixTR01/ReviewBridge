import Link from "next/link";
import { createHash } from "node:crypto";
import { getCurrentUser } from "@/lib/auth/server";
import { queryOne } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { acceptBrandInvitationAction } from "@/app/actions/brands";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${t(locale, "Marka daveti", "Brand invitation")} — ReviewBridge` };
}

export default async function AcceptBrandInvitationPage({ params }) {
  const { token } = await params;
  const locale = await getLocale();
  const user = await getCurrentUser();
  if (!/^[a-f0-9]{48}$/.test(String(token || ""))) {
    return <p className="mx-auto max-w-xl rounded-xl border border-border bg-white p-6 text-sm text-muted">{t(locale, "Davet bağlantısı geçersiz.", "This invitation link is invalid.")}</p>;
  }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitation = await queryOne(
    `SELECT invitation.email, invitation.role, invitation.expires_at, brand.name AS brand_name
     FROM public.agency_brand_invitations invitation
     JOIN public.agency_brands brand ON brand.id = invitation.brand_id
     JOIN public.users owner_profile ON owner_profile.id = brand.owner_user_id AND owner_profile.plan = 'agency'
     WHERE invitation.token_hash = $1 AND invitation.accepted_at IS NULL
       AND invitation.revoked_at IS NULL AND invitation.expires_at > now()`,
    [tokenHash],
  );
  if (!invitation) {
    return <p className="mx-auto max-w-xl rounded-xl border border-border bg-white p-6 text-sm text-muted">{t(locale, "Davet süresi dolmuş veya bağlantı daha önce kullanılmış. Ajans sahibinden yeni bir bağlantı isteyin.", "This invitation has expired or was already used. Ask the agency owner for a new link.")}</p>;
  }
  const next = `/dashboard/brands/accept/${token}`;
  const emailMatches = user && user.email?.toLowerCase() === invitation.email.toLowerCase();
  return <main className="mx-auto max-w-xl rounded-2xl border border-border bg-white p-6 sm:p-8">
    <h1 className="text-2xl font-bold text-foreground">{t(locale, "Müşteri alanına davet edildiniz", "You are invited to a client space")}</h1>
    <p className="mt-2 text-sm text-muted">{invitation.brand_name} · {invitation.role === "editor" ? t(locale, "Düzenleyici erişimi", "Editor access") : invitation.role === "client" ? t(locale, "Müşteri · salt okunur erişim", "Client · read-only access") : t(locale, "Görüntüleyici erişimi", "Viewer access")}</p>
    <p className="mt-3 text-sm text-muted">{t(locale, "Davet şu e-posta adresi için oluşturuldu:", "This invitation was created for:")} <strong className="text-foreground">{invitation.email}</strong></p>
    {!user && <div className="mt-6 flex flex-wrap gap-3"><Link className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" href={`/login?next=${encodeURIComponent(next)}`}>{t(locale, "Giriş yap", "Sign in")}</Link><Link className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground" href={`/signup?next=${encodeURIComponent(next)}`}>{t(locale, "Hesap oluştur", "Create an account")}</Link></div>}
    {user && !emailMatches && <p role="alert" className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t(locale, "Giriş yaptığınız hesap davet edilen e-posta ile eşleşmiyor. Doğru hesapla giriş yapın.", "The signed-in account does not match the invited email. Sign in with the invited account.")}</p>}
    {emailMatches && <form action={acceptBrandInvitationAction.bind(null, token)} className="mt-6"><button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">{t(locale, "Daveti kabul et ve müşteri alanını aç", "Accept invitation and open client space")}</button></form>}
  </main>;
}
