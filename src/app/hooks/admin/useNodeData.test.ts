import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/featureFlags", () => ({
  FEATURE_FLAGS: {
    canonicalAdminApi: false,
    logDataSource: false,
  },
}));

describe("useNodeData local-mode behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns local fallback data without calling edge function", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getNodeData } = await import("./useNodeData");

    const node = await getNodeData("hemp");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(node).toMatchObject({
      id: "hemp",
      portal: "hemp",
    });
  });

  it("treats seed as successful without remote call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { seedNodes } = await import("./useNodeData");

    const result = await seedNodes({
      "node:hemp": {
        id: "hemp",
        name: "Hemp",
        type: "material",
        category: "fiber",
        portal: "hemp",
        summary: "test",
      },
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      count: 1,
      keys: ["node:hemp"],
    });
  });
});
