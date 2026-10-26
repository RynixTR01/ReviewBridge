import "./globals.css";
import { getLocale } from "@/lib/i18n-server";
import { LanguageProvider } from "./LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import { t } from "@/lib/i18n";

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: t(locale, "ReviewBridge — Müşteri Geri Bildirimini Sitenizde Gösterin", "ReviewBridge — Show Customer Feedback on Your Website"),
    description: t(locale, "Müşterilerinizden doğrudan geri bildirim toplayın ve izin verdikleri yorumları web sitenizde gösterin.", "Collect direct customer feedback and display approved reviews on your website."),
    keywords: ["customer feedback", "reviews", "widget", "embed", "social proof"],
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
