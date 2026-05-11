import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("New conversation"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id),
  role: text("role", { enum: ["user", "assistant", "tool"] }).notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const toolInvocations = sqliteTable("tool_invocations", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull().references(() => messages.id),
  toolName: text("tool_name").notNull(),
  input: text("input", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  output: text("output", { mode: "json" }).$type<unknown>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const memorySegments = sqliteTable("memory_segments", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id),
  content: text("content").notNull(),
  source: text("source").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const memoryItems = sqliteTable("memory_items", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["identity", "preference", "project", "event", "contact", "fact"] }).notNull(),
  content: text("content").notNull(),
  source: text("source").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  scope: text("scope", { enum: ["user", "channel"] }).notNull().default("user"),
});

export const memoryItemSources = sqliteTable("memory_item_sources", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => memoryItems.id),
  segmentId: text("segment_id").notNull().references(() => memorySegments.id),
});

export const memorySummaries = sqliteTable("memory_summaries", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id),
  summary: text("summary").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const memoryEmbeddings = sqliteTable("memory_embeddings", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => memoryItems.id),
  embedding: text("embedding", { mode: "json" }).$type<number[]>().notNull(),
  model: text("model").notNull(),
});

export const memoryJobs = sqliteTable("memory_jobs", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["embed", "extract", "cleanup_stale"] }).notNull(),
  status: text("status", { enum: ["pending", "running", "done", "failed"] }).notNull().default("pending"),
  itemId: text("item_id"),
  conversationId: text("conversation_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const attachments = sqliteTable("attachments", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull().references(() => messages.id),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  storagePath: text("storage_path").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const channelInboundEvents = sqliteTable("channel_inbound_events", {
  id: text("id").primaryKey(),
  channel: text("channel").notNull(),
  channelEventId: text("channel_event_id").notNull().unique(),
  processed: integer("processed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const conversationKeys = sqliteTable("conversation_keys", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().unique().references(() => conversations.id),
  encryptionKey: text("encryption_key").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").references(() => conversations.id),
  text: text("text").notNull(),
  dueAt: integer("due_at", { mode: "timestamp" }).notNull(),
  routingIntent: text("routing_intent"),
  routingHintsJson: text("routing_hints_json"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const cronJobs = sqliteTable("cron_jobs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  schedule: text("schedule").notNull(),
  action: text("action").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const cronRuns = sqliteTable("cron_runs", {
  id: text("id").primaryKey(),
  cronJobId: text("cron_job_id").notNull().references(() => cronJobs.id),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  status: text("status", { enum: ["running", "done", "failed"] }).notNull(),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "running", "done", "failed"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const taskRuns = sqliteTable("task_runs", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  status: text("status", { enum: ["running", "done", "failed"] }).notNull(),
  output: text("output", { mode: "json" }).$type<unknown>(),
});

export const workItems = sqliteTable("work_items", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  payload: text("payload", { mode: "json" }).$type<unknown>().notNull(),
  status: text("status", { enum: ["pending", "processing", "done", "failed"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  trustLevel: text("trust_level", { enum: ["guardian", "trusted", "unknown"] }).notNull().default("unknown"),
  externalIds: text("external_ids", { mode: "json" }).$type<Record<string, string>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
