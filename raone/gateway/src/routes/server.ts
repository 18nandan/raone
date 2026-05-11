import { SecurityResolver } from "../security/resolver.js";
import { IpcManager } from "../ipc/manager.js";

export class GatewayHttpServer {
  private port: number;
  private daemonUrl: string;
  private securityResolver: SecurityResolver;
  private ipcManager: IpcManager;

  constructor(
    port: number,
    daemonUrl: string,
    securityResolver: SecurityResolver,
    ipcManager: IpcManager,
  ) {
    this.port = port;
    this.daemonUrl = daemonUrl;
    this.securityResolver = securityResolver;
    this.ipcManager = ipcManager;
  }

  async listen(): Promise<void> {
    Bun.serve({
      port: this.port,
      fetch: (req) => this.handleRequest(req),
    });
    console.log(`Gateway HTTP server listening on port ${this.port}`);
  }

  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;

    // CORS
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      // Health checks
      if (url.pathname === "/healthz" && method === "GET") {
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/readyz" && method === "GET") {
        return new Response(JSON.stringify({ status: "ready" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // Feature flags
      if (url.pathname === "/v1/feature-flags" && method === "GET") {
        return this.listFeatureFlags();
      }

      const flagMatch = url.pathname.match(/^\/v1\/feature-flags\/(\w+)$/);
      if (flagMatch && method === "PATCH") {
        const body = await req.json() as { enabled: boolean };
        return this.toggleFeatureFlag(flagMatch[1], body.enabled);
      }

      // Webhooks
      if (url.pathname === "/webhooks/telegram" && method === "POST") {
        return this.handleWebhook("telegram", req);
      }
      if (url.pathname === "/webhooks/whatsapp" && method === "POST") {
        return this.handleWebhook("whatsapp", req);
      }
      if (url.pathname === "/webhooks/oauth/callback" && method === "POST") {
        return this.handleWebhook("oauth", req);
      }

      // Twilio webhooks
      const twilioVoiceMatch = url.pathname.match(/^\/webhooks\/twilio\/(voice|status|connect-action|relay)$/);
      if (twilioVoiceMatch && method === "POST") {
        return this.handleWebhook("twilio", req);
      }

      // Internal endpoints
      if (url.pathname === "/internal/signing-key-bootstrap" && method === "GET") {
        return this.bootstrapSigningKey();
      }

      // Deliver endpoints (called by daemon)
      const deliverMatch = url.pathname.match(/^\/deliver\/(\w+)$/);
      if (deliverMatch && method === "POST") {
        return this.forwardToChannel(deliverMatch[1], req);
      }

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      console.error("Gateway error:", err);
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  private async listFeatureFlags(): Promise<Response> {
    const flags = this.ipcManager.getFeatureFlags();
    return new Response(JSON.stringify(flags), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async toggleFeatureFlag(key: string, enabled: boolean): Promise<Response> {
    this.ipcManager.setFeatureFlag(key, enabled);
    return new Response(JSON.stringify({ key, enabled }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleWebhook(channel: string, req: Request): Promise<Response> {
    const body = await req.text();

    // Verify channel signature
    const verified = this.securityResolver.verifyChannelSignature(channel, req, body);
    if (!verified) {
      return new Response("Forbidden", { status: 403 });
    }

    // Forward to daemon
    const daemonRes = await fetch(`${this.daemonUrl}/channels/inbound`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, body }),
    });

    if (!daemonRes.ok) {
      return new Response("Bad Gateway", { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async forwardToChannel(channel: string, req: Request): Promise<Response> {
    const body = await req.json();
    console.log(`Forwarding to channel '${channel}':`, body);
    // Placeholder: would send to actual channel API
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async bootstrapSigningKey(): Promise<Response> {
    const key = this.ipcManager.getOrCreateSigningKey();
    return new Response(JSON.stringify({ key }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
