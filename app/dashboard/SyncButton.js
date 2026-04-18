"use client";

import { useState } from "react";

export default function SyncButton({ sourceId }) {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const response = await fetch(`/api/sync/${sourceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        window.location.reload();
      } else {
        alert("Sync failed. Please try again.");
      }
    } catch {
      alert("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted border border-border px-3 py-2 rounded-lg hover:bg-muted-bg hover:text-foreground transition-colors disabled:opacity-50"
    >
      <svg className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {syncing ? "Syncing..." : "Sync"}
    </button>
  );
}
