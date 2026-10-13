"use client";

import { useState } from "react";

export default function FloatingPreviewShell({ enabled, closeLabel, restoreLabel, children }) {
  const [dismissed, setDismissed] = useState(false);
  if (!enabled) return children;

  if (dismissed) {
    return <button type="button" onClick={() => setDismissed(false)} className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-lg">{restoreLabel}</button>;
  }

  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, width: "min(380px, calc(100% - 24px))", maxHeight: "72%", overflow: "auto", zIndex: 1 }}>
      <button type="button" onClick={() => setDismissed(true)} aria-label={closeLabel} className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white/90 text-lg leading-none text-gray-700 shadow-sm">×</button>
      {children}
    </div>
  );
}
