import { billingMode, checkoutBinding, validateSubscription } from "./billing-state.js";

export class BillingError extends Error {
  constructor(code) { super(code); this.name = "BillingError"; this.code = code; }
}

export function safeBillingUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password
      || !(url.hostname === "lemonsqueezy.com" || url.hostname.endsWith(".lemonsqueezy.com"))) return null;
    return url.href;
  } catch { return null; }
}

export function createBillingApi({ env = process.env, fetchImpl = fetch } = {}) {
  async function request(path, options = {}) {
    if (!env.LEMONSQUEEZY_API_KEY || !env.LEMONSQUEEZY_STORE_ID) throw new BillingError("not_configured");
    let response;
    try {
      response = await fetchImpl(`https://api.lemonsqueezy.com/v1/${path}`, {
        method: options.method || "GET",
        headers: {
          Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
          Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json",
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
      });
    } catch { throw new BillingError("provider_unavailable"); }
    if (!response.ok) throw new BillingError(response.status === 404 ? "not_found" : "provider_unavailable");
    try { return (await response.json()).data; } catch { throw new BillingError("invalid_response"); }
  }
  function validate(data) {
    if (validateSubscription(data, env)) throw new BillingError("invalid_subscription");
    return data;
  }
  function subPath(id) {
    if (!/^\d+$/.test(String(id))) throw new BillingError("invalid_subscription");
    return `subscriptions/${id}`;
  }
  return {
    async getSubscription(id) {
      const data = validate(await request(subPath(id)));
      if (String(data.id) !== String(id)) throw new BillingError("invalid_subscription");
      return data;
    },
    async cancelSubscription(id) {
      const data = validate(await request(subPath(id), { method: "DELETE" }));
      if (String(data.id) !== String(id)
        || !["cancelled", "expired"].includes(data.attributes.status)) throw new BillingError("cancellation_unconfirmed");
      return data;
    },
    async createCheckout({ userId, email, plan, returnUrl }) {
      const variant = plan === "pro" ? env.LEMONSQUEEZY_PRO_VARIANT_ID
        : plan === "agency" ? env.LEMONSQUEEZY_AGENCY_VARIANT_ID : null;
      if (!variant || !/^\d+$/.test(variant)) throw new BillingError("not_configured");
      const mode = billingMode(env);
      const data = await request("checkouts", {
        method: "POST", body: { data: {
          type: "checkouts",
          attributes: {
            test_mode: mode === "test",
            expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
            product_options: { enabled_variants: [Number(variant)], redirect_url: returnUrl },
            checkout_data: {
              email,
              custom: { user_id: userId, binding: checkoutBinding(userId, mode, env.LEMONSQUEEZY_WEBHOOK_SECRET) },
            },
          },
          relationships: {
            store: { data: { type: "stores", id: env.LEMONSQUEEZY_STORE_ID } },
            variant: { data: { type: "variants", id: variant } },
          },
        } },
      });
      const url = safeBillingUrl(data?.attributes?.url);
      if (data?.type !== "checkouts" || data.attributes.test_mode !== (mode === "test") || !url) {
        throw new BillingError("invalid_response");
      }
      return url;
    },
  };
}
