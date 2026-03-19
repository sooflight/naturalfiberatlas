/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { copyImageFromUrl } from "./clipboardImage";

describe("copyImageFromUrl", () => {
  it("falls back to PNG when JPEG clipboard write is unsupported", async () => {
    const jpegBlob = new Blob(["jpeg"], { type: "image/jpeg" });
    const pngBlob = new Blob(["png"], { type: "image/png" });
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => jpegBlob,
    });
    const clipboardWrite = vi
      .fn()
      .mockRejectedValueOnce(new Error("Failed to execute 'write' on 'Clipboard': Type image/jpeg not supported on write."))
      .mockResolvedValueOnce(undefined);
    class ClipboardItemMock {
      constructor(public data: Record<string, Blob>) {}
    }
    const transcodeToPng = vi.fn().mockResolvedValue(pngBlob);

    await (copyImageFromUrl as any)("https://example.com/photo.jpg", {
      fetchFn,
      clipboardWrite,
      ClipboardItemCtor: ClipboardItemMock,
      transcodeToPng,
    });

    expect(fetchFn).toHaveBeenCalledWith("https://example.com/photo.jpg");
    expect(clipboardWrite).toHaveBeenCalledTimes(2);
    const firstWriteType = Object.keys(clipboardWrite.mock.calls[0][0][0].data)[0];
    const secondWriteType = Object.keys(clipboardWrite.mock.calls[1][0][0].data)[0];
    expect(firstWriteType).toBe("image/jpeg");
    expect(secondWriteType).toBe("image/png");
    expect(transcodeToPng).toHaveBeenCalledWith(jpegBlob);
  });
});
