"use client";

import { useState, useTransition } from "react";
import { updateProfileAction, updateNotificationPreferencesAction, deleteAccountAction } from "@/app/actions/settings";
import { useLocale } from "@/app/LanguageProvider";
import { t } from "@/lib/i18n";

export function ProfileForm({ fullName, email, memberSince }) {
  const locale = useLocale();
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
        setMessage(locale === "tr" ? "Profil güncellenemedi. Lütfen yeniden deneyin." : result.error);
      } else {
        setMessage(t(locale, "Profil güncellendi!", "Profile updated successfully!"));
        setTimeout(() => setMessage(""), 3000);
      }
    });
  };

  return (
    <div className="bg-white border border-border shadow-sm rounded-2xl p-6">
      <h2 className="text-xl font-bold text-foreground mb-6">{t(locale, "Profil", "Profile")}</h2>
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">{t(locale, "Ad soyad", "Full name")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder={t(locale, "Adınız Soyadınız", "Your full name")}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">{t(locale, "E-posta", "Email")}</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted-bg text-muted cursor-not-allowed"
          />
          <p className="text-xs text-muted mt-1">{t(locale, "E-posta adresi değiştirilemez.", "Email cannot be changed.")}</p>
        </div>
        <div>
          <span className="text-sm font-semibold text-foreground">{t(locale, "Üyelik tarihi", "Member since")}</span>
          <p className="text-sm text-muted mt-1">{memberSince}</p>
        </div>
        <div className="pt-2 flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="bg-foreground text-white font-medium px-6 py-2.5 rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {isPending ? t(locale, "Kaydediliyor...", "Saving...") : t(locale, "Değişiklikleri kaydet", "Save changes")}
          </button>
          {message && (
            <span className={`text-sm font-medium ${message.includes("updated") || message.includes("güncellendi") ? "text-success" : "text-danger"}`}>
              {message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

export function NotificationPreferences({ enabled, usageLimitEnabled }) {
  const locale = useLocale();
  const [checked, setChecked] = useState(enabled);
  const [usageChecked, setUsageChecked] = useState(usageLimitEnabled);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <form className="mt-6 rounded-2xl border border-border bg-white p-6" onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData();
    if (checked) data.set("sync_failure_emails_enabled", "on");
    if (usageChecked) data.set("usage_limit_emails_enabled", "on");
    startTransition(async () => {
      try {
        const result = await updateNotificationPreferencesAction(data);
        setMessage(result?.error || t(locale, "Bildirim tercihi kaydedildi.", "Notification preference saved."));
      } catch {
        setMessage(t(locale, "Tercih kaydedilemedi.", "Could not save preference."));
      }
    });
  }}>
    <h2 className="text-xl font-bold text-foreground">{t(locale, "Bildirimler", "Notifications")}</h2>
    <label className="mt-4 flex items-start gap-3 text-sm text-foreground">
      <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="mt-1" />
      <span>{t(locale, "Kaynağımın otomatik eşitlemesi denemelerden sonra başarısız kalırsa e-posta gönder.", "Email me when my source's automatic sync still fails after retries.")}</span>
    </label>
    <label className="mt-4 flex items-start gap-3 text-sm text-foreground">
      <input type="checkbox" checked={usageChecked} onChange={(event) => setUsageChecked(event.target.checked)} className="mt-1" />
      <span>{t(locale, "Kaynak ekleme sınırına ulaştığımda e-posta gönder (en fazla 30 günde bir).", "Email me when I reach my source limit (at most once every 30 days).")}</span>
    </label>
    <p className="mt-2 text-xs text-muted">{t(locale, "Bildirimler isteğe bağlıdır. E-posta gönderimi için yapılandırılmış bir gönderici gerekir.", "Notifications are optional and require a configured email sender.")}</p>
    <button type="submit" disabled={pending} className="mt-4 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? t(locale, "Kaydediliyor…", "Saving…") : t(locale, "Tercihi kaydet", "Save preference")}</button>
    {message && <p role="status" className="mt-2 text-sm text-muted">{message}</p>}
  </form>;
}

export function DangerZone() {
  const locale = useLocale();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleDelete = () => {
    if (confirmation !== "DELETE") {
      setError(t(locale, "Onaylamak için DELETE yazın.", "Please type DELETE to confirm."));
      return;
    }
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.append("confirmation", confirmation);
      const result = await deleteAccountAction(formData);
      if (result?.error) {
        setError(locale === "tr" ? "Hesap silinemedi. Lütfen yeniden deneyin." : result.error);
      }
    });
  };

  return (
    <div className="bg-white border border-red-200 shadow-sm rounded-2xl p-6 mt-6">
      <h2 className="text-xl font-bold text-red-600 mb-2">{t(locale, "Tehlikeli işlemler", "Danger zone")}</h2>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">{t(locale, "Hesabı sil", "Delete account")}</h3>
          <p className="text-sm text-muted mt-1">
            {t(locale, "Hesabınızı ve tüm verilerinizi kalıcı olarak silin. Bu işlem geri alınamaz.", "Permanently delete your account and all data. This cannot be undone.")}
          </p>
        </div>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex-shrink-0 px-5 py-2.5 rounded-xl border-2 border-red-300 text-red-600 font-semibold hover:bg-red-50 transition-colors"
          >
            {t(locale, "Hesabı sil", "Delete account")}
          </button>
        ) : (
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <p className="text-sm font-medium text-red-600">
              {t(locale, "Onaylamak için ", "Type ")}<span className="font-bold">DELETE</span>{t(locale, " yazın:", " to confirm:")}
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
                {isPending ? t(locale, "Siliniyor...", "Deleting...") : t(locale, "Silmeyi onayla", "Confirm delete")}
              </button>
              <button
                onClick={() => { setShowConfirm(false); setConfirmation(""); setError(""); }}
                className="px-4 py-2.5 rounded-xl border border-border text-muted font-medium hover:bg-muted-bg transition-colors"
              >
                {t(locale, "Vazgeç", "Cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
