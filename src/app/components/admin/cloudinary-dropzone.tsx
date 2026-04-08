import { useRef, useState } from "react";
import {
  getCloudinaryConfig,
  uploadImageFilesToCloudinary,
  uploadImageUrlsToCloudinary,
  type UploadedCloudinaryImage,
} from "./runtime/cloudinary-upload";

interface CloudinaryDropzoneProps {
  dropLabel: string;
  helperText: string;
  onUploaded: (entries: UploadedCloudinaryImage[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (!file.type) {
    // Finder and some drag sources can omit MIME metadata entirely.
    // Prefer to accept dropped files and let Cloudinary validate content.
    return true;
  }
  return false;
}

export function CloudinaryDropzone({
  dropLabel,
  helperText,
  onUploaded,
  onUploadingChange,
}: CloudinaryDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const extractDroppedImageUrls = (event: React.DragEvent<HTMLElement>): string[] => {
    const dataTransfer = event.dataTransfer;
    const readData = typeof dataTransfer.getData === "function"
      ? dataTransfer.getData.bind(dataTransfer)
      : () => "";

    const values = new Set<string>();
    const maybeAdd = (value: string) => {
      const trimmed = value.trim();
      if (!/^https?:\/\//i.test(trimmed)) return;
      if (/\.(png|jpe?g|webp|gif|avif|bmp|svg)(\?|#|$)/i.test(trimmed)) {
        values.add(trimmed);
      }
    };

    const uriList = readData("text/uri-list");
    for (const line of uriList.split("\n")) {
      const candidate = line.trim();
      if (!candidate || candidate.startsWith("#")) continue;
      maybeAdd(candidate);
    }

    maybeAdd(readData("text/plain"));

    const html = readData("text/html");
    const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null = imgSrcRegex.exec(html);
    while (match) {
      maybeAdd(match[1] ?? "");
      match = imgSrcRegex.exec(html);
    }

    return Array.from(values);
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const config = getCloudinaryConfig();
    if (!config) {
      setUploadError("Cloudinary settings missing (cloud name or upload preset).");
      return;
    }

    setUploadError(null);
    onUploadingChange?.(true);
    try {
      const uploaded = await uploadImageFilesToCloudinary(files, config);
      onUploaded(uploaded);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setUploadError(message);
    } finally {
      onUploadingChange?.(false);
    }
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const files = Array.from(event.dataTransfer.files ?? []).filter(isImageFile);
        if (files.length > 0) {
          void uploadFiles(files);
          return;
        }
        const urls = extractDroppedImageUrls(event);
        if (urls.length === 0) return;
        const config = getCloudinaryConfig();
        if (!config) {
          setUploadError("Cloudinary settings missing (cloud name or upload preset).");
          return;
        }
        setUploadError(null);
        onUploadingChange?.(true);
        void uploadImageUrlsToCloudinary(urls, config)
          .then((uploaded) => {
            onUploaded(uploaded);
          })
          .catch((error) => {
            const message = error instanceof Error ? error.message : "Upload failed";
            setUploadError(message);
          })
          .finally(() => onUploadingChange?.(false));
      }}
      className={`rounded border px-2.5 py-2 transition-colors ${
        isDragging
          ? "border-emerald-400/40 bg-emerald-400/10"
          : "border-white/[0.08] bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-white/55" style={{ fontSize: "10px" }}>
          {dropLabel}
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white/55 hover:text-white/80"
          style={{ fontSize: "10px" }}
        >
          Choose Files
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.currentTarget.value = "";
          void uploadFiles(files);
        }}
      />
      <div className="text-white/25 mt-1" style={{ fontSize: "9px" }}>
        {helperText}
      </div>
      {uploadError && (
        <div className="text-red-400/80 mt-1" style={{ fontSize: "9px" }}>
          {uploadError}
        </div>
      )}
    </div>
  );
}

