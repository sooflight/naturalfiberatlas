import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import ImageScoutPanel from "./ImageScoutPanel";
import {
  ATLAS_IMAGES,
  ATLAS_TAGS,
  PROFILE_ERA,
  PROFILE_ORIGINS,
  SCIENTIFIC_NAMES,
} from "../../data/atlas-images";
import { useAdminSettings } from "../../contexts/AdminSettingsContext";
import { useAtlasImageMutations } from "./hooks/useAtlasImageMutations";

interface ImageEditModalProps {
  nodeId: string;
  nodeLabel: string;
  allProfileKeys: string[];
  onClose: () => void;
}

export function ImageEditModal({
  nodeId,
  nodeLabel,
  allProfileKeys,
  onClose,
}: ImageEditModalProps) {
  const { settings } = useAdminSettings();
  const cloudinaryConfig = settings.cloudinary;
  const cloudinaryReady = !!(cloudinaryConfig.cloudName && cloudinaryConfig.uploadPreset);
  const { images, addImages, reorderImages, removeImage } = useAtlasImageMutations({ ...ATLAS_IMAGES });
  const [flash, setFlash] = useState<string | null>(null);

  const handleAddImages = useCallback(
    async (profileKey: string, urls: string[], media?: import("../../types/atlas-media").AtlasMedia[]) => {
      if (!urls.length) return;
      const result = await addImages(profileKey, urls, media);
      if (!result) {
        setFlash("Failed to save — check console");
        return;
      }
      setFlash(`Added ${urls.length} image(s)`);
    },
    [addImages]
  );

  const handleReorderImages = useCallback(
    async (key: string, fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx) return;
      const result = await reorderImages(key, fromIdx, toIdx);
      if (!result) {
        setFlash("Failed to save — check console");
        return;
      }
    },
    [reorderImages]
  );

  const handleRemoveImage = useCallback(
    async (key: string, idx: number) => {
      const result = await removeImage(key, idx);
      if (!result) {
        setFlash("Failed to save — check console");
        return;
      }
    },
    [removeImage]
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        background: "rgba(0,0,0,0.85)",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(10,10,10,0.98)",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontFamily: "'Pica', sans-serif",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#60a5fa",
          }}
        >
          Edit images: {nodeLabel}
        </span>
        {flash && (
          <span style={{ fontSize: 11, color: "#4ade80" }}>{flash}</span>
        )}
        <button
          onClick={onClose}
          className="atlas-tap-feedback"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "rgba(255,255,255,0.08)",
            border: "none",
            color: "#fff",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Panel */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <ImageScoutPanel
          allProfileKeys={allProfileKeys}
          braveApiKey={settings.imageSearch.brave}
          cloudinaryConfig={cloudinaryConfig}
          cloudinaryReady={cloudinaryReady}
          onAddImages={handleAddImages}
          onClose={onClose}
          onFlash={(msg) => setFlash(msg)}
          initialProfile={nodeId}
          images={images}
          tags={ATLAS_TAGS}
          era={PROFILE_ERA}
          origins={PROFILE_ORIGINS}
          scientific={SCIENTIFIC_NAMES}
          onReorderImages={handleReorderImages}
          onRemoveImage={handleRemoveImage}
          embedded
        />
      </div>
    </div>
  );
}
