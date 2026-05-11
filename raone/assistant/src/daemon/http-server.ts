import { Database } from "bun:sqlite";
import type { AssistantEvent } from "../types/index.js";
import { MemoryRetrieval } from "../memory/retrieval.js";
import { IdentitySystem } from "../identity/index.js";
import { SkillLoader } from "../skills/loader.js";
import { SkillRunner } from "../skills/runners.js";
import { getConfiguredProvider } from "../providers/provider-send-message.js";
import { DiskPressureGuard } from "../background/disk-pressure.js";

interface SSESession {
  conversationId: string;
  controller: ReadableStreamDefaultController;
}

export class RuntimeHttpServer {
  private port: number;
  private db: Database;
  private memoryRetrieval: MemoryRetrieval;
  private identitySystem: IdentitySystem;
  private skillLoader: SkillLoader;
  private skillRunner: SkillRunner;
  private diskPressureGuard: DiskPressureGuard;
  private sseSessions: Map<string, Set<ReadableStreamDefaultController>> = new Map();

  constructor(
    port: number,
    db: Database,
    memoryRetrieval: MemoryRetrieval,
    identitySystem: IdentitySystem,
    skillLoader: SkillLoader,
    skillRunner: SkillRunner,
    diskPressureGuard: DiskPressureGuard,
  ) {
    this.port = port;
    this.db = db;
    this.memoryRetrieval = memoryRetrieval;
    this.identitySystem = identitySystem;
    this.skillLoader = skillLoader;
    this.skillRunner = skillRunner;
    this.diskPressureGuard = diskPressureGuard;
  }

  async listen(): Promise<void> {
    Bun.serve({
      port: this.port,
      fetch: (req) => this.handleRequest(req),
    });
    console.log(`Runtime HTTP server listening on port ${this.port}`);
  }

  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;

    // CORS
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      // Conversation endpoints
      if (url.pathname === "/conversation/create" && method === "POST") {
        return this.createConversation();
      }

      const conversationMatch = url.pathname.match(/^\/conversation\/([^/]+)\/message$/);
      if (conversationMatch && method === "POST") {
        const body = await req.json() as { text: string };
        return this.sendMessage(conversationMatch[1], body.text);
      }

      const streamMatch = url.pathname.match(/^\/conversation\/([^/]+)\/stream$/);
      if (streamMatch && method === "GET") {
        return this.streamConversation(streamMatch[1]);
      }

      // List conversations
      if (url.pathname === "/conversations" && method === "GET") {
        return this.listConversations();
      }

      // Get conversation messages
      const messagesMatch = url.pathname.match(/^\/conversation\/([^/]+)\/messages$/);
      if (messagesMatch && method === "GET") {
        return this.getConversationMessages(messagesMatch[1]);
      }

      // Channel endpoints
      if (url.pathname === "/channels/inbound" && method === "POST") {
        const body = await req.json();
        return this.handleInbound(body);
      }

      const deliverMatch = url.pathname.match(/^\/deliver\/(\w+)$/);
      if (deliverMatch && method === "POST") {
        const body = await req.json();
        return this.deliverMessage(deliverMatch[1], body);
      }

      // Disk pressure endpoints
      if (url.pathname === "/v1/disk-pressure/status" && method === "GET") {
        return this.getDiskPressureStatus();
      }
      if (url.pathname === "/v1/disk-pressure/acknowledge" && method === "POST") {
        return this.acknowledgeDiskPressure();
      }
      if (url.pathname === "/v1/disk-pressure/override" && method === "POST") {
        return this.overrideDiskPressure();
      }

