import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export class IpcManager {
  private gatewaySocketDir: string;
  private assistantSocketDir: string;
  private featureFlags: Record<string, boolean> = {};
  private signingKey: string | null = null;

  constructor(gatewaySocketDir: string, assistantSocketDir: string) {
    this.gatewaySocketDir = gatewaySocketDir;
    this.assistantSocketDir = assistantSocketDir;
  }

  async start(): Promise<void> {
    if (!fs.existsSync(this.gatewaySocketDir)) {
      fs.mkdirSync(this.gatewaySocketDir, { recursive: true });
    }
    if (!fs.existsSync(this.assistantSocketDir)) {
      fs.mkdirSync(this.assistantSocketDir, { recursive: true });
    }
  }

  stop(): void {
    // Cleanup IPC sockets
    const gatewaySock = path.join(this.gatewaySocketDir, "gateway.sock");
    const assistantSock = path.join(this.assistantSocketDir, "assistant.sock");
    try { fs.unlinkSync(gatewaySock); } catch {}
    try { fs.unlinkSync(assistantSock); } catch {}
  }

  getFeatureFlags(): Record<string, boolean> {
    return { ...this.featureFlags };
  }

  setFeatureFlag(key: string, enabled: boolean): void {
    this.featureFlags[key] = enabled;
  }

  getOrCreateSigningKey(): string {
    if (!this.signingKey) {
      this.signingKey = crypto.randomBytes(32).toString("hex");
    }
    return this.signingKey;
  }
}
