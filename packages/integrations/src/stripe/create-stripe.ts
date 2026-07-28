import {
  DemoStripeService,
  type StripeCheckoutResult,
  type StripeService,
} from "./demo.js";

export type { StripeCheckoutResult, StripeService };

/**
 * Live Stripe Checkout when STRIPE_SECRET_KEY is set; otherwise demo upgrade.
 */
export function createStripeService(): StripeService {
  const secret = process.env.STRIPE_SECRET_KEY;
  const appUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  if (!secret) {
    return new DemoStripeService();
  }

  return {
    async createCheckoutSession(input): Promise<StripeCheckoutResult> {
      if (!input.priceId) {
        return new DemoStripeService().createCheckoutSession(input);
      }

      const params = new URLSearchParams();
      params.set("mode", "subscription");
      params.set(
        "success_url",
        input.successUrl ??
          `${appUrl}/dashboard/settings/billing?upgraded=${input.planId}`,
      );
      params.set(
        "cancel_url",
        input.cancelUrl ?? `${appUrl}/dashboard/settings/billing?canceled=1`,
      );
      params.set("client_reference_id", input.userId);
      params.set("metadata[userId]", input.userId);
      params.set("metadata[planId]", input.planId);
      params.set("line_items[0][price]", input.priceId);
      params.set("line_items[0][quantity]", "1");

      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Stripe checkout failed: ${err.slice(0, 300)}`);
      }

      const data = (await res.json()) as {
        id: string;
        url: string | null;
        customer?: string | null;
      };

      return {
        url: data.url ?? `${appUrl}/dashboard/settings/billing`,
        customerId:
          typeof data.customer === "string"
            ? data.customer
            : `pending_${input.userId.slice(0, 8)}`,
        subscriptionId: data.id,
        demo: false,
      };
    },
  };
}
