export class AssistantClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async createConversation(): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/conversation/create`, { method: "POST" });
    if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`);
    return res.json() as Promise<{ id: string }>;
  }

  async sendMessage(conversationId: string, text: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/conversation/${conversationId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  }

  streamConversation(conversationId: string): EventSource {
    return new EventSource(`${this.baseUrl}/conversation/${conversationId}/stream`);
  }

  async forwardInboundMessage(payload: unknown): Promise<void> {
    const res = await fetch(`${this.baseUrl}/channels/inbound`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to forward inbound message: ${res.status}`);
  }

  async checkDiskPressure(): Promise<{ status: string }> {
    const res = await fetch(`${this.baseUrl}/v1/disk-pressure/status`);
    if (!res.ok) throw new Error(`Failed to check disk pressure: ${res.status}`);
    return res.json() as Promise<{ status: string }>;
  }

  async acknowledgeDiskPressure(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/v1/disk-pressure/acknowledge`, { method: "POST" });
    if (!res.ok) throw new Error(`Failed to acknowledge disk pressure: ${res.status}`);
  }
}
