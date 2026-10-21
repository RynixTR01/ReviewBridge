import { getNeonClient } from "@/lib/db";
import { applySubscriptionState } from "@/lib/billing-state";
import {
  resolveLemonSqueezyPlan,
  verifyLemonSqueezySignature,
} from "@/lib/lemonsqueezy-webhook";
import { createLemonSqueezyWebhookHandler } from "@/app/lib/lemonsqueezy-webhook-handler";

export const POST = createLemonSqueezyWebhookHandler({
  applyState: (event) => applySubscriptionState(getNeonClient(), event),
  resolveLemonSqueezyPlan,
  verifyLemonSqueezySignature,
});
