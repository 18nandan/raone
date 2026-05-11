import type { LLMCallSite } from "../types/index.js";

export interface LlmMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LlmResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    input: Record<string, unknown>;
  }>;
}

interface ProviderConfig {
  provider: "anthropic" | "openai" | "google" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

const siteConfigs: Record<LLMCallSite, ProviderConfig> = {
  mainAgent: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  memoryExtraction: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  memoryEmbedding: {
    provider: "openai",
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  },
  titleGeneration: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  classification: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  heartbeat: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  onboarding: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
};

function getProviderConfig(callSite: LLMCallSite): ProviderConfig {
  const config = siteConfigs[callSite];
  if (!config) throw new Error(`No provider config for call site: ${callSite}`);
  return config;
}

async function callAnthropic(
  config: ProviderConfig,
  messages: LlmMessage[],
  tools?: ToolDefinition[],
): Promise<LlmResponse> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: config.apiKey });

  const systemMessages = messages.filter((m) => m.role === "system");
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  const response = await client.messages.create({
    model: config.model || "claude-sonnet-4-20250514",
    max_tokens: config.maxTokens || 4096,
    system: systemMessages.map((m) => m.content).join("\n"),
    messages: nonSystemMessages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    tools: tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Record<string, unknown>,
    })),
  });

  const textBlocks = response.content.filter((b) => b.type === "text");
  const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

  return {
    content: textBlocks.map((b) => b.text).join(""),
    toolCalls: toolUseBlocks.map((b) => ({
      name: b.name,
      input: b.input as Record<string, unknown>,
    })),
  };
}

async function callOpenAI(
  config: ProviderConfig,
  messages: LlmMessage[],
  tools?: ToolDefinition[],
): Promise<LlmResponse> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });

  const response = await client.chat.completions.create({
    model: config.model || "gpt-4o",
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    tools: tools?.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters as Record<string, unknown>,
      },
    })),
  });

  const choice = response.choices[0];
  return {
    content: choice?.message?.content || "",
    toolCalls: choice?.message?.tool_calls?.map((tc) => ({
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments),
    })),
  };
}

async function callGoogle(
  config: ProviderConfig,
  messages: LlmMessage[],
): Promise<LlmResponse> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(config.apiKey || "");
  const model = genAI.getGenerativeModel({ model: config.model || "gemini-2.0-flash" });

  const lastMessage = messages[messages.length - 1];
  const result = await model.generateContent(lastMessage?.content || "");

  return {
    content: result.response.text(),
  };
}

async function callOllama(
  config: ProviderConfig,
  messages: LlmMessage[],
): Promise<LlmResponse> {
  const baseUrl = config.baseUrl || "http://localhost:11434";
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model || "llama3",
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
    }),
  });

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
  const data = await response.json() as { message?: { content: string } };
  return { content: data.message?.content || "" };
}

export async function getConfiguredProvider(
  callSite: LLMCallSite,
): Promise<{ sendMessage: (messages: LlmMessage[], tools?: ToolDefinition[]) => Promise<LlmResponse> }> {
  const config = getProviderConfig(callSite);

  const sendMessage = async (messages: LlmMessage[], tools?: ToolDefinition[]): Promise<LlmResponse> => {
    switch (config.provider) {
      case "anthropic":
        return callAnthropic(config, messages, tools);
      case "openai":
        return callOpenAI(config, messages, tools);
      case "google":
        return callGoogle(config, messages);
      case "ollama":
        return callOllama(config, messages);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  };

  return { sendMessage };
}
