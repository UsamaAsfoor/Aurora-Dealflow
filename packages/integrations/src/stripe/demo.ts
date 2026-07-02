export class DemoStripeService {
  async createCheckoutSession(input: { userId: string; planId: string }) {
    return {
      url: `/dashboard/settings/billing?upgraded=${input.planId}`,
      customerId: `demo_cus_${input.userId.slice(0, 8)}`,
      subscriptionId: `demo_sub_${Date.now()}`,
      demo: true,
    };
  }
}
