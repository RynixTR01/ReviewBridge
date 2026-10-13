import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: `${t(locale, "Gizlilik Politikası", "Privacy Policy")} — ReviewBridge`,
    description: t(locale, "ReviewBridge gizlilik politikası. Verilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu öğrenin.", "ReviewBridge privacy policy. Learn how we collect, use, and protect your data."),
  };
}

export default async function PrivacyPage() {
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
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{t(locale, "Gizlilik Politikası", "Privacy Policy")}</h1>
        <p className="text-muted mb-10">{t(locale, "Son güncelleme: Ekim 2026", "Last updated: October 2026")}</p>

        <div className="prose-custom space-y-8 text-muted leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "1. Topladığımız Bilgiler", "1. Information We Collect")}</h2>
            <p>{t(locale, "Hesap oluşturduğunuzda e-posta adresinizi, adınızı ve kimlik doğrulama bilgilerinizi toplarız. Bir Google Haritalar veya Trustpilot profili bağladığınızda, bu platformlardaki herkese açık yorum verilerini sizin adınıza alırız.", "When you create an account, we collect your email address, name, and authentication details. When you connect a Google Maps or Trustpilot listing, we fetch publicly available review data from those platforms on your behalf.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "2. Bilgilerinizi Nasıl Kullanıyoruz", "2. How We Use Your Information")}</h2>
            <p>{t(locale, "Bilgilerinizi şu amaçlarla kullanırız:", "We use your information to:")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t(locale, "ReviewBridge hizmetini sunmak ve sürdürmek", "Provide and maintain the ReviewBridge service")}</li>
              <li>{t(locale, "Yorumları yerleştirilebilir bileşenimizle web sitenizde göstermek", "Display reviews on your website via our embed widget")}</li>
              <li>{t(locale, "Hesabınızla ilgili önemli bildirimleri göndermek", "Send important account-related notifications")}</li>
              <li>{t(locale, "Hizmetimizi geliştirmek ve iyileştirmek", "Improve and optimize our service")}</li>
              <li>{t(locale, "Gömülü bileşenin günlük görüntülenme ve bağlantı tıklama sayılarını, ziyaretçiyi tanımlayan bir profil oluşturmadan toplu olarak ölçmek", "Measure daily embed views and link clicks as aggregate counts without building visitor profiles")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "3. Veri Saklama ve Güvenlik", "3. Data Storage and Security")}</h2>
            <p>{t(locale, "Hesap ve uygulama verileriniz Neon Postgres'te saklanır. Gömülü bileşen için günlük toplu ölçüm kayıtları 90 günden eski olduğunda silinir. Kişisel bilgilerinizi üçüncü taraflara satmayız, takas etmeyiz veya kiralamayız.", "Your account and application data are stored in Neon Postgres. Daily aggregate embed metrics older than 90 days are deleted. We do not sell, trade, or rent your personal information to third parties.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "4. Üçüncü Taraf Hizmetler", "4. Third-Party Services")}</h2>
            <p>{t(locale, "Aşağıdaki üçüncü taraf hizmetleri kullanırız:", "We use the following third-party services:")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Neon</strong> — {t(locale, "Veritabanı ve kimlik doğrulama", "Database and authentication")}</li>
              <li><strong>Vercel</strong> — {t(locale, "Barındırma ve yayınlama", "Hosting and deployment")}</li>
              <li><strong>Apify</strong> — {t(locale, "Profil bağlantılarını işleme ve herkese açık yorum verilerini alma", "Processing listing URLs and retrieving publicly available review data")}</li>
              <li><strong>LemonSqueezy</strong> — {t(locale, "Ödeme işlemleri", "Payment processing")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "5. Çerezler", "5. Cookies")}</h2>
            <p>{t(locale, "Kimlik doğrulama ve oturum yönetimi için gerekli çerezleri kullanırız. Dil tercihinizi hatırlamak için de bir çerez saklarız. Takip veya reklam çerezleri kullanmayız. Gömülü bileşen yalnızca günlük görüntülenme ve tıklama toplamlarını kaydeder; analitik için ziyaretçi kimliği, çerez veya IP adresi veritabanında saklamaz.", "We use essential cookies for authentication and session management and a cookie to remember your language preference. We do not use tracking or advertising cookies. The embed records daily aggregate view and click totals; it does not store visitor identifiers, analytics cookies, or IP addresses in the database.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "6. Haklarınız", "6. Your Rights")}</h2>
            <p>{t(locale, "Kişisel verilerinize istediğiniz zaman erişme, bunları düzeltme veya silme hakkınız vardır. Hesabınızı panelden silebilirsiniz; bu işlem bağlı kaynaklar, yorumlar ve bileşenler dâhil ilişkili tüm verileri kaldırır.", "You have the right to access, correct, or delete your personal data at any time. You can delete your account from your dashboard, which will remove all associated data including connected sources, reviews, and widgets.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "7. Politikadaki Değişiklikler", "7. Changes to This Policy")}</h2>
            <p>{t(locale, "Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Değişiklikleri yeni politikayı bu sayfada yayımlayarak ve “Son güncelleme” tarihini değiştirerek bildiririz.", "We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the “Last updated” date.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "8. İletişim", "8. Contact Us")}</h2>
            <p>{t(locale, "Bu gizlilik politikasıyla ilgili sorularınız için ", "If you have any questions about this privacy policy, please contact us at ")}<a href="mailto:support@reviewbridge.app" className="text-primary hover:underline">support@reviewbridge.app</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