      return new Response("Not Found", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
    } catch (err) {
      console.error("Request error:", err);
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
      );
    }
  }

  private async createConversation(): Promise<Response> {
    const id = crypto.randomUUID();
    const now = Date.now();

    this.db.run(
      "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
      [id, "New conversation", now, now],
    );

    return new Response(JSON.stringify({ id }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  private async sendMessage(conversationId: string, text: string): Promise<Response> {
    const messageId = crypto.randomUUID();
    const now = Date.now();

    this.db.run(
      "INSERT OR IGNORE INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
      [conversationId, "New conversation", now, now],
    );

    this.db.run(
      "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
      [messageId, conversationId, "user", text, now],
    );

    this.db.run(
      "UPDATE conversations SET updated_at = ? WHERE id = ?",
      [now, conversationId],
    );

    // Process the message asynchronously
    this.processConversation(conversationId, messageId, text);

    return new Response(JSON.stringify({ messageId }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  private async processConversation(conversationId: string, _messageId: string, text: string): Promise<void> {
    try {
      this.broadcastSSE(conversationId, { type: "message_queued" });

      // Load identity files
      const identity = await this.identitySystem.loadIdentityFiles();

      // Recall memories
      const recalledMemories = await this.memoryRetrieval.hybridSearch(text, conversationId);

      // Load active skills
      const activeSkillIds = await this.skillLoader.deriveActiveSkills(conversationId);
      const tools = await this.skillLoader.loadAllSkillTools();

      // Build system prompt
      const systemPrompt = this.identitySystem.buildSystemPrompt(
        identity,
        recalledMemories.map((m) => m.content),
      );

      // Get LLM provider
      const provider = await getConfiguredProvider("mainAgent");

      // Send to LLM
      const response = await provider.sendMessage(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters as Record<string, unknown>,
        })),
      );

      // Stream response
      this.broadcastSSE(conversationId, { type: "text_delta", delta: response.content });
      this.broadcastSSE(conversationId, { type: "message_complete" });

      // Save assistant message
      const assistantMessageId = crypto.randomUUID();
      this.db.run(
        "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        [assistantMessageId, conversationId, "assistant", response.content, Date.now()],
      );

      // Queue memory extraction
      this.db.run(
        "INSERT INTO memory_jobs (id, type, status, conversation_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        [crypto.randomUUID(), "extract", "pending", conversationId, Date.now(), Date.now()],
      );

      // Update NOW.md
      await this.identitySystem.updateNowFile(
        `# NOW.md — Current Focus\n\nLast conversation: ${conversationId}\nTopic: ${text.slice(0, 100)}`,
      );
    } catch (err) {
      console.error("Conversation processing error:", err);
      this.broadcastSSE(conversationId, {
        type: "conversation_error",
      });
    }
  }

  private streamConversation(conversationId: string): Response {
    let closed = false;
    const stream = new ReadableStream({
      start: (controller) => {
        if (!this.sseSessions.has(conversationId)) {
          this.sseSessions.set(conversationId, new Set());
        }
        this.sseSessions.get(conversationId)!.add(controller);

        // Send initial connection event
        controller.enqueue(`data: ${JSON.stringify({ type: "conversation_info" })}\n\n`);
      },
      cancel: () => {
        closed = true;
        const sessions = this.sseSessions.get(conversationId);
        if (sessions) {
          for (const c of sessions) {
            // Clean up on cancel
          }
          this.sseSessions.delete(conversationId);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  private broadcastSSE(conversationId: string, event: AssistantEvent): void {
    const sessions = this.sseSessions.get(conversationId);
    if (!sessions) return;

    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const controller of sessions) {
      try {
        controller.enqueue(data);
      } catch {
        sessions.delete(controller);
      }
    }
  }

  private async listConversations(): Promise<Response> {
    const rows = this.db
      .query("SELECT id, title, created_at FROM conversations ORDER BY created_at DESC LIMIT 50")
      .all() as Array<{ id: string; title: string; created_at: number }>;

    return new Response(JSON.stringify({ conversations: rows }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  private async getConversationMessages(conversationId: string): Promise<Response> {
    const rows = this.db
      .query("SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
      .all(conversationId) as Array<{ id: string; role: string; content: string; created_at: number }>;

    return new Response(JSON.stringify({ messages: rows }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  private async handleInbound(body: unknown): Promise<Response> {
    console.log("Inbound message:", body);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async deliverMessage(channel: string, body: unknown): Promise<Response> {
    console.log(`Deliver to ${channel}:`, body);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private getDiskPressureStatus(): Response {
    const status = this.diskPressureGuard.getStatus();
    return new Response(JSON.stringify(status), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private acknowledgeDiskPressure(): Response {
    this.diskPressureGuard.acknowledge();
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private overrideDiskPressure(): Response {
    this.diskPressureGuard.override();
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
