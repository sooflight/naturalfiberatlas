import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAtlasImageMutations } from "./useAtlasImageMutations";

const { atomicImageUpdateMock } = vi.hoisted(() => ({
  atomicImageUpdateMock: vi.fn(
    async (mutate: (diskImages: Record<string, unknown>) => Record<string, unknown>) =>
      mutate({ alpaca: "https://example.com/solo.jpg" }),
  ),
}));

vi.mock("@/utils/atlasImageStore", () => ({
  atomicImageUpdate: atomicImageUpdateMock,
  normalizeImageEntries: (current: unknown) =>
    !current ? [] : (Array.isArray(current) ? current : [current]),
  readAtlasDiskData: async () => null,
}));

describe("useAtlasImageMutations", () => {
  it("removes scalar image entries by normalizing to array first", async () => {
    const { result } = renderHook(() => useAtlasImageMutations({}));

    await act(async () => {
      await result.current.removeImage("alpaca", 0);
    });

    expect(atomicImageUpdateMock).toHaveBeenCalledTimes(1);
    expect(result.current.images.alpaca).toEqual([]);
  });
});
