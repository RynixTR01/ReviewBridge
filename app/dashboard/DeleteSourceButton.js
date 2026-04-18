"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteSourceButton({ sourceId }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/sources/${sourceId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to delete source. Please try again.");
      }
    } catch {
      alert("Failed to delete source. Please try again.");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-medium text-white bg-red-500 px-2.5 py-1.5 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs font-medium text-muted px-2.5 py-1.5 rounded-md hover:bg-muted-bg transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="Delete source"
      className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}
