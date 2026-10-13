"use client";

import { useState } from "react";

const faqItems = [
  {
    question: "Google Haritalar bağlantımı nasıl bulurum?",
    answer:
      "Search for your business in Google Maps and open its business listing. Copy the listing URL from your browser address bar; it should be a Google Maps address containing /maps/ (for example, google.com/maps/place/...). Google Search results links (google.com/search) and shortened maps.app.goo.gl links are not supported.",
  },
  {
    question: "Yorumlar ne sıklıkla eşitlenir?",
    answer:
      "Reviews start fetching when you connect a source. You can manually sync anytime by clicking the \"Sync\" button on your dashboard. Scheduled automatic syncing is not currently available.",
  },
  {
    question: "Widget her web sitesinde çalışır?",
    answer:
      "Evet. Yerleştirme kodu HTML destekleyen WordPress, Shopify, Wix, Webflow, Squarespace ve özel web sitelerinde çalışır.",
  },
  {
    question: "Yerleştirme kodunu web siteme nasıl eklerim?",
    answer:
      "Copy the embed code from your dashboard, then paste it into your website's HTML where you want the reviews to appear. Most website builders have an \"HTML block\" or \"Custom code\" section.",
  },
  {
    question: "Pro aboneliğimi iptal edersem ne olur?",
    answer:
      "Faturalandırma döneminiz bitince hesabınız Ücretsiz plana geçer. Verileriniz korunur, Pro özellikleri devre dışı kalır.",
  },
  {
    question: "Destek ekibine nasıl ulaşırım?",
    answer:
      "support@reviewbridge.app adresine e-posta gönderin; genellikle 24 saat içinde yanıt veririz.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      {faqItems.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            id={index === 0 ? "google-maps-url" : undefined}
            className="bg-white border border-border rounded-xl overflow-hidden transition-all"
          >
            <button
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted-bg/50 transition-colors"
            >
              <span className="font-semibold text-foreground text-sm pr-4">
                {item.question}
              </span>
              <svg
                className={`w-5 h-5 text-muted flex-shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <p className="px-5 pb-4 text-sm text-muted leading-relaxed">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
