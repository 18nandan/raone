import type { NormalizedInboundMessage } from "@raoneai/service-contracts";

export function normalizeWhatsAppMessage(payload: Record<string, unknown>): NormalizedInboundMessage | null {
  const entry = (payload.entry as Array<Record<string, unknown>>)?.[0];
  const change = (entry?.changes as Array<Record<string, unknown>>)?.[0];
  const value = change?.value as Record<string, unknown> | undefined;
  const messages = value?.messages as Array<Record<string, unknown>> | undefined;

  if (!messages || messages.length === 0) return null;

  const msg = messages[0];
  const from = msg.from as string ?? "";

  return {
    channel: "whatsapp",
    channelMessageId: String(msg.id ?? ""),
    conversationId: `wa:${from}`,
    actorId: `wa:${from}`,
    text: String(msg.text?.body ?? ""),
    timestamp: new Date(),
  };
}
