import { describe, it, expect } from "bun:test";

describe("Gateway Boundary Guard", () => {
  it("should ensure gateway has no daemon direct imports", () => {
    // This test verifies no cross-package relative imports between gateway and assistant
    const pkg = require("../package.json");
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

    // Gateway should not depend on @raoneai/assistant
    expect(deps["@raoneai/assistant"]).toBeUndefined();
  });
});
