"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";

export default function AiReviewSummary({ sourceId, locale, reviewCount }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function generate() {
    setPending(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/insights/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-ReviewBridge-Locale": locale },
        body: JSON.stringify({ sourceId, locale }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body) {
        setError(body?.error || t(locale, "Analiz oluşturulamadı. Lütfen tekrar deneyin.", "Could not generate the analysis. Please try again."));
        return;
      }
      setResult(body);
    } catch {
      setError(t(locale, "Bağlantı kurulamadı. Lütfen tekrar deneyin.", "Could not connect. Please try again."));
    } finally {
      setPending(false);
    }
  }

  return <section className="mt-4 rounded-xl border border-primary/20 bg-primary-light/50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="font-semibold text-foreground">{t(locale, "AI yorum özeti", "AI review summary")}</h3>
        <p className="mt-1 max-w-2xl text-xs text-muted">{t(locale, "Son bir yıldaki en fazla 60 yazılı yorum Google Gemini'ye gönderilir. E-posta, telefon ve bağlantı desenleri maskelenir; metin yine kişisel bilgi içerebilir. Google'ın ücretsiz API katmanı istekleri ürünlerini geliştirmek için kullanabilir. Yalnızca işlemeye yetkili olduğunuz yorumlarda kullanın. Sonuç otomatik analizdir ve hata içerebilir.", "Up to 60 written reviews from the last year are sent to Google Gemini. Email, phone, and URL patterns are masked, but text may still contain personal information. Google's free API tier may use requests to improve its products. Use only reviews you are authorized to process. This is an automated analysis and may contain errors.")}</p>
      </div>
      <button type="button" onClick={generate} disabled={pending || reviewCount < 3} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? t(locale, "Analiz ediliyor…", "Analyzing…") : t(locale, "Özet oluştur", "Generate summary")}
      </button>
    </div>
    {reviewCount < 3 && <p className="mt-2 text-xs text-muted">{t(locale, "Son bir yılda en az 3 yazılı yorum gerekir.", "At least 3 written reviews from the last year are required.")}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    {result && <div className="mt-4 space-y-3 border-t border-border pt-3">
      <p className="text-sm text-foreground">{result.summary}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><h4 className="text-xs font-semibold text-foreground">{t(locale, "Olumlu temalar", "Positive themes")}</h4><ul className="mt-1 list-inside list-disc text-sm text-muted">{result.positiveThemes.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>
        <div><h4 className="text-xs font-semibold text-foreground">{t(locale, "Gelişim temaları", "Improvement themes")}</h4><ul className="mt-1 list-inside list-disc text-sm text-muted">{result.improvementThemes.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>
      </div>
      <p className="text-xs text-muted">{t(locale, "Analiz edilen yorum", "Reviews analyzed")}: {result.evidenceCount}{result.caveat ? ` · ${result.caveat}` : ""}</p>
    </div>}
  </section>;
}
