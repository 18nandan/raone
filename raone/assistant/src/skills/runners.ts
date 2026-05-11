import type { ToolDefinition } from "@raoneai/service-contracts";

export interface ToolResult {
  success: boolean;
  output: unknown;
  error?: string;
}

export class SkillRunner {
  async execute(tool: ToolDefinition, input: Record<string, unknown>): Promise<ToolResult> {
    switch (tool.runner) {
      case "host":
        return this.runHost(tool, input);
      case "sandbox":
        return this.runSandbox(tool, input);
      default:
        return { success: false, output: null, error: `Unknown runner type: ${tool.runner}` };
    }
  }

  private async runHost(tool: ToolDefinition, input: Record<string, unknown>): Promise<ToolResult> {
    try {
      // Host runners execute tool implementations directly
      const handler = await this.loadHostHandler(tool.name);
      if (!handler) {
        return { success: false, output: null, error: `No handler for tool: ${tool.name}` };
      }
      const output = await handler(input);
      return { success: true, output };
    } catch (err) {
      return {
        success: false,
        output: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async runSandbox(tool: ToolDefinition, input: Record<string, unknown>): Promise<ToolResult> {
    // Sandbox runs in isolated subprocess
    const workerCode = `
      const handler = (await import("./skills/${tool.name}/index.ts")).default;
      const result = await handler(${JSON.stringify(input)});
      process.send(result);
    `;

    try {
      const worker = Bun.spawn(["bun", "-e", workerCode], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      const output = await new Response(worker.stdout).json();
      return { success: true, output };
    } catch (err) {
      return {
        success: false,
        output: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async loadHostHandler(
    toolName: string,
  ): Promise<((input: Record<string, unknown>) => Promise<unknown>) | null> {
    // Placeholder: would load from registered skill implementations
    const handlers: Record<string, (input: Record<string, unknown>) => Promise<unknown>> = {
      echo: async (input) => input,
    };
    return handlers[toolName] ?? null;
  }
}
