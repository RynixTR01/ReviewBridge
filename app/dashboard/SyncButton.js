"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/app/LanguageProvider";
import { t } from "@/lib/i18n";

const PROGRESS_MESSAGES = [
  { at: 0, tr: "Google bağlantısı kuruluyor...", en: "Connecting to Google..." },
  { at: 3000, tr: "Yorumlar alınıyor...", en: "Fetching reviews..." },
  { at: 6000, tr: "Neredeyse tamamlandı...", en: "Almost done..." },
  { at: 10000, tr: "İşlem normalden uzun sürüyor...", en: "This is taking longer than usual..." },
];

const TIMEOUT_MS = 30000;

export default function SyncButton({ sourceId }) {
  const locale = useLocale();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const timersRef = useRef([]);
  const router = useRouter();

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(id => {
        clearTimeout(id);
        clearInterval(id);
      });
    };
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError("");
    setSuccess(false);
    setMessage(PROGRESS_MESSAGES[0][locale]);

    // Schedule progress messages
    const timers = PROGRESS_MESSAGES.slice(1).map((msg) =>
      setTimeout(() => setMessage(msg[locale]), msg.at)
    );

    // Schedule timeout
    const timeoutTimer = setTimeout(() => {
      setSyncing(false);
      setError(t(locale, "Eşitleme zaman aşımına uğradı. Yeniden deneyin.", "Sync timed out. Please try again."));
      setMessage("");
    }, TIMEOUT_MS);

    timers.push(timeoutTimer);
    timersRef.current = timers;

    try {
      const response = await fetch(`/api/sync/${sourceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // Clear all timers since we got a response
      timers.forEach(clearTimeout);
      timersRef.current = [];

      if (response.status === 429) {
        // Rate limited — show the server's cooldown message
        const data = await response.json();
        setSyncing(false);
        setError(locale === "tr" && data.error ? data.error : t(locale, "Eşitleme için bekleme süresi dolmadı. Bir süre sonra yeniden deneyin.", "Please wait before syncing again."));
        setMessage('');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'pending') {
          setMessage(t(locale, "Arka planda eşitleniyor...", "Syncing in the background..."));
          
          const pollInterval = setInterval(async () => {
            try {
              const statusRes = await fetch(`/api/sources/${sourceId}/status`);
              if (!statusRes.ok) return; // Keep polling if minor network glitch
              
              const statusData = await statusRes.json();
              
              if (statusData.sync_status === 'done') {
                clearInterval(pollInterval);
                setSuccess(true);
                setMessage(t(locale, "Eşitleme tamamlandı!", "Sync complete!"));
                setSyncing(false);
                router.refresh();
                setTimeout(() => setSuccess(false), 3000);
              } else if (statusData.sync_status === 'error') {
                clearInterval(pollInterval);
                setSyncing(false);
                setError(locale === "tr" && statusData.last_sync_error ? statusData.last_sync_error : t(locale, "Eşitleme başarısız. Yeniden deneyin.", "Sync failed. Please try again."));
                setMessage("");
              }
            } catch (err) {
              console.error("Polling error", err);
            }
          }, 3000);
          
          // Store the interval ID so it can be cleared on unmount
          timersRef.current.push(pollInterval);

          // Max 5 minutes of polling (100 * 3000ms)
          const fallbackTimeout = setTimeout(() => {
            clearInterval(pollInterval);
            setSyncing(false);
            setError(t(locale, "Eşitleme beklenenden uzun sürüyor. Durumu görmek için sayfayı yenileyin.", "Sync is taking longer than expected. Refresh the page to check its status."));
            setMessage("");
          }, 300_000);
          timersRef.current.push(fallbackTimeout);

        } else {
          // Synchronous sync complete (Trustpilot)
          setSuccess(true);
          setMessage(t(locale, "Eşitleme tamamlandı!", "Sync complete!"));
          setSyncing(false);
          router.refresh();
          setTimeout(() => setSuccess(false), 3000);
        }
      } else {
        setSyncing(false);
        setError(t(locale, "Eşitleme başarısız. Yeniden deneyin.", "Sync failed. Please try again."));
        setMessage("");
      }
    } catch {
      timers.forEach(clearTimeout);
      timersRef.current = [];
      setSyncing(false);
      setError(t(locale, "Eşitleme başarısız. Yeniden deneyin.", "Sync failed. Please try again."));
      setMessage("");
    }
  }

  if (success) {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {t(locale, "Eşitlendi!", "Synced!")}
      </span>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="max-w-xs text-xs text-red-700">{error}</p>
        <button onClick={handleSync} className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          {t(locale, "Yeniden dene", "Retry")}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted border border-border px-3 py-2 rounded-lg hover:bg-muted-bg hover:text-foreground transition-colors disabled:opacity-70 disabled:cursor-wait"
    >
      <svg className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {syncing ? message : t(locale, "Eşitle", "Sync")}
    </button>
  );
}
