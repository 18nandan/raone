interface ToolResult { success: boolean; output: unknown; error?: string }

export async function webSearch(input: { query: string; numResults?: number }): Promise<ToolResult> {
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(input.query)}&format=json`);
    const data = await res.json() as { AbstractText?: string; RelatedTopics?: Array<{ Text?: string; FirstURL?: string }> };
    return {
      success: true,
      output: {
        abstract: data.AbstractText || "",
        results: (data.RelatedTopics || []).slice(0, input.numResults || 5).map((t) => ({
          text: t.Text,
          url: t.FirstURL,
        })),
      },
    };
  } catch (err) {
    return { success: false, output: null, error: String(err) };
  }
}

export async function webFetch(input: { url: string; format?: string }): Promise<ToolResult> {
  try {
    const res = await fetch(input.url);
    const text = await res.text();
    return { success: true, output: { content: text.slice(0, 10000), format: input.format || "text" } };
  } catch (err) {
    return { success: false, output: null, error: String(err) };
  }
}

export default { webSearch, webFetch };
