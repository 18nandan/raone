import * as fs from "fs";
import * as path from "path";
import { CredentialVault } from "../security/vault.js";
import { GrantManager } from "../grants/manager.js";

export class CesRpcServer {
  private socketPath: string;
  private vault: CredentialVault;
  private grantManager: GrantManager;
  private server: ReturnType<typeof Bun.listen> | null = null;

  constructor(socketPath: string, vault: CredentialVault, grantManager: GrantManager) {
    this.socketPath = socketPath;
    this.vault = vault;
    this.grantManager = grantManager;
  }

  async listen(): Promise<void> {
    // Remove existing socket
    try { fs.unlinkSync(this.socketPath); } catch {}

    this.server = Bun.listen({
      path: this.socketPath,
      socket: {
        data: (socket, data) => this.handleMessage(socket, data),
      },
      unix: true,
    });

    console.log(`CES RPC server listening on ${this.socketPath}`);
  }

  stop(): void {
    this.server?.stop();
    try { fs.unlinkSync(this.socketPath); } catch {}
  }

  private async handleMessage(socket: { write: (data: string) => void }, raw: Buffer): Promise<void> {
    const lines = raw.toString().trim().split("\n");

    for (const line of lines) {
      try {
        const request = JSON.parse(line);
        const { id, method, params } = request;

        let result: unknown;
        switch (method) {
          case "make_authenticated_request":
            result = await this.makeAuthenticatedRequest(params);
            break;
          case "run_authenticated_command":
            result = await this.runAuthenticatedCommand(params);
            break;
          case "manage_secure_command_tool":
            result = await this.manageSecureCommandTool(params);
            break;
          default:
            socket.write(JSON.stringify({ id, error: `Unknown method: ${method}` }) + "\n");
            continue;
        }

        socket.write(JSON.stringify({ id, result }) + "\n");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        socket.write(JSON.stringify({ error: errorMsg }) + "\n");
      }
    }
  }

  private async makeAuthenticatedRequest(params: {
    url: string;
    method: string;
    credentialId: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<{ status: number; body: string }> {
    const credential = await this.vault.getCredential(params.credentialId);
    if (!credential) throw new Error(`Credential not found: ${params.credentialId}`);

    const grant = this.grantManager.createGrant(params.credentialId);
    if (!grant) throw new Error("Grant denied");

    const headers = { ...params.headers };
    headers["Authorization"] = `Bearer ${credential.value}`;

    const response = await fetch(params.url, {
      method: params.method,
      headers,
      body: params.body,
    });

    this.grantManager.revokeGrant(grant.id);

    return { status: response.status, body: await response.text() };
  }

  private async runAuthenticatedCommand(params: {
    command: string;
    credentialId: string;
    authAdapter: string;
    egressMode: string;
    allowedArgvPatterns: string[];
  }): Promise<{ stdout: string; stderr: string }> {
    const credential = await this.vault.getCredential(params.credentialId);
    if (!credential) throw new Error(`Credential not found: ${params.credentialId}`);

    const grant = this.grantManager.createGrant(params.credentialId);
    if (!grant) throw new Error("Grant denied");

    const env = { ...process.env } as Record<string, string>;
    if (params.authAdapter === "env_var") {
      env["CREDENTIAL_VALUE"] = credential.value;
    }

    const proc = Bun.spawn(params.command.split(" "), {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    this.grantManager.revokeGrant(grant.id);

    return { stdout, stderr };
  }

  private async manageSecureCommandTool(params: {
    action: string;
    toolName: string;
  }): Promise<{ success: boolean }> {
    console.log(`CES: ${params.action} tool '${params.toolName}'`);
    return { success: true };
  }
}
