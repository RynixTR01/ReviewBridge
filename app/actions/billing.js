"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/server";
import { queryOne } from "@/lib/db";
import { billingApi, getOrCreateCheckout, getBillingPortal, refreshSubscription } from "@/lib/billing";
import { isRateLimited } from "@/lib/rate-limit";

export async function manageSubscriptionAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (await isRateLimited({ headers: await headers() }, `billing-portal:${user.id}`, {
    scope: "account", failClosed: true, limit: 10, windowMs: 3600_000,
  })) redirect("/dashboard/upgrade?billing=busy");
  let url;
  try { url = await getBillingPortal(user.id); }
  catch { redirect("/dashboard/upgrade?billing=unavailable"); }
  redirect(url);
}

export async function refreshSubscriptionAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (await isRateLimited({ headers: await headers() }, `billing-refresh:${user.id}`, {
    scope: "account", failClosed: true, limit: 10, windowMs: 3600_000,
  })) redirect("/dashboard/upgrade?billing=busy");
  try { await refreshSubscription(user.id); }
  catch { redirect("/dashboard/upgrade?billing=unavailable"); }
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/upgrade?billing=refreshed");
}

export async function cancelSubscriptionAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (await isRateLimited({ headers: await headers() }, `billing-cancel:${user.id}`, {
    scope: "account", failClosed: true, limit: 5, windowMs: 3600_000,
  })) redirect("/dashboard/upgrade?billing=busy");
  try {
    const profile = await queryOne(
      "SELECT lemonsqueezy_subscription_id,billing_status FROM public.users WHERE id=$1", [user.id],
    );
    if (!profile?.lemonsqueezy_subscription_id || ["cancelled", "expired"].includes(profile.billing_status)) {
      throw new Error("No active subscription");
    }
    const subscription = await billingApi.getSubscription(profile.lemonsqueezy_subscription_id);
    const current = await queryOne(
      "SELECT lemonsqueezy_subscription_id FROM public.users WHERE id=$1", [user.id],
    );
    if (current?.lemonsqueezy_subscription_id !== String(subscription.id)) throw new Error("Subscription changed");
    await billingApi.cancelSubscription(subscription.id);
    await refreshSubscription(user.id);
  } catch (error) {
    redirect("/dashboard/upgrade?billing=unavailable");
  }
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/upgrade?billing=cancelled");
}

export async function startCheckoutAction(formData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const plan = formData.get("plan");
  if (!["pro", "agency"].includes(plan)) redirect("/dashboard/upgrade");
  if (await isRateLimited({ headers: await headers() }, `billing-checkout:${user.id}`, {
    scope: "account", failClosed: true, limit: 5, windowMs: 3600_000,
  })) redirect("/dashboard/upgrade?billing=busy");
  let url;
  try {
    const profile = await queryOne(
      "SELECT lemonsqueezy_subscription_id FROM public.users WHERE id=$1", [user.id],
    );
    // Confirm terminal state with the provider before allowing a replacement.
    // Active/cancelled customers manage their existing subscription instead.
    if (profile?.lemonsqueezy_subscription_id) {
      const subscription = await refreshSubscription(user.id);
      url = subscription?.attributes?.status === "expired"
        ? await getOrCreateCheckout(user, plan) : await getBillingPortal(user.id);
    } else {
      url = await getOrCreateCheckout(user, plan);
    }
  } catch (error) {
    redirect(error?.code === "checkout_pending" ? "/dashboard/upgrade?billing=pending" : "/dashboard/upgrade?billing=unavailable");
  }
  redirect(url);
}
