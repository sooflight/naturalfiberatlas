interface CopyImageDeps {
  fetchFn?: typeof fetch;
  clipboardWrite?: (items: ClipboardItem[]) => Promise<void>;
  ClipboardItemCtor?: typeof ClipboardItem;
  transcodeToPng?: (blob: Blob) => Promise<Blob>;
}

function isUnsupportedWriteTypeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return err.name === "NotSupportedError" || msg.includes("not supported on write");
}

async function transcodeBlobToPng(blob: Blob): Promise<Blob> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable for PNG conversion");
    ctx.drawImage(bitmap, 0, 0);
    const png = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/png");
    });
    if (!png) throw new Error("Failed to convert image to PNG");
    return png;
  }

  // Fallback for browsers without createImageBitmap.
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Failed to decode image for PNG conversion"));
      element.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable for PNG conversion");
    ctx.drawImage(img, 0, 0);
    const png = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/png");
    });
    if (!png) throw new Error("Failed to convert image to PNG");
    return png;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function copyImageFromUrl(imageUrl: string, deps: CopyImageDeps = {}): Promise<void> {
  if (!imageUrl) throw new Error("Image URL is required");

  const fetchFn = deps.fetchFn ?? fetch;
  const clipboardWrite = deps.clipboardWrite ?? navigator.clipboard?.write?.bind(navigator.clipboard);
  const ClipboardItemCtor = deps.ClipboardItemCtor ?? window.ClipboardItem;
  const toPng = deps.transcodeToPng ?? transcodeBlobToPng;

  if (!clipboardWrite || typeof ClipboardItemCtor === "undefined") {
    throw new Error("Image clipboard is not supported in this browser");
  }

  const response = await fetchFn(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status})`);
  }
  const blob = await response.blob();
  const sourceType = blob.type || "image/png";

  try {
    await clipboardWrite([new ClipboardItemCtor({ [sourceType]: blob })]);
  } catch (err) {
    if (!isUnsupportedWriteTypeError(err) || sourceType === "image/png") {
      throw err;
    }
    const pngBlob = await toPng(blob);
    await clipboardWrite([new ClipboardItemCtor({ "image/png": pngBlob })]);
  }
}
