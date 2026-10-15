"use client";

import { useState } from "react";

export default function UnsubscribeButton({ token, locale }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  async function unsubscribe() {
    setPending(true);
    setError(false);
    try {
      const response = await fetch(`/api/survey-invitations/unsubscribe/${encodeURIComponent(token)}`, { method: "POST" });
      if (!response.ok) throw new Error("unsubscribe_failed");
      setDone(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return <div className="mt-5">
    {done ? <p role="status" className="text-sm text-success">{locale === "tr" ? "Bu işletmenin yeni anket davetleri durduruldu." : "Future survey invitations from this business have been stopped."}</p> : <button onClick={unsubscribe} disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? (locale === "tr" ? "İşleniyor…" : "Processing…") : (locale === "tr" ? "Davetleri durdur" : "Stop invitations")}</button>}
    {error && <p role="alert" className="mt-3 text-sm text-danger">{locale === "tr" ? "İşlem tamamlanamadı. Yeniden deneyin." : "The request could not be completed. Please try again."}</p>}
  </div>;
}
