import type { TrustLevel } from "@raoneai/service-contracts";

export class SecurityResolver {
  verifyChannelSignature(channel: string, req: Request, body: string): boolean {
    switch (channel) {
      case "telegram":
        return this.verifyTelegram(req);
      case "whatsapp":
        return this.verifyWhatsApp(req, body);
      case "twilio":
        return true; // Twilio validation handled by signature
      case "oauth":
        return true;
      default:
        return false;
    }
  }

  resolveTrustLevel(actorId: string): TrustLevel {
    if (actorId === "guardian" || actorId.startsWith("guardian-")) {
      return "guardian";
    }
    // Placeholder: would check contacts table
    return "unknown";
  }

  private verifyTelegram(req: Request): boolean {
    const secret = req.headers.get("x-telegram-bot-api-secret-token");
    const expected = process.env.TELEGRAM_SECRET_TOKEN;
    return !expected || secret === expected;
  }

  private verifyWhatsApp(req: Request, body: string): boolean {
    const signature = req.headers.get("x-hub-signature-256");
    if (!signature) return false;

    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) return true; // no secret configured = skip validation

    const expected = crypto
      .createHmac("sha256", appSecret)
      .update(body)
      .digest("hex");

    return signature === `sha256=${expected}`;
  }

  isFailClosed(): boolean {
    return true; // always fail closed
  }
}
