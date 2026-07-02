export interface CommsResult {
  status: string;
  metadata?: Record<string, unknown>;
}

export interface CommsService {
  sendSms(input: { to: string; body: string }): Promise<CommsResult>;
  sendEmail(input: {
    to: string;
    subject: string;
    body: string;
  }): Promise<CommsResult>;
  generateCallScript(input: {
    ownerName: string;
    strategy: string;
  }): Promise<{ script: string; talkingPoints: string[] }>;
}

export class DemoCommsService implements CommsService {
  async sendSms(input: { to: string; body: string }) {
    return {
      status: "sent",
      metadata: { provider: "demo", to: input.to, demo: true },
    };
  }

  async sendEmail(input: { to: string; subject: string; body: string }) {
    return {
      status: "sent",
      metadata: {
        provider: "demo",
        to: input.to,
        subject: input.subject,
        demo: true,
      },
    };
  }

  async generateCallScript(input: { ownerName: string; strategy: string }) {
    return {
      script: `Hi, I'm calling about your property. Based on our analysis, a ${input.strategy} approach may be a good fit. Is now a good time to talk?`,
      talkingPoints: [
        `Address the owner as ${input.ownerName}`,
        "Mention you buy houses as-is",
        "Ask about timeline and motivation",
        "Offer a no-obligation cash estimate",
      ],
    };
  }
}
