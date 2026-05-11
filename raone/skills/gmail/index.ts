interface ToolResult { success: boolean; output: unknown; error?: string }

export async function gmailSearch(input: { query: string; maxResults?: number }): Promise<ToolResult> {
  // Placeholder: would use Gmail API via CES
  return {
    success: true,
    output: { messages: [], totalResults: 0 },
  };
}

export async function gmailSend(input: { to: string; subject: string; body: string }): Promise<ToolResult> {
  // Placeholder: would use Gmail API via CES
  return {
    success: true,
    output: { messageId: crypto.randomUUID(), sent: true },
  };
}

export default { gmailSearch, gmailSend };
