"use client";

import { useState } from "react";
import { useLocale } from "@/app/LanguageProvider";
import { t } from "@/lib/i18n";

function getFaqItems(locale) { return [
  {
    question: t(locale, "Google ve Trustpilot yorumları neden görünmüyor?", "Why are Google and Trustpilot reviews unavailable?"),
    answer: t(locale, "Bu platformların yorumlarını aktarma ve kendi widget’ımızda gösterme izinleri doğrulanana kadar özellik duraklatıldı. Önceden alınan yorumlar Neon’da korunur ancak widget ve analiz ekranlarında gösterilmez. Şu anda kendi müşterilerinizden doğrudan geri bildirim toplayabilirsiniz.", "Importing and displaying these platforms' reviews in our widget is paused until the required permissions are verified. Previously imported reviews remain in Neon but are not displayed in widgets or insights. You can collect feedback directly from your customers instead."),
  },
  {
    question: t(locale, "Doğrudan geri bildirimi nasıl toplarım?", "How do I collect direct feedback?"),
    answer: t(locale, "Panelde Doğrudan geri bildirim sayfasından bir kaynak oluşturun. Müşterilerinize form bağlantısını gönderin; yayın izni veren yorumları inceleyip onayladıktan sonra widget’ınızda gösterin.", "Create a source from the Direct feedback page in your dashboard. Share its form link with customers, then review and approve submissions that have permission to be published in your widget."),
  },
  {
    question: t(locale, "Bileşen her web sitesinde çalışır mı?", "Does the widget work on every website?"),
    answer: t(locale, "Evet. Yerleştirme kodu HTML destekleyen WordPress, Shopify, Wix, Webflow, Squarespace ve özel web sitelerinde çalışır.", "Yes. The embed code works on WordPress, Shopify, Wix, Webflow, Squarespace, and custom websites that support HTML."),
  },
  {
    question: t(locale, "Yerleştirme kodunu web siteme nasıl eklerim?", "How do I add the embed code to my site?"),
    answer: t(locale, "Panelinizdeki yerleştirme kodunu kopyalayıp yorumların görünmesini istediğiniz yere yapıştırın. Çoğu site oluşturucuda “HTML bloğu” veya “Özel kod” bölümü bulunur.", "Copy the embed code from your dashboard and paste it where you want reviews to appear. Most site builders offer an HTML block or custom code section."),
  },
  {
    question: t(locale, "Pro aboneliğimi iptal edersem ne olur?", "What happens if I cancel Pro?"),
    answer: t(locale, "Faturalandırma döneminiz bitince hesabınız Ücretsiz plana geçer. Verileriniz korunur, Pro özellikleri devre dışı kalır.", "At the end of your billing period, your account moves to the Free plan. Your data stays, but Pro features are disabled."),
  },
  {
    question: t(locale, "Destek ekibine nasıl ulaşırım?", "How do I contact support?"),
    answer: t(locale, "Yardım sayfasındaki İletişim bağlantısından destek talebi gönderebilirsiniz. Yanıtı belirttiğiniz e-posta adresine iletiriz.", "Use the Contact link on the Help page to send a support request. We reply to the email address you provide."),
  },
]; }

export default function FaqAccordion() {
  const locale = useLocale();
  const faqItems = getFaqItems(locale);
  const [openIndex, setOpenIndex] = useState(null);
  const toggle = (index) => setOpenIndex(openIndex === index ? null : index);

  return (
    <div className="space-y-3">
      {faqItems.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            id={index === 0 ? "provider-reviews" : undefined}
            className="bg-white border border-border rounded-xl overflow-hidden transition-all"
          >
            <button
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted-bg/50 transition-colors"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-foreground text-sm pr-4">{item.question}</span>
              <svg
                className={`w-5 h-5 text-muted flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
              <p className="px-5 pb-4 text-sm text-muted leading-relaxed">{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
