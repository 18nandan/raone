import { z } from "zod";

export const AssistantEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("conversation_info") }),
  z.object({ type: z.literal("conversation_title_updated") }),
  z.object({ type: z.literal("text_delta"), delta: z.string() }),
  z.object({ type: z.literal("message_complete") }),
  z.object({ type: z.literal("conversation_error") }),
  z.object({ type: z.literal("message_queued") }),
  z.object({ type: z.literal("message_dequeued") }),
  z.object({ type: z.literal("generation_handoff") }),
  z.object({ type: z.literal("ui_surface_show") }),
  z.object({ type: z.literal("open_url") }),
  z.object({ type: z.literal("avatar_updated") }),
  z.object({ type: z.literal("disk_pressure_status_changed") }),
  z.object({ type: z.literal("trace_event") }),
]);

export type AssistantEvent = z.infer<typeof AssistantEventSchema>;

export const MemoryItemTypeSchema = z.enum([
  "identity", "preference", "project", "event", "contact", "fact",
]);

export type MemoryItemType = z.infer<typeof MemoryItemTypeSchema>;

export interface MemoryItem {
  id: string;
  type: MemoryItemType;
  content: string;
  source: string;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  scope: "user" | "channel";
}

export const LLMCallSiteSchema = z.enum([
  "mainAgent", "memoryExtraction", "memoryEmbedding", "titleGeneration",
  "classification", "heartbeat", "onboarding",
]);

export type LLMCallSite = z.infer<typeof LLMCallSiteSchema>;

export const ToolRunnerSchema = z.enum(["host", "sandbox"]);

export type ToolRunner = z.infer<typeof ToolRunnerSchema>;

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  runner: ToolRunner;
}

export interface SkillManifest {
  id: string;
  name: string;
  tools: ToolDefinition[];
}

export const RpcRequestSchema = z.object({
  id: z.string(),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
});

export const RpcResponseSchema = z.object({
  id: z.string(),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

export type RpcRequest = z.infer<typeof RpcRequestSchema>;
export type RpcResponse = z.infer<typeof RpcResponseSchema>;

export const CesMakeAuthRequestSchema = z.object({
  url: z.string(),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]),
  credentialId: z.string(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
});

export const CesRunCommandSchema = z.object({
  command: z.string(),
  credentialId: z.string(),
  authAdapter: z.enum(["env_var", "temp_file", "credential_process"]),
  egressMode: z.enum(["proxy_required", "no_network"]),
  allowedArgvPatterns: z.array(z.string()),
});

export const CesManageToolSchema = z.object({
  action: z.enum(["install", "uninstall"]),
  toolName: z.string(),
});

export const ChannelSchema = z.enum(["telegram", "slack", "whatsapp", "twilio"]);
export type Channel = z.infer<typeof ChannelSchema>;

export const TrustLevelSchema = z.enum(["guardian", "trusted", "unknown"]);
export type TrustLevel = z.infer<typeof TrustLevelSchema>;

export interface NormalizedInboundMessage {
  channel: Channel;
  channelMessageId: string;
  conversationId: string;
  actorId: string;
  text: string;
  timestamp: Date;
}

export interface FeatureFlag {
  id: string;
  key: string;
  scope: string;
  defaultEnabled: boolean;
}

export const FeatureFlagRegistrySchema = z.object({
  flags: z.array(z.object({
    id: z.string(),
    key: z.string(),
    scope: z.string(),
    defaultEnabled: z.boolean(),
  })),
});
