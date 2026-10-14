import { t } from "./i18n.js";

export function buildUsageLimitEmail({ locale, count, limit, upgradeUrl }) {
  return {
    subject: t(locale, "ReviewBridge: kaynak sınırına ulaştınız", "ReviewBridge: you reached your source limit"),
    text: t(
      locale,
      `Hesabınızda ${count}/${limit} kaynak var ve mevcut planınızın kaynak sınırına ulaştınız. Kaynak eklemek için plan seçeneklerinizi inceleyin: ${upgradeUrl}\n\nBu bilgilendirme e-postasını en fazla 30 günde bir gönderiyoruz. Bildirimleri Ayarlar sayfasından kapatabilirsiniz.`,
      `Your account has ${count} of ${limit} sources and has reached its current plan limit. Review your plan options to add more sources: ${upgradeUrl}\n\nWe send this notice at most once every 30 days. You can turn it off in Settings.`,
    ),
  };
}
