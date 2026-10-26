import { test, expect } from "@playwright/test";

test("visitor can switch language and keep the choice on the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Müşteri yorumlarını/ })).toBeVisible();

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: /Show customer feedback/ })).toBeVisible();
  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  await page.getByRole("link", { name: "ReviewBridge" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /Show customer feedback/ })).toBeVisible();
});

test("landing page fits a narrow mobile viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Müşteri yorumlarını/ })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
});
