import type { NormalizedInboundMessage } from "@raoneai/service-contracts";

export function normalizeSlackEvent(event: Record<string, unknown>): NormalizedInboundMessage | null {
  if (event.type !== "event_callback") return null;

  const innerEvent = event.event as Record<string, unknown> | undefined;
  if (!innerEvent || innerEvent.type !== "app_mention") return null;

  const user = innerEvent.user as string ?? "";
  const channel = innerEvent.channel as string ?? "";
  const text = innerEvent.text as string ?? "";

  return {
    channel: "slack",
    channelMessageId: String(innerEvent.event_ts ?? event.event_id ?? ""),
    conversationId: `slack:${channel}`,
    actorId: `slack:${user}`,
    text,
    timestamp: new Date(),
  };
}
