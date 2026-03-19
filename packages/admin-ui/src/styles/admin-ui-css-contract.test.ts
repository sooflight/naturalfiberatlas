import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin-ui css contract", () => {
  it("defines required root tokens", () => {
    const cssPath = path.resolve(__dirname, "../../styles.css");
    const css = fs.readFileSync(cssPath, "utf8");

    expect(css).toContain("--atlas-admin-bg");
    expect(css).toContain("--atlas-admin-fg");
  });
});
