import "./globals.css";
import { getLocale } from "@/lib/i18n-server";
import { LanguageProvider } from "./LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import { t } from "@/lib/i18n";

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: t(locale, "ReviewBridge — Gerçek Yorumları Sitenizde Gösterin", "ReviewBridge — Show Real Reviews on Your Website"),
    description: t(locale, "Google veya Trustpilot yorumlarınızı bağlayın ve canlı yorum bileşenini web sitenize ekleyin.", "Connect your Google or Trustpilot reviews and embed a beautiful live widget on your website. Boost trust and conversions in minutes."),
    keywords: ["reviews", "Google reviews", "Trustpilot", "widget", "embed", "social proof"],
  };
}

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <LanguageProvider locale={locale}>
          {children}
          <LanguageSwitcher />
        </LanguageProvider>
      </body>
    </html>
  );
}
