const COPY = {
  sync_failed: {
    title: { tr: "Eşitleme başarısız oldu", en: "Review sync failed" },
    body: {
      tr: (item) => `${item.source_name || "Kaynak"} için eşitleme tamamlanamadı. Mevcut yorumlarınız korunuyor.`,
      en: (item) => `The sync for ${item.source_name || "this source"} could not be completed. Your existing reviews are still available.`,
    },
    href: (item) => item.source_id ? `/dashboard#source-${item.source_id}` : "/dashboard",
  },
  source_limit: {
    title: { tr: "Kaynak sınırına ulaştınız", en: "You reached your source limit" },
    body: {
      tr: (item) => `Planınızda ${item.metadata?.sourceCount ?? "mevcut"} / ${item.metadata?.sourceLimit ?? "sınırlı"} kaynak kullanılıyor. Daha fazla kaynak için planları inceleyin.`,
      en: (item) => `Your plan is using ${item.metadata?.sourceCount ?? "the available"} / ${item.metadata?.sourceLimit ?? "limited"} sources. View plans to add more.`,
    },
    href: () => "/dashboard/upgrade",
  },
  feedback_received: {
    title: { tr: "Yeni müşteri geri bildirimi", en: "New customer feedback" },
    body: {
      tr: (item) => `${item.source_name || "İşletmeniz"} için yeni bir yanıt geldi. Yayınlamadan önce geri bildirim sayfasında inceleyin.`,
      en: (item) => `A new response arrived for ${item.source_name || "your business"}. Review it on the feedback page before publishing.`,
    },
    href: () => "/dashboard/feedback",
  },
  survey_response: {
    title: { tr: "Yeni anket yanıtı", en: "New survey response" },
    body: {
      tr: (item) => `${item.source_name || "Anketiniz"} için ${item.metadata?.score ?? "yeni"} puanlı bir yanıt geldi.`,
      en: (item) => `A response with a score of ${item.metadata?.score ?? "new"} arrived for ${item.source_name || "your survey"}.`,
    },
    href: () => "/dashboard/surveys",
  },
};

export function getNotificationPresentation(item, locale = "tr") {
  const copy = COPY[item?.type];
  if (!copy) return null;
  const language = locale === "en" ? "en" : "tr";
  return {
    title: copy.title[language],
    body: copy.body[language](item),
    href: copy.href(item),
  };
}
