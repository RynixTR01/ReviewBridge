"use client";

import { useState, useTransition } from "react";
import { updateProfileAction, deleteAccountAction } from "@/app/actions/settings";

export function ProfileForm({ fullName, email, memberSince }) {
  const [name, setName] = useState(fullName || "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const handleSave = (e) => {
    e.preventDefault();
    setMessage("");
    startTransition(async () => {
      const formData = new FormData();
      formData.append("full_name", name);
      const result = await updateProfileAction(formData);
      if (result?.error) {
        setMessage(result.error);
      } else {
        setMessage("Profile updated successfully!");
        setTimeout(() => setMessage(""), 3000);
      }
    });
  };

  return (
    <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
      <h2 className="text-xl font-bold text-foreground mb-6">Profile</h2>
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder="Your full name"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted-bg text-muted cursor-not-allowed"
          />
          <p className="text-xs text-muted mt-1">Email cannot be changed.</p>
        </div>
        <div>
          <span className="text-sm font-semibold text-foreground">Member since</span>
          <p className="text-sm text-muted mt-1">{memberSince}</p>
        </div>
        <div className="pt-2 flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="bg-foreground text-white font-medium px-6 py-2.5 rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
          {message && (
            <span className={`text-sm font-medium ${message.includes("error") || message.includes("must") ? "text-danger" : "text-success"}`}>
              {message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

export function DangerZone() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleDelete = () => {
    if (confirmation !== "DELETE") {
      setError("Please type DELETE to confirm.");
      return;
    }
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.append("confirmation", confirmation);
      const result = await deleteAccountAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="bg-white border border-red-200 shadow-sm rounded-2xl p-6 mt-6">
      <h2 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h2>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">Delete Account</h3>
          <p className="text-sm text-muted mt-1">
            Permanently delete your account and all data. This cannot be undone.
          </p>
        </div>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex-shrink-0 px-5 py-2.5 rounded-xl border-2 border-red-300 text-red-600 font-semibold hover:bg-red-50 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <p className="text-sm font-medium text-red-600">
              Type <span className="font-bold">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DELETE"
              className="px-4 py-2.5 rounded-xl border border-red-300 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-red-300 transition-all"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Confirm Delete"}
              </button>
              <button
                onClick={() => { setShowConfirm(false); setConfirmation(""); setError(""); }}
                className="px-4 py-2.5 rounded-xl border border-border text-muted font-medium hover:bg-muted-bg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
