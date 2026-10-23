import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import BrandMark from "@/components/BrandMark";

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
            <BrandMark size={28} className="rounded-md" />
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
            <p>{t(locale, "Hesap oluşturduğunuzda e-posta adresinizi, adınızı ve kimlik doğrulama bilgilerinizi toplarız. Bir Google Haritalar veya Trustpilot profili bağladığınızda, bu platformlardaki yorum verilerini sizin adınıza alırız. Doğrudan geri bildirim formu kullanıldığında müşterinin adı, puanı, yorumu ve yayın izni zamanı kaydedilir; e-posta adresi istenmez. Bir ajans markasına davet oluşturulursa davet edilen kişinin e-posta adresi kabul edilene veya davet süresi dolduktan sonra 30 gün geçene kadar saklanır. Anket daveti planlandığında, alıcı e-postası gönderim ve vazgeçme için gerekli süre boyunca tutulur. Teslimat doğrulandığında ham e-posta adresi silinir; sağlayıcı yanıt vermezse veya zaman aşımı olursa adres ve vazgeçme bağlantısı, yanlışlıkla tekrar göndermemek için en fazla 90 gün tutulur. Yeni davetleri engellemek için e-posta özeti hesap silinene kadar saklanır. Yorum AI özeti açıkça çalıştırılırsa son 12 aydaki en fazla 60 yorum metni, yaygın e-posta/telefon/bağlantı desenleri maskelenerek Google'ın Gemini API'sine gönderilir; yorumlar yine kişisel bilgi içerebilir. Herkese açık geri bildirim ve anket formlarında Vercel BotID Basic, tüm site isteklerinde şüpheli bot trafiğini kaydeden Vercel Bot Protection kullanılır; bu sırada tarayıcı ve ağ sinyalleri işlenebilir. Kayıt modu istekleri engellemez veya doğrulamaya zorlamaz.", "When you create an account, we collect your email address, name, and authentication details. When you connect a Google Maps or Trustpilot listing, we fetch review data on your behalf. A direct-feedback form stores the customer's name, rating, feedback, and consent time; it does not ask for an email address. If an agency brand invitation is created, the invitee's email is retained until acceptance or 30 days after expiry. When a survey invitation is scheduled, recipient email is retained as needed for delivery and opt-out. The raw email is deleted when delivery is confirmed; if the provider times out or does not confirm the request, the address and unsubscribe link are retained for up to 90 days to prevent accidental resending and allow opt-out. An email fingerprint is retained until account deletion to suppress future invitations. If an AI review summary is explicitly generated, up to 60 review texts from the past 12 months are sent to Google's Gemini API with common email, phone, and URL patterns masked; review text may still contain personal information. Browser and network signals may be processed for Vercel BotID Basic checks on public feedback and survey forms and for Vercel Bot Protection's site-wide log-only detection of suspected bot traffic. Log-only detection records matching requests without blocking or challenging them.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "2. Bilgilerinizi Nasıl Kullanıyoruz", "2. How We Use Your Information")}</h2>
            <p>{t(locale, "Bilgilerinizi şu amaçlarla kullanırız:", "We use your information to:")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>{t(locale, "ReviewBridge hizmetini sunmak ve sürdürmek", "Provide and maintain the ReviewBridge service")}</li>
              <li>{t(locale, "Yorumları yerleştirilebilir bileşenimizle web sitenizde göstermek", "Display reviews on your website via our embed widget")}</li>
              <li>{t(locale, "Panelde eşitleme hataları, kaynak sınırı, müşteri geri bildirimi ve anket puanları için bildirim göstermek", "Show dashboard notifications for sync failures, source limits, customer feedback, and survey scores")}</li>
              <li>{t(locale, "Ayarlar'dan açarsanız, kaynak sınırına ulaştığınızda en fazla 30 günde bir kullanım bildirimi e-postası göndermek", "If enabled in Settings, send an email when you reach your source limit, at most once every 30 days")}</li>
              <li>{t(locale, "Yalnızca açık rıza aldığınızı doğruladığınız alıcılara özel NPS/CSAT anket daveti göndermek ve vazgeçme tercihlerini uygulamak", "Send private NPS/CSAT survey invitations only to recipients you confirm have opted in, and honor opt-out requests")}</li>
              <li>{t(locale, "Siz açıkça çalıştırdığınızda, yorum metinlerinden temaları özetlemek için Google'ın Gemini API'sini kullanmak", "When you explicitly request it, use Google's Gemini API to summarize themes in review text")}</li>
              <li>{t(locale, "Hizmetimizi geliştirmek ve iyileştirmek", "Improve and optimize our service")}</li>
              <li>{t(locale, "Gömülü bileşenin günlük görüntülenme ve bağlantı tıklama sayılarını, ziyaretçiyi tanımlayan bir profil oluşturmadan toplu olarak ölçmek", "Measure daily embed views and link clicks as aggregate counts without building visitor profiles")}</li>
              <li>{t(locale, "Herkese açık geri bildirim ve anket formlarındaki otomatik gönderimleri belirlemek", "Detect automated submissions to public feedback and survey forms")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "3. Veri Saklama ve Güvenlik", "3. Data Storage and Security")}</h2>
            <p>{t(locale, "Hesap ve uygulama verileriniz Neon Postgres'te saklanır. Bildirim geçmişi 180 günden sonra; günlük toplu bileşen ölçümleri 90 günden, anket yanıtları 365 günden eski olduğunda silinir. Gönderilemeyen anket daveti e-postaları seçilen gönderim tarihinden 90 gün sonra silinir; gönderilen davetlerin ham e-postası gönderimden sonra kaldırılır. Vazgeçme özetleri hesap silinene kadar yeni davetleri engellemek için tutulur. Kampanya ve gönderim durum kayıtları 180 gün sonra silinir. Kabul edilen ajans davet kayıtları 180 gün; süresi dolan davetler sürenin bitmesinden 30 gün sonra silinir. AI analizinin sonucu uygulama veritabanında saklanmaz; model sağlayıcısının işleme koşulları ayrıca geçerlidir. Hız sınırı için IP ve widget anahtarından üretilen HMAC özeti en fazla yaklaşık 48 saat tutulur; ham IP saklanmaz. Kişisel bilgilerinizi satmayız.", "Your account and application data are stored in Neon Postgres. Notification history is deleted after 180 days; daily aggregate widget metrics after 90 days; and survey responses after 365 days. Undelivered survey invitation emails are deleted 90 days after the scheduled send date; raw email addresses are removed after delivery. Opt-out fingerprints are retained until account deletion to suppress future invitations. Campaign and delivery records are deleted after 180 days. Accepted agency invitations are deleted after 180 days; expired invitations 30 days after expiry. AI analysis results are not stored in the application database; the model provider's processing terms also apply. Rate limiting stores an HMAC derived from the IP and widget key for at most about 48 hours; the raw IP is not stored. We do not sell personal information.")}</p>
            <p>{t(locale, "Doğrudan gönderilen geri bildirimler işletme tarafından incelenene kadar özel kalır; onaylanan ad, puan ve yorum widget'ta yayınlanır. NPS/CSAT anketlerinde ad veya e-posta istenmez; isteğe bağlı yorumlar anket sahibinin özel panelinde görünür, herkese açık yayınlanmaz ve 365 günde silinir. İşletme geri bildirimi yayından kaldırabilir veya kaynağı silebilir. Widget'ın yüklendiği alan adı ve son görülme zamanı kurulum kontrolü için tutulur. A/B deneyi aynı tarayıcıda varyantı sabit tutmak için yalnızca widget ve deney kimliğine bağlı bir seçim değerini ziyaretçinin kendi sitesindeki localStorage alanında saklar; hesap veya siteler arası ziyaretçi profili oluşturmaz. Hedef dönüşüm olayları anonim toplu sayı olarak tutulur.", "Direct feedback stays private until the business reviews it; approved names, ratings, and comments appear in the widget. NPS/CSAT surveys do not ask for a name or email; optional comments appear only in the survey owner's private dashboard, are not published publicly, and are deleted after 365 days. The business can unpublish feedback or delete the source. We store the domain and last-seen time of widget loads for installation checks. To keep an experiment variant stable in the same browser, A/B experiments store a choice tied only to the widget and experiment in localStorage on the visitor's own site; they do not create an account or cross-site visitor profile. Goal completion events are stored as anonymous aggregate counts.")}</p>
            <p>{t(locale, "İletişim formundan gönderdiğiniz e-posta adresi, konu ve mesaj yalnızca destek yanıtı için saklanır. Hesabınızla eşleşen talepler hesap silindiğinde kaldırılır; yanıtlanmış talepler 180 gün sonra silinir. Giriş yapmadan gönderilen taleplerin silinmesini iletişim formundan isteyebilirsiniz.", "Your contact-form email, subject, and message are stored only to respond to support requests. Requests linked to your account are removed when the account is deleted; resolved requests are deleted after 180 days. You can request deletion of requests submitted without signing in through the contact form.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "4. Üçüncü Taraf Hizmetler", "4. Third-Party Services")}</h2>
            <p>{t(locale, "Aşağıdaki üçüncü taraf hizmetleri kullanırız:", "We use the following third-party services:")}</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Neon</strong> — {t(locale, "Veritabanı ve kimlik doğrulama", "Database and authentication")}</li>
              <li><strong>Vercel</strong> — {t(locale, "Barındırma, yayınlama, herkese açık geri bildirim/anket formları için BotID Basic ve tüm site isteklerinde şüpheli bot trafiğini engellemeden kaydeden Bot Protection", "Hosting, deployment, BotID Basic protection for public feedback and survey forms, and site-wide log-only detection of suspected bot traffic")}</li>
              <li><strong>Apify</strong> — {t(locale, "Profil bağlantılarını işleme ve herkese açık yorum verilerini alma", "Processing listing URLs and retrieving publicly available review data")}</li>
              <li><strong>Resend</strong> — {t(locale, "Açık bildirim tercihiyle hizmet e-postalarını ve izinli anket davetlerini iletmek", "Deliver opted-in service emails and consent-based survey invitations")}</li>
              <li><strong>Google Gemini API</strong> — {t(locale, "Siz isteyince yorum metinlerinden AI özeti oluşturmak", "Generate an AI summary from review text when you request it")}</li>
              <li><strong>LemonSqueezy</strong> — {t(locale, "Ödeme işlemleri", "Payment processing")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "5. Çerezler", "5. Cookies")}</h2>
            <p>{t(locale, "Kimlik doğrulama ve oturum yönetimi için gerekli çerezleri kullanırız. Dil tercihinizi hatırlamak için de bir çerez saklarız. Takip veya reklam çerezleri kullanmayız. Widget A/B deneyi açıksa, aynı tarayıcıda aynı varyantı göstermek için widget/deney seçim değeri ziyaretçinin kendi sitesindeki localStorage alanında saklanır. Gömülü bileşen yalnızca toplu görüntülenme, tıklama ve dönüşüm sayılarını kaydeder; analitik için ziyaretçi kimliği, çerez veya IP adresi veritabanında saklamaz.", "We use essential cookies for authentication and session management and a cookie to remember your language preference. We do not use tracking or advertising cookies. When a widget A/B experiment is enabled, the visitor's own site stores a widget/experiment choice in localStorage to keep the same variant in that browser. The embed records aggregate views, clicks, and conversions; it does not store analytics visitor identifiers, cookies, or IP addresses in the database.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "6. Haklarınız", "6. Your Rights")}</h2>
            <p>{t(locale, "Kişisel verilerinize erişebilir, bunları düzeltebilir veya silme isteğinde bulunabilirsiniz. Hesabınızı panelden sildiğinizde bağlı kaynaklar, yorumlar ve bileşenler kaldırılır. Giriş hesabının silinmesi yarıda kalırsa yeniden deneme ekranı açılır. İşlemi takip etmek ve eski kimliğin hesabı tekrar oluşturmasını engellemek için e-posta veya yorum içermeyen, kimlikten türetilmiş bir özet ve işlem tarihleri saklanır. Yedeklerdeki kopyalar ayrı saklama ve geri yükleme kurallarına tabidir.", "You can access, correct, or request deletion of your personal data. Deleting your account from the dashboard removes connected sources, reviews, and widgets. If sign-in identity deletion is interrupted, a recovery screen lets you retry. An identity-derived hash and operation timestamps, containing no email or review content, are retained to track the request and prevent the old identity from recreating the account. Backup copies are subject to separate retention and recovery procedures.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "7. Politikadaki Değişiklikler", "7. Changes to This Policy")}</h2>
            <p>{t(locale, "Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Değişiklikleri yeni politikayı bu sayfada yayımlayarak ve “Son güncelleme” tarihini değiştirerek bildiririz.", "We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the “Last updated” date.")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t(locale, "8. İletişim", "8. Contact Us")}</h2>
            <p>{t(locale, "Bu gizlilik politikasıyla ilgili sorularınız için ", "If you have any questions about this privacy policy, please contact us at ")}<Link href="/contact" className="text-primary hover:underline">{t(locale, "iletişim formunu kullanın", "use the contact form")}</Link>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
