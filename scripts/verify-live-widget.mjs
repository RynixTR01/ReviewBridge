// Optional production smoke test. This serves only the independent host page;
// the widget script and event requests go to the real deployed application.
import { chromium } from "@playwright/test";

const token = process.env.LIVE_WIDGET_TOKEN?.trim();
const appUrl = process.env.LIVE_WIDGET_BASE_URL?.trim() || "https://review-bridge.vercel.app";
if (!token || !/^[a-zA-Z0-9_-]{20,100}$/.test(token)) {
  throw new Error("Set LIVE_WIDGET_TOKEN to an existing widget embed token.");
}
const base = new URL(appUrl);
if (base.protocol !== "https:") throw new Error("LIVE_WIDGET_BASE_URL must use HTTPS.");
const scriptUrl = new URL(`/api/widget/${encodeURIComponent(token)}`, base).href;
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height, locale] of [[1280, 800, "en-US"], [390, 844, "tr-TR"]]) {
    const context = await browser.newContext({ viewport: { width, height }, locale });
    try {
      const page = await context.newPage();
      const failures = [];
      let scriptStatus = null;
      page.on("requestfailed", request => failures.push(`${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`));
      page.on("response", response => {
        if (response.url() === scriptUrl) scriptStatus = response.status();
      });
      await page.route("https://independent-widget-audit.example/**", route => route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><h1>Independent host</h1><div id="reviewbridge-embed"></div><script src="${scriptUrl}" defer></script></body></html>`,
      }));
      await page.goto("https://independent-widget-audit.example/", { waitUntil: "domcontentloaded" });
      await page.locator("#reviewbridge-embed [role=region]").first().waitFor({ state: "visible", timeout: 20_000 });
      const result = await page.evaluate(() => ({
        regions: document.querySelectorAll("#reviewbridge-embed [role=region]").length,
        cards: document.querySelectorAll("#reviewbridge-embed article").length,
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        ctaHost: (() => {
          const href = document.querySelector('#reviewbridge-embed a[data-rb-event="cta_click"]')?.href;
          return href ? new URL(href).hostname : null;
        })(),
      }));
      console.log(JSON.stringify({ width, locale, scriptStatus, ...result, failures }));
      if (scriptStatus !== 200 || result.regions !== 1 || result.cards < 1
        || result.pageWidth > result.viewportWidth + 1 || failures.length) {
        process.exitCode = 1;
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
