"use client";

import { useState, useTransition } from "react";
import { setWidgetReviewPreferenceAction, updateWidgetAction } from "@/app/actions/widget";
import { useLocale } from "@/app/LanguageProvider";
import { t } from "@/lib/i18n";
import { contrastRatio } from "@/lib/plans";
import { filterWidgetPreviewReviews } from "@/lib/widget-preview";

export default function WidgetEditor({ widget, source, reviews, planLimits, moderation: initialModeration }) {
  const locale = useLocale();
  const [theme, setTheme] = useState(widget.theme);
  const [maxReviews, setMaxReviews] = useState(widget.max_reviews);
  const [showBadge, setShowBadge] = useState(widget.show_badge);
  const [smartFilter, setSmartFilter] = useState(widget.smart_filter || false);
  const [showReviewButton, setShowReviewButton] = useState(widget.show_review_button || false);
  const [layout, setLayout] = useState(widget.layout || "list");
  const [floatingPreviewVisible, setFloatingPreviewVisible] = useState(true);
  const [showRatingSummary, setShowRatingSummary] = useState(widget.show_rating_summary === true);
  const [fontFamily, setFontFamily] = useState(widget.font_family || "system");
  const [cardDensity, setCardDensity] = useState(widget.card_density || "comfortable");
  const [cornerStyle, setCornerStyle] = useState(widget.corner_style || "medium");
  const [minimumRating, setMinimumRating] = useState(widget.minimum_rating || 1);
  const [sortOrder, setSortOrder] = useState(widget.sort_order || "newest");
  const [includeKeywords, setIncludeKeywords] = useState(widget.include_keywords || "");
  const [excludeKeywords, setExcludeKeywords] = useState(widget.exclude_keywords || "");
  const [dateFrom, setDateFrom] = useState(widget.date_from ? String(widget.date_from).slice(0, 10) : "");
  const [dateTo, setDateTo] = useState(widget.date_to ? String(widget.date_to).slice(0, 10) : "");
  const [widgetLocale, setWidgetLocale] = useState(widget.widget_locale || "auto");
  const [widgetTitle, setWidgetTitle] = useState(widget.widget_title || "");
  const [backgroundColor, setBackgroundColor] = useState(widget.background_color || "#ffffff");
  const [textColor, setTextColor] = useState(widget.text_color || "#111827");
  const [accentColor, setAccentColor] = useState(widget.accent_color || "#4f46e5");
  const [showReviewerAvatar, setShowReviewerAvatar] = useState(widget.show_reviewer_avatar !== false);
  const [showReviewedDate, setShowReviewedDate] = useState(widget.show_reviewed_date !== false);
  const [allowedDomains, setAllowedDomains] = useState(Array.isArray(widget.allowed_domains) ? widget.allowed_domains.join(", ") : "");
  const [moderation, setModeration] = useState(initialModeration || {});
  const [isPending, startTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState("");

  const embedUrl = `https://yourdomain.com/api/widget/${widget.embed_token}`;
  
  // Real origin for local testing display could be window.location.origin but we'll use placeholder or absolute if available
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const displayEmbedUrl = `${origin}/api/widget/${widget.embed_token}`;
  const embedCode = `<script src="${displayEmbedUrl}"></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setSaveMessage(t(locale, "Yerleştirme kodu kopyalandı!", "Embed code copied to clipboard!"));
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
      formData.append("smartFilter", (planLimits.canSelectTheme ? smartFilter : false).toString());
      formData.append("showReviewButton", showReviewButton.toString());
      formData.append("layout", layout);
      formData.append("showRatingSummary", (planLimits.canChooseLayout && showRatingSummary).toString());
      formData.append("fontFamily", fontFamily);
      formData.append("cardDensity", cardDensity);
      formData.append("cornerStyle", cornerStyle);
      formData.append("minimumRating", minimumRating.toString());
      formData.append("sortOrder", sortOrder);
      formData.append("includeKeywords", includeKeywords);
      formData.append("excludeKeywords", excludeKeywords);
      formData.append("dateFrom", dateFrom);
      formData.append("dateTo", dateTo);
      formData.append("widgetLocale", widgetLocale);
      formData.append("widgetTitle", widgetTitle);
      formData.append("backgroundColor", backgroundColor);
      formData.append("textColor", textColor);
      formData.append("accentColor", accentColor);
      formData.append("showReviewerAvatar", showReviewerAvatar.toString());
      formData.append("showReviewedDate", showReviewedDate.toString());
      formData.append("allowedDomains", allowedDomains);

      const result = await updateWidgetAction(formData);
      if (result?.error) {
        setSaveMessage(locale === "tr" ? "Bileşen ayarları kaydedilemedi." : result.error);
      } else {
        setSaveMessage(t(locale, "Bileşen ayarları kaydedildi!", "Widget settings saved successfully!"));
        setTimeout(() => setSaveMessage(""), 3000);
      }
    });
  };

  const setReviewPreference = (reviewId, state) => {
    startTransition(async () => {
      const result = await setWidgetReviewPreferenceAction({ widgetId: widget.id, reviewId, state });
      if (result?.error) {
        setSaveMessage(result.error);
      } else {
        setModeration((current) => {
          const next = { ...current };
          if (state) next[reviewId] = state;
          else delete next[reviewId];
          return next;
        });
        setSaveMessage(t(locale, "Yorum tercihi kaydedildi.", "Review preference saved."));
      }
    });
  };

  // Preview colors based on theme
  const previewBg = planLimits.canCustomizeColors ? backgroundColor : theme === "dark" ? "#1f2937" : theme === "minimal" ? "#ffffff" : "#f3f4f6";
  const previewText = planLimits.canCustomizeColors ? textColor : theme === "dark" ? "#f9fafb" : "#111827";
  const previewCardBg = theme === "dark" ? "#374151" : "#ffffff";
  const previewBorder = theme === "minimal" ? "none" : theme === "dark" ? "1px solid #4b5563" : "1px solid #e5e7eb";
  const previewLayout = planLimits.canChooseLayout ? layout : "list";
  const previewFont = fontFamily === "arial" ? "Arial, sans-serif" : fontFamily === "georgia" ? "Georgia, serif" : "system-ui, sans-serif";
  const previewPadding = cardDensity === "compact" ? 10 : 16;
  const previewRadius = { small: 6, medium: 12, large: 20 }[cornerStyle] || 12;
  const textContrastIsLow = contrastRatio(textColor, backgroundColor) < 4.5;
  const accentContrastIsLow = contrastRatio("#ffffff", accentColor) < 4.5;

  const displayedReviews = filterWidgetPreviewReviews(reviews, {
    moderation,
    minimumRating,
    canFilterRating: planLimits.canFilterRating,
    smartFilter,
    canSelectTheme: planLimits.canSelectTheme,
    dateFrom,
    dateTo,
    includeKeywords,
    excludeKeywords,
    canUseAdvancedFilters: planLimits.canUseAdvancedFilters,
    sortOrder,
    maxReviews,
  });
  const previewReviews = previewLayout === "floating" ? displayedReviews.slice(0, 1) : displayedReviews;
  const averageRating = displayedReviews.length
    ? (displayedReviews.reduce((total, review) => total + Number(review.rating || 0), 0) / displayedReviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
      {/* Editor Column */}
      <div className="min-w-0 space-y-6">
        <div className="min-w-0 bg-white border border-border shadow-sm rounded-2xl p-4 sm:p-6">
          <h2 className="text-xl font-bold text-foreground mb-6">{t(locale, "Bileşen ayarları", "Widget settings")}</h2>
          
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">{t(locale, "Tema", "Theme")}</label>
              <div className="grid grid-cols-3 gap-3">
                {["light", "dark", "minimal"].map((themeName) => {
                  const isDisabled = themeName !== "light" && !planLimits.canSelectTheme;
                  return (
                    <label key={themeName} className={`cursor-pointer ${isDisabled ? 'opacity-50' : ''}`}>
                      <input 
                        type="radio" 
                        name="theme" 
                        value={themeName}
                        checked={theme === themeName}
                        onChange={(e) => setTheme(e.target.value)}
                        disabled={isDisabled}
                        className="peer sr-only" 
                      />
                      <div className="rounded-xl border-2 border-border p-3 text-center hover:bg-muted-bg peer-checked:border-primary peer-checked:bg-primary-light transition-all">
                        <span className="font-medium text-sm capitalize text-foreground">{themeName === "light" ? t(locale, "Açık", "Light") : themeName === "dark" ? t(locale, "Koyu", "Dark") : t(locale, "Minimal", "Minimal")}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
              {!planLimits.canSelectTheme && (
                <p className="text-xs text-amber-600 mt-2">{t(locale, "Tüm temaları açmak için Pro'ya geçin.", "Upgrade to Pro to unlock all themes.")}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">{t(locale, "Gösterilecek en fazla yorum", "Maximum reviews to show")}</label>
              <select 
                value={maxReviews} 
                onChange={(e) => setMaxReviews(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              >
                {[3, 5, 10, 20].map(n => {
                  const isDisabled = n > planLimits.maxReviews;
                  return (
                    <option key={n} value={n} disabled={isDisabled}>
                      {n} {t(locale, "yorum", "reviews")} {isDisabled ? t(locale, "(Açmak için yükseltin)", "(Upgrade to unlock)") : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-4 rounded-xl border border-border p-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">{t(locale, "Görünüm düzeni", "Display layout")}</label>
                <select value={layout} onChange={(e) => { setLayout(e.target.value); setFloatingPreviewVisible(true); }} disabled={!planLimits.canChooseLayout} className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-foreground disabled:opacity-60">
                  <option value="list">{t(locale, "Liste", "List")}</option><option value="grid">{t(locale, "Izgara", "Grid")}</option><option value="carousel">{t(locale, "Yatay kaydırmalı", "Carousel")}</option><option value="masonry">{t(locale, "Dengeli kartlar", "Masonry")}</option><option value="floating">{t(locale, "Sabit yorum bandı", "Floating review banner")}</option>
                </select>
                {!planLimits.canChooseLayout && <p className="mt-1 text-xs text-amber-600">{t(locale, "Ek düzenler için Pro gerekir.", "Upgrade to Pro to unlock additional layouts.")}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-foreground">{t(locale, "Yazı tipi", "Font")}
                  <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} disabled={!planLimits.canChooseLayout} className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5 disabled:opacity-60"><option value="system">{t(locale, "Sistem", "System")}</option><option value="arial">Arial</option><option value="georgia">Georgia</option></select>
                </label>
                <label className="text-sm font-semibold text-foreground">{t(locale, "Kart aralığı", "Card spacing")}
                  <select value={cardDensity} onChange={(e) => setCardDensity(e.target.value)} disabled={!planLimits.canChooseLayout} className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5 disabled:opacity-60"><option value="compact">{t(locale, "Sıkı", "Compact")}</option><option value="comfortable">{t(locale, "Rahat", "Comfortable")}</option></select>
                </label>
                <label className="text-sm font-semibold text-foreground">{t(locale, "Kart köşeleri", "Card corners")}
                  <select value={cornerStyle} onChange={(e) => setCornerStyle(e.target.value)} disabled={!planLimits.canChooseLayout} className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5 disabled:opacity-60"><option value="small">{t(locale, "Hafif", "Subtle")}</option><option value="medium">{t(locale, "Orta", "Medium")}</option><option value="large">{t(locale, "Yuvarlak", "Rounded")}</option></select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={showRatingSummary} onChange={(e) => setShowRatingSummary(e.target.checked)} disabled={!planLimits.canChooseLayout} />{t(locale, "Ortalama puan rozetini göster", "Show average rating badge")}</label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-foreground">{t(locale, "En düşük puan", "Minimum rating")}
                  <select value={minimumRating} onChange={(e) => setMinimumRating(Number(e.target.value))} disabled={!planLimits.canFilterRating} className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5 disabled:opacity-60">{[1,2,3,4,5].map((rating) => <option key={rating} value={rating}>{rating}+ {t(locale, "yıldız", "stars")}</option>)}</select>
                </label>
                <label className="text-sm font-semibold text-foreground">{t(locale, "Sıralama", "Sort order")}
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} disabled={!planLimits.canUseAdvancedFilters} className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5 disabled:opacity-60"><option value="newest">{t(locale, "En yeni", "Newest")}</option><option value="highest">{t(locale, "En yüksek puan", "Highest rating")}</option><option value="lowest">{t(locale, "En düşük puan", "Lowest rating")}</option></select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-foreground">{t(locale, "Dahil edilecek kelimeler", "Include keywords")}
                  <input value={includeKeywords} onChange={(e) => setIncludeKeywords(e.target.value)} disabled={!planLimits.canUseAdvancedFilters} maxLength={200} placeholder={t(locale, "virgülle ayırın", "comma separated")} className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5 disabled:opacity-60" />
                </label>
                <label className="text-sm font-semibold text-foreground">{t(locale, "Hariç tutulacak kelimeler", "Exclude keywords")}
                  <input value={excludeKeywords} onChange={(e) => setExcludeKeywords(e.target.value)} disabled={!planLimits.canUseAdvancedFilters} maxLength={200} placeholder={t(locale, "virgülle ayırın", "comma separated")} className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5 disabled:opacity-60" />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-foreground">{t(locale, "Başlangıç tarihi", "Start date")}<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} disabled={!planLimits.canUseAdvancedFilters} className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5 disabled:opacity-60" /></label>
                <label className="text-sm font-semibold text-foreground">{t(locale, "Bitiş tarihi", "End date")}<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} disabled={!planLimits.canUseAdvancedFilters} className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5 disabled:opacity-60" /></label>
              </div>
              {!planLimits.canUseAdvancedFilters && <p className="text-xs text-amber-600">{t(locale, "Tarih, kelime ve puana göre sıralama filtreleri Pro planında kullanılabilir.", "Date, keyword, and rating sort filters are available on Pro.")}</p>}
            </div>

            <div className="space-y-4 rounded-xl border border-border p-4">
              <label className="block text-sm font-semibold text-foreground">{t(locale, "Bileşen başlığı", "Widget title")}
                <input value={widgetTitle} onChange={(e) => setWidgetTitle(e.target.value)} maxLength={80} placeholder={t(locale, "Müşterilerimiz ne diyor?", "What our customers say")} className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5" />
              </label>
              <label className="block text-sm font-semibold text-foreground">{t(locale, "Bileşen dili", "Widget language")}
                <select value={widgetLocale} onChange={(e) => setWidgetLocale(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5"><option value="auto">{t(locale, "Ziyaretçinin dilini kullan", "Match visitor language")}</option><option value="tr">Türkçe</option><option value="en">English</option></select>
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                {[[backgroundColor, setBackgroundColor, t(locale, "Arka plan", "Background")], [textColor, setTextColor, t(locale, "Yazı", "Text")], [accentColor, setAccentColor, t(locale, "Vurgu", "Accent")]].map(([value, setter, label]) => <label key={label} className="flex items-center justify-between gap-2 text-sm text-foreground">{label}<input aria-label={label} type="color" value={value} onChange={(e) => setter(e.target.value)} disabled={!planLimits.canCustomizeColors} className="h-10 w-12 disabled:opacity-60" /></label>)}
              </div>
              {!planLimits.canCustomizeColors && <p className="text-xs text-amber-600">{t(locale, "Özel renkler için Pro gerekir.", "Upgrade to Pro to customize colors.")}</p>}
              {planLimits.canCustomizeColors && textContrastIsLow && <p className="text-xs text-amber-700">{t(locale, "Yazı ve arka plan kontrastı düşük; kaydederken okunabilir bir renk seçilecek.", "Text contrast is low; saving will adjust it to a readable color.")}</p>}
              {planLimits.canCustomizeColors && accentContrastIsLow && <p className="text-xs text-amber-700">{t(locale, "Vurgu rengi düğme metni için düşük kontrastlı; kaydederken düzeltilir.", "The accent color has low contrast for button text and will be adjusted when saved.")}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showReviewerAvatar} onChange={(e) => setShowReviewerAvatar(e.target.checked)} />{t(locale, "Yorumcu simgesini göster", "Show reviewer avatar")}</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showReviewedDate} onChange={(e) => setShowReviewedDate(e.target.checked)} />{t(locale, "Yorum tarihini göster", "Show review date")}</label>
              </div>
              <label className="block text-sm font-semibold text-foreground">{t(locale, "İzin verilen site alan adları", "Allowed website domains")}
                <input value={allowedDomains} onChange={(e) => setAllowedDomains(e.target.value)} disabled={!planLimits.canCustomizeColors} maxLength={1000} placeholder="example.com, shop.example.com" className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2.5 disabled:opacity-60" />
                <span className="mt-1 block text-xs font-normal text-muted">{t(locale, "Boş bırakırsanız her sitede çalışır. Alan adlarını virgülle ayırın.", "Leave empty to allow any site. Separate domains with commas.")}</span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <label className="block text-sm font-semibold text-foreground">{t(locale, "ReviewBridge rozeti", "ReviewBridge badge")}</label>
                <p className="text-xs text-muted">{t(locale, "ReviewBridge tarafından desteklenir bağlantısını göster", "Show the Powered by ReviewBridge link")}</p>
              </div>
              <label className="relative inline-flex shrink-0 items-center cursor-pointer">
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
                <p className="text-xs text-amber-600 -mt-2">{t(locale, "Rozeti kaldırmak için Pro'ya geçin.", "Upgrade to Pro to remove the branding badge.")}</p>
            )}

            {/* Smart Filter */}
            <div className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-semibold text-foreground">{t(locale, "Akıllı Filtre", "Smart Filter")}</label>
                  {!planLimits.canSelectTheme && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">PRO</span>
                  )}
                </div>
                <p className="text-xs text-muted">{t(locale, "Yalnızca yıldız verilen yorumları gizleyin. Yazılı yorumları gösterin.", "Hide star-only ratings. Show only reviews with written feedback.")}</p>
              </div>
              <label className="relative inline-flex shrink-0 items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={planLimits.canSelectTheme ? smartFilter : false} 
                  onChange={(e) => setSmartFilter(e.target.checked)}
                  disabled={!planLimits.canSelectTheme}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-muted-bg peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary opacity-90 disabled:opacity-50"></div>
              </label>
            </div>
            {!planLimits.canSelectTheme && (
              <p className="text-xs text-amber-600 -mt-2">{t(locale, "Akıllı Filtre için Pro'ya geçin.", "Upgrade to Pro to use Smart Filter.")}</p>
            )}

            {/* Leave a Review Button */}
            <div className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <label className="block text-sm font-semibold text-foreground">{t(locale, "Yorum bırak düğmesi", "Leave a review button")}</label>
                <p className="text-xs text-muted">{t(locale, "Ziyaretçileri Google yorumu bırakmaya yönlendiren bir düğme ekleyin", "Add a button encouraging visitors to leave a Google review")}</p>
              </div>
              <label className="relative inline-flex shrink-0 items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showReviewButton} 
                  onChange={(e) => setShowReviewButton(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-muted-bg peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary opacity-90"></div>
              </label>
            </div>

            <div className="pt-4 border-t border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-foreground text-white font-medium px-6 py-2.5 rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  {isPending ? t(locale, "Kaydediliyor...", "Saving...") : t(locale, "Ayarları kaydet", "Save settings")}
                </button>
                <a
                  /* Preview button strictly binds to the unique embed_token */
                  href={`/preview/${widget.embed_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted border border-border px-4 py-2.5 rounded-xl hover:bg-muted-bg hover:text-foreground transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t(locale, "Önizleme", "Preview")}
                </a>
              </div>
              
              {saveMessage && (
                <span className={`text-sm ${saveMessage.includes('error') ? 'text-danger' : 'text-success'} font-medium`}>
                  {saveMessage}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Embed Code Section */}
        <div className="min-w-0 bg-white border border-border shadow-sm rounded-2xl p-4 sm:p-6">
          <h2 className="text-xl font-bold text-foreground mb-2">{t(locale, "Yerleştirme kodu", "Embed code")}</h2>
          <p className="text-sm text-muted mb-4">{t(locale, "Bu kodu kopyalayıp yorumların görünmesini istediğiniz yere yapıştırın.", "Copy this script and paste it anywhere on your website where you want the reviews to appear.")}</p>
          
          <div className="relative group">
            <pre className="max-w-full p-4 pr-12 bg-muted-bg rounded-xl overflow-x-auto text-sm text-foreground/80 border border-border/50 font-mono">
              <code>{embedCode}</code>
            </pre>
            <button 
              onClick={copyToClipboard}
              className="absolute top-2 right-2 p-2 bg-white border border-border rounded-lg text-muted hover:text-foreground hover:border-primary/50 shadow-sm transition-all"
              title={t(locale, "Panoya kopyala", "Copy to clipboard")}
              aria-label={t(locale, "Panoya kopyala", "Copy to clipboard")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview Box */}
      <div className="min-w-0 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t(locale, "Canlı önizleme", "Live preview")}</h2>
        
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

          <div className="relative min-h-[360px] px-3 pb-6 sm:px-6 sm:pb-8">
            {previewLayout === "floating" && !floatingPreviewVisible && <button type="button" onClick={() => setFloatingPreviewVisible(true)} className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-2 text-xs font-medium text-foreground shadow-lg">{t(locale, "Bandı göster", "Show banner")}</button>}
            {(previewLayout !== "floating" || floatingPreviewVisible) && <div className={`${previewLayout === "floating" ? "absolute bottom-3 right-3 max-h-[72%] overflow-y-auto rounded-2xl p-3 pt-10 shadow-xl" : `mx-auto mt-4 ${previewLayout === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : previewLayout === "carousel" ? "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3" : previewLayout === "masonry" ? "columns-1 gap-4 sm:columns-2" : "space-y-4"}`}`} style={{ maxWidth: previewLayout === "floating" ? 360 : previewLayout === "grid" || previewLayout === "masonry" ? 640 : 500, width: previewLayout === "floating" ? "min(360px, calc(100% - 24px))" : undefined, margin: previewLayout === "floating" ? 0 : undefined, fontFamily: previewFont, backgroundColor: previewLayout === "floating" ? previewBg : undefined, borderRadius: previewLayout === "floating" ? 16 : undefined, zIndex: previewLayout === "floating" ? 1 : undefined }}>
              {previewLayout === "floating" && <button type="button" onClick={() => setFloatingPreviewVisible(false)} aria-label={t(locale, "Yorum bandını kapat", "Dismiss review banner")} className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white/90 text-lg leading-none text-gray-700 shadow-sm">×</button>}
              {widgetTitle && <h3 className="text-lg font-semibold sm:col-span-2" style={{ color: previewText }}>{widgetTitle}</h3>}
              {showRatingSummary && displayedReviews.length > 0 && <div className="mb-3 flex w-fit items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800"><span aria-hidden="true">★</span><span>{averageRating}/5 · {displayedReviews.length} {t(locale, "yorum", "reviews")}</span></div>}
              
              {displayedReviews.length === 0 ? (
                 <p className="text-sm opacity-50 text-center" style={{ color: previewText }}>{t(locale, "Henüz yorum yok.", "No reviews yet.")}</p>
              ) : (
                previewReviews.map((r, idx) => (
                  <div 
                    key={idx} 
                    className={`relative transition-all ${previewLayout === "carousel" ? "min-w-[85%] snap-start sm:min-w-[70%]" : ""} ${previewLayout === "masonry" ? "mb-4 break-inside-avoid" : ""}`}
                    style={{ padding: previewPadding, borderRadius: previewRadius, backgroundColor: previewCardBg, color: previewText, border: previewBorder, boxShadow: theme === "minimal" ? "none" : undefined }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                       {showReviewerAvatar && <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: `${planLimits.canCustomizeColors ? accentColor : "#6366f1"}22`, color: planLimits.canCustomizeColors ? accentColor : "#6366f1" }}>
                          {r.reviewer_name?.charAt(0).toUpperCase() || "A"}
                       </div>}
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
                    {showReviewedDate && <p className="mt-2 text-xs opacity-60" style={{ color: previewText }}>{r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US") : ""}</p>}
                    {planLimits.canModerateReviews && <div className="mt-3 flex gap-2 border-t border-black/10 pt-2">
                      <button type="button" disabled={isPending} onClick={() => setReviewPreference(r.id, moderation[r.id] === "pinned" ? null : "pinned")} className="text-xs underline" style={{ color: planLimits.canCustomizeColors ? accentColor : "#6366f1" }}>{moderation[r.id] === "pinned" ? t(locale, "Sabitlemeyi kaldır", "Unpin") : t(locale, "Sabitle", "Pin")}</button>
                      <button type="button" disabled={isPending} onClick={() => setReviewPreference(r.id, "hidden")} className="text-xs text-red-600 underline">{t(locale, "Gizle", "Hide")}</button>
                    </div>}
                  </div>
                ))
              )}

              {planLimits.canModerateReviews && reviews.some((review) => moderation[review.id] === "hidden") && (
                <div className="space-y-2 rounded-xl border border-dashed border-border p-3 sm:col-span-2">
                  <p className="text-xs font-semibold" style={{ color: previewText }}>{t(locale, "Gizlenen yorumlar", "Hidden reviews")}</p>
                  {reviews.filter((review) => moderation[review.id] === "hidden").map((review) => <div key={review.id} className="flex items-center justify-between gap-3 text-xs" style={{ color: previewText }}><span className="truncate">{review.reviewer_name}: {(review.body || "").slice(0, 70)}</span><button type="button" onClick={() => setReviewPreference(review.id, null)} className="shrink-0 underline" style={{ color: planLimits.canCustomizeColors ? accentColor : "#6366f1" }}>{t(locale, "Geri getir", "Restore")}</button></div>)}
                </div>
              )}

              <p className="text-center text-xs opacity-60 sm:col-span-2" style={{ color: previewText }}>
                {source.platform === "google" ? "Google" : "Trustpilot"} {t(locale, "yorumları", "reviews")} · {source.business_name}
                {source.last_synced_at && <> · {t(locale, "Son güncelleme", "Last updated")}: {new Date(source.last_synced_at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}</>}
              </p>

              {/* Badge */}
              {showBadge && (
                <div className="text-center mt-3">
                  <a href="#" className="text-[11px] opacity-60 hover:opacity-100 transition-opacity" style={{ color: previewText }}>
                    {t(locale, "ReviewBridge tarafından desteklenir", "Powered by ReviewBridge")}
                  </a>
                </div>
              )}
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
}
