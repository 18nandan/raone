import { describe, it, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";

const srcDir = path.resolve(import.meta.dirname, "..", "src");

describe("Provider Abstraction Guard", () => {
  it("should not import @anthropic-ai/sdk outside provider abstraction", () => {
    const files = getAllFiles(srcDir);
    const offendingFiles = files.filter((f) => {
      const content = fs.readFileSync(f, "utf-8");
      return (
        content.includes('from "@anthropic-ai/sdk"') &&
        !f.includes("providers/provider-send-message")
      );
    });

    expect(offendingFiles).toEqual([]);
  });
});

function getAllFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath));
    } else if (entry.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}
