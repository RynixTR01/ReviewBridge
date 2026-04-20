"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addSourceAction } from "@/app/actions/source";

export default function AddSourcePage() {
  const [state, formAction, pending] = useActionState(addSourceAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.warning && state?.sourceAdded) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-foreground inline-flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Sources
        </Link>
      </div>

      <div className="bg-white border border-border shadow-sm rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Add New Source</h1>
        <p className="text-muted mb-8">Connect your Google or Trustpilot account to start fetching reviews.</p>

        {state?.error && (
          <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{state.error}</p>
          </div>
        )}

        {state?.warning && (
          <div className="mb-6 p-4 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Source added! Reviews are still being fetched. Click Sync on your dashboard in 2-3 minutes. Redirecting...</p>
          </div>
        )}

        <form action={formAction} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">Review Platform</label>
            <div className="grid grid-cols-2 gap-4">
              <label className="cursor-pointer">
                <input type="radio" name="platform" value="google" className="peer sr-only" defaultChecked />
                <div className="rounded-xl border-2 border-border p-4 hover:bg-muted-bg peer-checked:border-primary peer-checked:bg-primary-light transition-all text-center">
                  <svg className="w-8 h-8 text-[#4285f4] mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="font-semibold text-foreground">Google</span>
                </div>
              </label>

              <label className="cursor-pointer">
                <input type="radio" name="platform" value="trustpilot" className="peer sr-only" />
                <div className="rounded-xl border-2 border-border p-4 hover:bg-muted-bg peer-checked:border-success/50 peer-checked:bg-success/10 transition-all text-center">
                  <svg className="w-8 h-8 text-green-600 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.5l-6 3 2.5-6.5-5-4 6.5-.5L12 3l2 6.5 6.5.5-5 4 2.5 6.5z" />
                  </svg>
                  <span className="font-semibold text-foreground">Trustpilot</span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="identifier" className="block text-sm font-semibold text-foreground mb-1.5">
              Place ID or URL
            </label>
            <p className="text-xs text-muted mb-2">For Google, paste your Google Maps URL. For Trustpilot, paste your Trustpilot URL or company domain (e.g. apple.com).</p>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              placeholder="Paste your Google Maps URL or Trustpilot URL / domain"
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl hover:bg-primary-hover transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {pending ? (
              <>
                <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting & Fetching Reviews...
              </>
            ) : (
              "Connect Source"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
