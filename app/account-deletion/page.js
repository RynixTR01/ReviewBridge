import Link from "next/link";
import { auth } from "@/lib/auth/server";
import { getNeonClient } from "@/lib/db";
import { getAccountDeletion } from "@/lib/account-deletion";
import { retryAccountDeletionAction } from "@/app/actions/settings";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountDeletionPage() {
  const locale = await getLocale();
  const { data: session } = await auth.getSession();
  const job = await getAccountDeletion(getNeonClient(), session?.user?.id);
  if (session?.user && !job) redirect("/dashboard");
  return (
    <main className="min-h-screen bg-muted-bg px-4 py-16">
      <section className="mx-auto max-w-lg rounded-2xl border border-border bg-white p-6 space-y-5">
        <Link href="/" className="font-bold text-primary">ReviewBridge</Link>
        <h1 className="text-2xl font-bold">{t(locale, "Hesap silme işlemi", "Account deletion")}</h1>
        <p>{job
          ? t(locale, "Uygulama verileriniz silindi. Giriş hesabınızın silinmesi henüz doğrulanmadı. İsteğiniz kaydedildi ve bu kimlikle yeni bir profil oluşturulması engellendi.", "Your application data has been deleted. Removal of your sign-in identity has not yet been confirmed. Your request is recorded and this identity cannot recreate a profile.")
          : t(locale, "Giriş hesabınız silindiyse işlem tamamlanmıştır. Giriş hâlâ mümkünse, kalan adımı tamamlamak için yeniden giriş yapın.", "If your sign-in identity was deleted, the operation is complete. If you can still sign in, sign in again to finish the remaining step.")}</p>
        {job && <>
          <p className="text-sm text-muted">{t(locale, "30 saniye sonra tekrar deneyin. Yeniden doğrulama gerekiyorsa çıkış yapıp tekrar giriş yapın. Bir doğrulama e-postası gelirse içindeki işlemi tamamlayın.", "Retry after 30 seconds. If fresh authentication is required, sign out and sign in again. If you receive a verification email, complete its instructions.")}</p>
          <form action={retryAccountDeletionAction}><button className="rounded-lg bg-primary px-4 py-3 text-white">{t(locale, "Silme işlemini tamamla", "Finish deletion")}</button></form>
          <form action="/auth/signout" method="post"><button className="text-primary underline">{t(locale, "Çıkış yap ve tekrar giriş yap", "Sign out and sign in again")}</button></form>
        </>}
        {!job && <Link href="/login?next=%2Faccount-deletion" className="block text-primary underline">{t(locale, "Giriş yap", "Sign in")}</Link>}
      </section>
    </main>
  );
}
