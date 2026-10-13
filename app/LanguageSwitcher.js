"use client";

import { useState } from "react";
import { useLocale } from "./LanguageProvider";
import { t } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const [changing, setChanging] = useState(false);
  const [failed, setFailed] = useState(false);

  async function selectLanguage(nextLocale) {
    if (nextLocale === locale) return;
    setChanging(true);
    setFailed(false);
    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      if (!response.ok) throw new Error("Locale update failed");
      window.location.reload();
    } catch {
      setFailed(true);
      setChanging(false);
    }
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-1 rounded-full border border-border bg-white/95 px-2 py-1.5 text-xs font-semibold text-muted shadow-sm backdrop-blur"
      role="group"
      aria-label={t(locale, "Dil seçimi", "Language selection")}
    >
      <svg aria-hidden="true" className="mx-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c-2.5 2.5-3.5 5.5-3.5 9s1 6.5 3.5 9m0-18c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9" />
      </svg>
      {["tr", "en"].map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => selectLanguage(option)}
          disabled={changing}
          aria-pressed={locale === option}
          aria-label={option === "tr" ? "Türkçe" : "English"}
          className={`rounded-full px-2.5 py-1 transition-colors ${locale === option ? "bg-primary text-white" : "hover:bg-muted-bg hover:text-foreground"}`}
        >
          {option.toUpperCase()}
        </button>
      ))}
      {failed && <span role="alert" className="sr-only">{t(locale, "Dil değiştirilemedi. Yeniden deneyin.", "Could not change the language. Please try again.")}</span>}
    </div>
  );
}
