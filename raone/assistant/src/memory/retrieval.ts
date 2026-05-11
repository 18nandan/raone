import type { MemoryItem } from "@raoneai/service-contracts";

interface RankedResult {
  item: MemoryItem;
  score: number;
}

export function reciprocalRankFusion(
  denseResults: MemoryItem[],
  sparseResults: MemoryItem[],
  options: { limit: number; k?: number },
): MemoryItem[] {
  const k = options.k ?? 60;
  const scores = new Map<string, number>();
  const items = new Map<string, MemoryItem>();

  denseResults.forEach((item, i) => {
    scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (k + i));
    items.set(item.id, item);
  });

  sparseResults.forEach((item, i) => {
    scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (k + i));
    items.set(item.id, item);
  });

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, options.limit)
    .map(([id]) => items.get(id)!)
    .filter(Boolean);
}

export function embedQuery(query: string): number[] {
  // Placeholder: returns a zero vector of dimension 1536 (OpenAI ada-002)
  // Production would call the LLM provider's embedding endpoint
  return new Array(1536).fill(0);
}

export class MemoryRetrieval {
  private items: MemoryItem[] = [];

  setItems(items: MemoryItem[]): void {
    this.items = items;
  }

  async denseSearch(query: string, limit: number): Promise<MemoryItem[]> {
    const queryEmbedding = embedQuery(query);
    return this.items
      .filter((item) => item.embedding)
      .map((item) => ({
        item,
        similarity: cosineSimilarity(queryEmbedding, item.embedding!),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((r) => r.item);
  }

  async sparseSearch(query: string, limit: number): Promise<MemoryItem[]> {
    const queryTerms = query.toLowerCase().split(/\s+/);
    return this.items
      .map((item) => ({
        item,
        score: queryTerms.filter((t) => item.content.toLowerCase().includes(t)).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.item);
  }

  async hybridSearch(query: string, conversationId: string): Promise<MemoryItem[]> {
    const denseResults = await this.denseSearch(query, 20);
    const sparseResults = await this.sparseSearch(query, 20);
    return reciprocalRankFusion(denseResults, sparseResults, { limit: 10 });
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
