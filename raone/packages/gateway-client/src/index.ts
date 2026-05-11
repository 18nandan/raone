export class GatewayClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getFeatureFlags(): Promise<Record<string, boolean>> {
    const res = await fetch(`${this.baseUrl}/v1/feature-flags`);
    if (!res.ok) throw new Error(`Failed to get feature flags: ${res.status}`);
    return res.json() as Promise<Record<string, boolean>>;
  }

  async toggleFeatureFlag(key: string, enabled: boolean): Promise<void> {
    const res = await fetch(`${this.baseUrl}/v1/feature-flags/${key}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error(`Failed to toggle feature flag: ${res.status}`);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/healthz`);
      return res.ok;
    } catch {
      return false;
    }
  }
}
