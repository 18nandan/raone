import type { NormalizedInboundMessage } from "@raoneai/service-contracts";

export function normalizeTelegramUpdate(update: Record<string, unknown>): NormalizedInboundMessage | null {
  const message = update.message as Record<string, unknown> | undefined;
  if (!message) return null;

  const chat = message.chat as Record<string, unknown> | undefined;
  const from = message.from as Record<string, unknown> | undefined;

  return {
    channel: "telegram",
    channelMessageId: String(update.update_id ?? ""),
    conversationId: `tg:${chat?.id ?? ""}`,
    actorId: `tg:${from?.id ?? ""}`,
    text: String(message.text ?? ""),
    timestamp: new Date(),
  };
}
