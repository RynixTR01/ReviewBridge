import { test, expect } from "@playwright/test";
import { buildWidgetEmbedScript } from "../lib/widget-embed-script.js";

const token = "e2e_widget_token_12345";
const widgetId = `reviewbridge-embed-${token}`;
const htmlByLocale = {
  en: '<h2>Customer reviews</h2><div class="rb-layout-grid" role="list" aria-label="Customer reviews"><article role="listitem"><p>Friendly service in Izmir</p></article></div><a data-rb-event="cta_click" href="https://example.com/review" target="_blank" rel="noopener noreferrer">Leave a review on Google</a>',
  tr: '<h2>Müşteri yorumları</h2><div class="rb-layout-grid" role="list" aria-label="Müşteri yorumları"><article role="listitem"><p>İzmir’de güler yüzlü hizmet</p></article></div><a data-rb-event="cta_click" href="https://example.com/review" target="_blank" rel="noopener noreferrer">Google’da yorum bırak</a>',
};
const script = buildWidgetEmbedScript({
  token,
  widgetId,
  wrapperBackground: "#ffffff",
  wrapperPadding: "20px",
  textColor: "#111827",
  fontFamily: "system-ui,sans-serif",
  widgetLocale: "auto",
  htmlByLocale,
});

test("production embed script renders in Turkish on mobile and records CTA clicks", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, get: () => "tr-TR" });
  });

  await page.route(`**/api/widget/${token}`, (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript; charset=utf-8",
    body: script,
  }));
  await page.route(`**/api/widget-events/${token}`, (route) => route.fulfill({ status: 204, body: "" }));
  await page.goto("/");
  await page.evaluate((src) => {
    document.body.insertAdjacentHTML("beforeend", '<div id="reviewbridge-embed"></div>');
    const embed = document.createElement("script");
    embed.src = src;
    document.body.appendChild(embed);
  }, `/api/widget/${token}`);

  const widget = page.getByRole("region", { name: "Müşteri yorumları" });
  await expect(widget).toBeVisible();
  await expect(widget.getByText("İzmir’de güler yüzlü hizmet")).toBeVisible();
  await expect(widget.getByRole("link", { name: "Google’da yorum bırak" })).toBeVisible();

  await page.evaluate((src) => new Promise((resolve, reject) => {
    const duplicate = document.createElement("script");
    duplicate.src = src;
    duplicate.onload = resolve;
    duplicate.onerror = reject;
    document.body.appendChild(duplicate);
  }), `/api/widget/${token}`);
  await expect(page.locator(`#${widgetId}`)).toHaveCount(1);

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);

  const clickMetric = page.waitForRequest((request) =>
    request.url().includes(`/api/widget-events/${token}`)
    && request.method() === "POST"
    && request.postData()?.includes("cta_click"),
  );
  await widget.getByRole("link", { name: "Google’da yorum bırak" }).click({ noWaitAfter: true });
  await clickMetric;
});

test("embed CTA is reachable and activatable with the keyboard", async ({ page }) => {
  await page.route("**/", (route) => route.fulfill({
    status: 200,
    contentType: "text/html; charset=utf-8",
    body: "<!doctype html><html><head></head><body></body></html>",
  }));
  await page.route(`**/api/widget/${token}`, (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript; charset=utf-8",
    body: script,
  }));
  await page.route(`**/api/widget-events/${token}`, (route) => route.fulfill({ status: 204, body: "" }));
  await page.route("https://example.com/review", (route) => route.fulfill({ status: 200, body: "" }));
  await page.goto("/");
  await page.evaluate((src) => {
    document.body.insertAdjacentHTML("beforeend", '<div id="reviewbridge-embed"></div>');
    const embed = document.createElement("script");
    embed.src = src;
    document.body.appendChild(embed);
  }, `/api/widget/${token}`);

  const widget = page.getByRole("region", { name: "Customer reviews" });
  const cta = widget.getByRole("link", { name: "Leave a review on Google" });
  await expect(cta).toBeVisible();

  // Remove the homepage's controls from this test's tab order so it can check
  // that the embed itself exposes the CTA as the next keyboard stop.
  await page.evaluate((id) => {
    const widgetElement = document.getElementById(id);
    document.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach((element) => {
      if (!widgetElement?.contains(element)) element.setAttribute("tabindex", "-1");
    });
  }, widgetId);

  await page.keyboard.press("Tab");
  await expect(cta).toBeFocused();

  const clickMetric = page.waitForRequest((request) =>
    request.url().includes(`/api/widget-events/${token}`)
    && request.method() === "POST"
    && request.postData()?.includes("cta_click"),
  );
  const popupPromise = page.waitForEvent("popup");
  await page.keyboard.press("Enter");
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://example.com/review");
  await clickMetric;
  await popup.close();
});

