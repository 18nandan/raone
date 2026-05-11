import { CesMakeAuthRequestSchema, CesRunCommandSchema, CesManageToolSchema } from "@raoneai/service-contracts";

export class CesClient {
  private socketPath: string;

  constructor(socketPath: string) {
    this.socketPath = socketPath;
  }

  private async rpcCall(method: string, params: unknown): Promise<unknown> {
    const id = crypto.randomUUID();
    const request = JSON.stringify({ id, method, params }) + "\n";

    const socket = await Bun.connect({
      path: this.socketPath,
      socket: {
        data(socket, data) {
          const response = JSON.parse(new TextDecoder().decode(data));
          if (response.error) throw new Error(response.error);
          return response.result;
        },
      },
    });

    socket.write(request);
    return new Promise((resolve, reject) => {
      socket.data = (_, data) => {
        const response = JSON.parse(new TextDecoder().decode(data));
        if (response.error) reject(new Error(response.error));
        else resolve(response.result);
        socket.destroy();
      };
    });
  }

  async makeAuthenticatedRequest(params: z.infer<typeof CesMakeAuthRequestSchema>): Promise<{ status: number; body: string }> {
    CesMakeAuthRequestSchema.parse(params);
    return this.rpcCall("make_authenticated_request", params) as Promise<{ status: number; body: string }>;
  }

  async runAuthenticatedCommand(params: z.infer<typeof CesRunCommandSchema>): Promise<{ stdout: string; stderr: string }> {
    CesRunCommandSchema.parse(params);
    return this.rpcCall("run_authenticated_command", params) as Promise<{ stdout: string; stderr: string }>;
  }

  async manageSecureCommandTool(params: z.infer<typeof CesManageToolSchema>): Promise<{ success: boolean }> {
    CesManageToolSchema.parse(params);
    return this.rpcCall("manage_secure_command_tool", params) as Promise<{ success: boolean }>;
  }
}
