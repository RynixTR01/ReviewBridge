"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";

export default function CopySurveyLinkButton({ url, locale }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
        {t(locale, "Anketi aç", "Open survey")}
      </a>
      <button type="button" onClick={copyLink} className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:border-primary">
        {copied ? t(locale, "Kopyalandı", "Copied") : t(locale, "Bağlantıyı kopyala", "Copy link")}
      </button>
      {failed && <span aria-live="polite" className="text-xs text-danger">{t(locale, "Bağlantı kopyalanamadı.", "Could not copy the link.")}</span>}
    </div>
  );
}
