import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: `${t(locale, "Kullanım Koşulları", "Terms of Service")} — ReviewBridge`,
    description: t(locale, "ReviewBridge kullanım koşullarını okuyun.", "ReviewBridge terms of service. Read the terms and conditions for using our platform."),
  };
}

export default async function TermsPage() {
  const locale = await getLocale();
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-border bg-white/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
            <span className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">R</span>
            ReviewBridge
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{t(locale, "Kullanım Koşulları", "Terms of Service")}</h1>
        <p className="text-muted mb-10">{t(locale, "Son güncelleme: Ekim 2026", "Last updated: October 2026")}</p>

        <div className="prose-custom space-y-8 text-muted leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "1. Koşulların Kabulü", "1. Acceptance of Terms")}</h2>
            <p>{t(locale, "ReviewBridge'e erişerek veya hizmeti kullanarak bu Kullanım Koşulları'nı kabul etmiş olursunuz. Bu koşulları kabul etmiyorsanız lütfen hizmetimizi kullanmayın.", "By accessing or using ReviewBridge, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "2. Hizmetin Tanımı", "2. Description of Service")}</h2>
            <p>{t(locale, "ReviewBridge, Google Haritalar ve Trustpilot yorumlarını yerleştirilebilir bileşenlerle web sitenizde göstermenizi sağlayan bir SaaS platformudur. Herkese açık yorum verilerini alır ve özelleştirme tercihlerinize göre gösteririz.", "ReviewBridge is a SaaS platform that allows you to display Google Maps and Trustpilot reviews on your website through embeddable widgets. We fetch publicly available review data and display it according to your customization preferences.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "3. Hesap Kaydı", "3. Account Registration")}</h2>
            <p>{t(locale, "Hesap oluştururken doğru bilgi vermelisiniz. Hesap bilgilerinizin güvenliğini sağlamak ve hesabınız altında gerçekleşen tüm işlemler sizin sorumluluğunuzdadır.", "You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials and for all activities that occur under your account.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "4. Abonelik Planları", "4. Subscription Plans")}</h2>
            <p>{t(locale, "ReviewBridge Ücretsiz, Pro ve Ajans abonelik planları sunar. Her planın fiyatlandırma sayfamızda açıklanan özellik sınırları vardır. Fiyatları 30 gün önceden bildirimde bulunarak değiştirme hakkımız saklıdır.", "ReviewBridge offers Free, Pro, and Agency subscription plans. Each plan has specific feature limits as described on our pricing page. We reserve the right to modify pricing with 30 days advance notice.")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>{t(locale, "Ücretsiz Plan", "Free Plan")}</strong> — {t(locale, "1 kaynak, en fazla 10 yorum gösterimi, yalnızca açık tema", "1 source, up to 10 reviews displayed, light theme only")}</li>
              <li><strong>{t(locale, "Pro Planı (aylık 7 $)", "Pro Plan ($7/month)")}</strong> — {t(locale, "En fazla 5 kaynak, bileşen başına en fazla 20 yorum, tüm temalar, rozet kaldırma", "Up to 5 sources, up to 20 reviews shown per widget, all themes, badge removal")}</li>
              <li><strong>{t(locale, "Ajans Planı (aylık 19 $)", "Agency Plan ($19/month)")}</strong> — {t(locale, "Sınırsız kaynak, bileşen başına en fazla 20 yorum, öncelikli destek", "Unlimited sources, up to 20 reviews shown per widget, priority support")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "5. İptal ve İadeler", "5. Cancellation and Refunds")}</h2>
            <p>{t(locale, "Aboneliğinizi panelinizden istediğiniz zaman iptal edebilirsiniz. İptal sonrasında mevcut faturalandırma döneminizin sonuna kadar ücretli özelliklere erişebilirsiniz. Kısmi faturalandırma dönemleri için iade sunmuyoruz.", "You may cancel your subscription at any time from your dashboard. Upon cancellation, you will retain access to paid features until the end of your current billing period. We do not offer refunds for partial billing periods.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "6. Kabul Edilebilir Kullanım", "6. Acceptable Use")}</h2>
            <p>{t(locale, "Şunları yapmamayı kabul edersiniz:", "You agree not to:")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t(locale, "Hizmeti yasa dışı amaçlarla kullanmak", "Use the service for any unlawful purpose")}</li>
              <li>{t(locale, "Yorumları değiştirmek, uydurmak veya yanlış temsil etmek", "Manipulate, fabricate, or misrepresent reviews")}</li>
              <li>{t(locale, "Plan sınırlarını veya erişim kontrollerini aşmaya çalışmak", "Attempt to bypass plan limitations or access controls")}</li>
              <li>{t(locale, "Tersine mühendislik yapmak veya kaynak kodunu çıkarmaya çalışmak", "Reverse engineer or attempt to extract the source code")}</li>
              <li>{t(locale, "İzinsiz olarak hizmeti yeniden satmak", "Resell the service without authorization")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "7. Fikri Mülkiyet", "7. Intellectual Property")}</h2>
            <p>{t(locale, "ReviewBridge ve özgün içerikleri, özellikleri ve işlevleri ReviewBridge'e aittir ve fikri mülkiyet yasalarıyla korunur. Bileşenlerimiz aracılığıyla gösterilen yorum içerikleri ilgili yorumculara ve platformlara aittir.", "ReviewBridge and its original content, features, and functionality are owned by ReviewBridge and are protected by intellectual property laws. The review content displayed through our widgets belongs to the respective reviewers and platforms.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "8. Sorumluluğun Sınırlandırılması", "8. Limitation of Liability")}</h2>
            <p>{t(locale, "ReviewBridge herhangi bir garanti olmaksızın “olduğu gibi” sunulur. Hizmeti kullanımınızdan doğan dolaylı, arızi veya sonuç olarak ortaya çıkan zararlardan sorumlu olmayız. Toplam sorumluluğumuz, talepten önceki 12 ayda tarafınızca ödenen tutarı aşmaz.", "ReviewBridge is provided “as is” without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "9. Fesih", "9. Termination")}</h2>
            <p>{t(locale, "Bu koşulları ihlal etmeniz hâlinde hesabınızı askıya alma veya sonlandırma hakkımız saklıdır. Hesabınız sonlandırıldığında hizmeti kullanma hakkınız derhâl sona erer ve verileriniz silinebilir.", "We reserve the right to suspend or terminate your account if you violate these terms. Upon termination, your right to use the service will immediately cease and your data may be deleted.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "10. Koşullardaki Değişiklikler", "10. Changes to Terms")}</h2>
            <p>{t(locale, "Bu Kullanım Koşulları'nı zaman zaman güncelleyebiliriz. Değişikliklerden sonra hizmeti kullanmaya devam etmeniz yeni koşulları kabul ettiğiniz anlamına gelir.", "We may update these Terms of Service from time to time. Continued use of the service after changes constitutes acceptance of the new terms.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "11. İletişim", "11. Contact Us")}</h2>
            <p>{t(locale, "Bu koşullarla ilgili sorularınız için ", "If you have any questions about these terms, please contact us at ")}<a href="mailto:support@reviewbridge.app" className="text-primary hover:underline">support@reviewbridge.app</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
