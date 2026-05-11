import { describe, it, expect } from "bun:test";
import { MemoryRetrieval, reciprocalRankFusion } from "../src/memory/retrieval.ts";

describe("Memory Retrieval", () => {
  it("should fuse dense and sparse results with RRF", () => {
    const denseItems = [
      { id: "1", type: "fact" as const, content: "Alice likes coffee", source: "conv1", createdAt: new Date(), updatedAt: new Date(), scope: "user" as const },
      { id: "2", type: "fact" as const, content: "Bob likes tea", source: "conv1", createdAt: new Date(), updatedAt: new Date(), scope: "user" as const },
    ];
    const sparseItems = [
      { id: "2", type: "fact" as const, content: "Bob likes tea", source: "conv1", createdAt: new Date(), updatedAt: new Date(), scope: "user" as const },
      { id: "3", type: "fact" as const, content: "Carol likes water", source: "conv1", createdAt: new Date(), updatedAt: new Date(), scope: "user" as const },
    ];

    const fused = reciprocalRankFusion(denseItems, sparseItems, { limit: 2 });
    expect(fused.length).toBe(2);
    expect(fused[0].id).toBe("2"); // highest RRF score
  });
});
