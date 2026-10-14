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
            <p>{t(locale, "Hesap oluşturduğunuzda e-posta adresinizi, adınızı ve kimlik doğrulama bilgilerinizi toplarız. Bir Google Haritalar veya Trustpilot profili bağladığınızda, bu platformlardaki yorum verilerini sizin adınıza alırız. Doğrudan geri bildirim formu kullanıldığında müşterinin adı, puanı, yorumu ve yayın izni zamanı kaydedilir; e-posta adresi istenmez.", "When you create an account, we collect your email address, name, and authentication details. When you connect a Google Maps or Trustpilot listing, we fetch review data on your behalf. A direct-feedback form stores the customer's name, rating, feedback, and consent time; it does not ask for an email address.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "2. Bilgilerinizi Nasıl Kullanıyoruz", "2. How We Use Your Information")}</h2>
            <p>{t(locale, "Bilgilerinizi şu amaçlarla kullanırız:", "We use your information to:")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t(locale, "ReviewBridge hizmetini sunmak ve sürdürmek", "Provide and maintain the ReviewBridge service")}</li>
              <li>{t(locale, "Yorumları yerleştirilebilir bileşenimizle web sitenizde göstermek", "Display reviews on your website via our embed widget")}</li>
              <li>{t(locale, "Panelde eşitleme hataları, kaynak sınırı, müşteri geri bildirimi ve anket puanları için bildirim göstermek", "Show dashboard notifications for sync failures, source limits, customer feedback, and survey scores")}</li>
              <li>{t(locale, "Ayarlar'dan açarsanız, kaynak sınırına ulaştığınızda en fazla 30 günde bir kullanım bildirimi e-postası göndermek", "If enabled in Settings, send an email when you reach your source limit, at most once every 30 days")}</li>
              <li>{t(locale, "Hizmetimizi geliştirmek ve iyileştirmek", "Improve and optimize our service")}</li>
              <li>{t(locale, "Gömülü bileşenin günlük görüntülenme ve bağlantı tıklama sayılarını, ziyaretçiyi tanımlayan bir profil oluşturmadan toplu olarak ölçmek", "Measure daily embed views and link clicks as aggregate counts without building visitor profiles")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "3. Veri Saklama ve Güvenlik", "3. Data Storage and Security")}</h2>
            <p>{t(locale, "Hesap ve uygulama verileriniz Neon Postgres'te saklanır. Bildirim geçmişi 180 günden sonra; günlük toplu bileşen ölçümleri 90 günden, anket yanıtları 365 günden eski olduğunda silinir. Bildirimlerde olay türü, ilgili işletme/anket adı ve gerekiyorsa anket puanı ya da kaynak kullanım sayısı bulunabilir; müşteri yorumunun metni bildirim kaydına eklenmez. Hız sınırı için IP ve widget anahtarından üretilen HMAC özeti en fazla yaklaşık 48 saat tutulur; ham IP saklanmaz. Kişisel bilgilerinizi üçüncü taraflara satmayız, takas etmeyiz veya kiralamayız.", "Your account and application data are stored in Neon Postgres. Notification history is deleted after 180 days; daily aggregate widget metrics after 90 days; and survey responses after 365 days. Notifications may include the event type, related business or survey title, and when relevant a survey score or source usage count; the customer's written review is not copied into the notification record. Rate limiting stores an HMAC derived from the IP and widget key for at most about 48 hours; the raw IP is not stored. We do not sell, trade, or rent your personal information to third parties.")}</p>
            <p>{t(locale, "Doğrudan gönderilen geri bildirimler işletme tarafından incelenene kadar özel kalır; onaylanan ad, puan ve yorum widget'ta yayınlanır. NPS/CSAT anketlerinde ad veya e-posta istenmez; isteğe bağlı yorumlar anket sahibinin özel panelinde görünür, herkese açık yayınlanmaz ve 365 günde silinir. İşletme geri bildirimi yayından kaldırabilir veya kaynağı silebilir. Widget'ın yüklendiği alan adı ve son görülme zamanı kurulum kontrolü için tutulur; A/B deneyi yalnızca toplu sayılar kullanır ve ziyaretçi çerezi oluşturmaz.", "Direct feedback stays private until the business reviews it; approved names, ratings, and comments appear in the widget. NPS/CSAT surveys do not ask for a name or email; optional comments appear only in the survey owner's private dashboard, are not published publicly, and are deleted after 365 days. The business can unpublish feedback or delete the source. We store the domain and last-seen time of widget loads for installation checks; A/B experiments use aggregate counts and create no visitor cookie.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "4. Üçüncü Taraf Hizmetler", "4. Third-Party Services")}</h2>
            <p>{t(locale, "Aşağıdaki üçüncü taraf hizmetleri kullanırız:", "We use the following third-party services:")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Neon</strong> — {t(locale, "Veritabanı ve kimlik doğrulama", "Database and authentication")}</li>
              <li><strong>Vercel</strong> — {t(locale, "Barındırma ve yayınlama", "Hosting and deployment")}</li>
              <li><strong>Apify</strong> — {t(locale, "Profil bağlantılarını işleme ve herkese açık yorum verilerini alma", "Processing listing URLs and retrieving publicly available review data")}</li>
              <li><strong>Resend</strong> — {t(locale, "Açık bildirim tercihiniz varsa hizmet e-postalarını iletmek", "Deliver service emails when you opt in to notifications")}</li>
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
