"use client";

import { useState, useTransition } from "react";
import { updateWidgetAction } from "@/app/actions/widget";

export default function WidgetEditor({ widget, source, reviews, planLimits }) {
  const [theme, setTheme] = useState(widget.theme);
  const [maxReviews, setMaxReviews] = useState(widget.max_reviews);
  const [showBadge, setShowBadge] = useState(widget.show_badge);
  const [isPending, startTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState("");

  const embedUrl = `https://yourdomain.com/api/widget/${widget.embed_token}`;
  
  // Real origin for local testing display could be window.location.origin but we'll use placeholder or absolute if available
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const displayEmbedUrl = `${origin}/api/widget/${widget.embed_token}`;
  const embedCode = `<script src="${displayEmbedUrl}"></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setSaveMessage("Embed code copied to clipboard!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaveMessage("");
    
    // We can use Next.js server action wrapped in transition
    startTransition(async () => {
      const formData = new FormData();
      formData.append("widgetId", widget.id);
      formData.append("theme", theme);
      formData.append("maxReviews", maxReviews);
      
      // If free plan, force badge true on server, but we also handle here
      const finalShowBadge = planLimits.canRemoveBadge ? showBadge : true;
      formData.append("showBadge", finalShowBadge.toString());

      const result = await updateWidgetAction(formData);
      if (result?.error) {
        setSaveMessage(result.error);
      } else {
        setSaveMessage("Widget settings saved successfully!");
        setTimeout(() => setSaveMessage(""), 3000);
      }
    });
  };

  // Preview colors based on theme
  const previewBg = theme === "dark" ? "#1f2937" : theme === "minimal" ? "#ffffff" : "#f3f4f6";
  const previewText = theme === "dark" ? "#f9fafb" : "#111827";
  const previewCardBg = theme === "dark" ? "#374151" : "#ffffff";
  const previewBorder = theme === "minimal" ? "none" : theme === "dark" ? "1px solid #4b5563" : "1px solid #e5e7eb";

  const displayedReviews = reviews.slice(0, maxReviews);

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-8">
      {/* Editor Column */}
      <div className="space-y-6">
        <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-6">Widget Settings</h2>
          
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Theme</label>
              <div className="grid grid-cols-3 gap-3">
                {["light", "dark", "minimal"].map((t) => {
                  const isDisabled = t !== "light" && !planLimits.canSelectTheme;
                  return (
                    <label key={t} className={`cursor-pointer ${isDisabled ? 'opacity-50' : ''}`}>
                      <input 
                        type="radio" 
                        name="theme" 
                        value={t} 
                        checked={theme === t} 
                        onChange={(e) => setTheme(e.target.value)}
                        disabled={isDisabled}
                        className="peer sr-only" 
                      />
                      <div className="rounded-xl border-2 border-border p-3 text-center hover:bg-muted-bg peer-checked:border-primary peer-checked:bg-primary-light transition-all">
                        <span className="font-medium text-sm capitalize text-foreground">{t}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
              {!planLimits.canSelectTheme && (
                <p className="text-xs text-amber-600 mt-2">Upgrade to Pro to unlock all themes.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Maximum Reviews to Show</label>
              <select 
                value={maxReviews} 
                onChange={(e) => setMaxReviews(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              >
                {[3, 5, 10, 20].map(n => {
                  const isDisabled = n > planLimits.maxReviews;
                  return (
                    <option key={n} value={n} disabled={isDisabled}>
                      {n} reviews {isDisabled ? '(Upgrade to unlock)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <label className="block text-sm font-semibold text-foreground">ReviewBridge Badge</label>
                <p className="text-xs text-muted">Show "Powered by ReviewBridge" link</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={!planLimits.canRemoveBadge ? true : showBadge} 
                  onChange={(e) => setShowBadge(e.target.checked)}
                  disabled={!planLimits.canRemoveBadge}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-muted-bg peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary opacity-90 disabled:opacity-50"></div>
              </label>
            </div>
            
            {!planLimits.canRemoveBadge && (
                <p className="text-xs text-amber-600 -mt-2">Upgrade to Pro to remove the branding badge.</p>
            )}

            <div className="pt-4 border-t border-border flex items-center justify-between">
              <button
                type="submit"
                disabled={isPending}
                className="bg-foreground text-white font-medium px-6 py-2.5 rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Settings"}
              </button>
              
              {saveMessage && (
                <span className={`text-sm ${saveMessage.includes('error') ? 'text-danger' : 'text-success'} font-medium`}>
                  {saveMessage}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Embed Code Section */}
        <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-2">Embed Code</h2>
          <p className="text-sm text-muted mb-4">Copy this script and paste it anywhere on your website where you want the reviews to appear.</p>
          
          <div className="relative group">
            <pre className="p-4 bg-muted-bg rounded-xl overflow-x-auto text-sm text-foreground/80 border border-border/50 font-mono">
              <code>{embedCode}</code>
            </pre>
            <button 
              onClick={copyToClipboard}
              className="absolute top-2 right-2 p-2 bg-white border border-border rounded-lg text-muted hover:text-foreground hover:border-primary/50 shadow-sm transition-all"
              title="Copy to clipboard"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview Box */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Live Preview</h2>
        
        <div 
          className="rounded-2xl border-4 border-border overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: previewBg, minHeight: "400px" }}
        >
          {/* Header of preview fake page */}
          <div className="h-8 bg-black/5 flex items-center px-4 gap-1.5 mb-8">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
          </div>

          <div className="px-6 pb-8">
            <div className="max-w-sm mx-auto space-y-4 mt-4">
              
              {displayedReviews.length === 0 ? (
                 <p className="text-sm opacity-50 text-center" style={{ color: previewText }}>No reviews yet.</p>
              ) : (
                displayedReviews.map((r, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 rounded-xl shadow-sm transition-all"
                    style={{ backgroundColor: previewCardBg, border: previewBorder }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {r.reviewer_name?.charAt(0).toUpperCase() || "A"}
                       </div>
                       <div>
                         <p className="font-semibold text-sm" style={{ color: previewText }}>{r.reviewer_name}</p>
                         <div className="flex gap-0.5 mt-0.5">
                           {[...Array(5)].map((_, i) => (
                             <svg key={i} className={`w-3 h-3 ${i < r.rating ? "text-amber-400" : "text-gray-300"}`} viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                             </svg>
                           ))}
                         </div>
                       </div>
                    </div>
                    <p className="text-sm opacity-80 leading-relaxed" style={{ color: previewText }}>
                      &quot;{r.body}&quot;
                    </p>
                  </div>
                ))
              )}

              {/* Badge */}
              {showBadge && (
                <div className="text-center mt-3">
                  <a href="#" className="text-[11px] opacity-60 hover:opacity-100 transition-opacity" style={{ color: previewText }}>
                    Powered by ReviewBridge
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
