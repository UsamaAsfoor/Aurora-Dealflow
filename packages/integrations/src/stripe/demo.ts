export interface StripeCheckoutResult {
  url: string;
  customerId: string;
  subscriptionId: string;
  demo?: boolean;
}

export interface StripeService {
  createCheckoutSession(input: {
    userId: string;
    planId: string;
    priceId?: string | null;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<StripeCheckoutResult>;
}

export class DemoStripeService implements StripeService {
  async createCheckoutSession(input: {
    userId: string;
    planId: string;
    priceId?: string | null;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<StripeCheckoutResult> {
    return {
      url: `/dashboard/settings/billing?upgraded=${input.planId}`,
      customerId: `demo_cus_${input.userId.slice(0, 8)}`,
      subscriptionId: `demo_sub_${Date.now()}`,
      demo: true,
    };
  }
}
