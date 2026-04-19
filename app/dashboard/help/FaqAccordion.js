"use client";

import { useState } from "react";

const faqItems = [
  {
    question: "How do I find my Google Maps URL?",
    answer:
      "Go to Google Maps, search for your business, click on it, then copy the URL from your browser address bar. Paste it directly into ReviewBridge.",
  },
  {
    question: "How often are reviews synced?",
    answer:
      "Reviews are synced when you first add a source. You can manually sync anytime by clicking the \"Sync\" button on your dashboard. Automatic daily sync is coming soon.",
  },
  {
    question: "Will the widget work on any website?",
    answer:
      "Yes. The embed code works on any website that supports HTML — WordPress, Shopify, Wix, Webflow, Squarespace, or custom sites.",
  },
  {
    question: "How do I add the embed code to my website?",
    answer:
      "Copy the embed code from your dashboard, then paste it into your website's HTML where you want the reviews to appear. Most website builders have an \"HTML block\" or \"Custom code\" section.",
  },
  {
    question: "What happens if I cancel my Pro subscription?",
    answer:
      "Your account will be downgraded to the Free plan at the end of your billing period. Your data will be kept but Pro features will be disabled.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Email us at support@reviewbridge.app — we typically respond within 24 hours.",
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
