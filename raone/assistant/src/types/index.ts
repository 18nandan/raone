export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "tool";
  content: string;
  createdAt: Date;
}

export interface ToolInvocation {
  id: string;
  messageId: string;
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  createdAt: Date;
}

export type AssistantEvent =
  | { type: "conversation_info" }
  | { type: "conversation_title_updated" }
  | { type: "text_delta"; delta: string }
  | { type: "message_complete" }
  | { type: "conversation_error" }
  | { type: "message_queued" }
  | { type: "message_dequeued" }
  | { type: "generation_handoff" }
  | { type: "ui_surface_show" }
  | { type: "open_url" }
  | { type: "avatar_updated" }
  | { type: "disk_pressure_status_changed" }
  | { type: "trace_event" };

export interface LlmConfig {
  provider: "anthropic" | "openai" | "google" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export type LLMCallSite =
  | "mainAgent"
  | "memoryExtraction"
  | "memoryEmbedding"
  | "titleGeneration"
  | "classification"
  | "heartbeat"
  | "onboarding";
