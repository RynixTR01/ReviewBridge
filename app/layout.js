import "./globals.css";

export const metadata = {
  title: "ReviewBridge — Show Real Reviews on Your Website",
  description:
    "Connect your Google or Trustpilot reviews and embed a beautiful live widget on your website. Boost trust and conversions in minutes.",
  keywords: ["reviews", "Google reviews", "Trustpilot", "widget", "embed", "social proof"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
