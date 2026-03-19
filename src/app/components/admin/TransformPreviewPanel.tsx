import React, { useCallback, useMemo, useState } from "react";
import { X, Check, Sparkles, Crop, Image as ImageIcon, Zap } from "lucide-react";
import type { TransformRecipe } from "../../types/cloudinary-transform";
import { buildTransformUrl } from "../../utils/admin/cloudinary";

interface TransformPreviewPanelProps {
  imageUrl: string;
  initialRecipe?: TransformRecipe;
  onApply: (recipe: TransformRecipe) => void;
  onCancel: () => void;
}

const GRAVITY_OPTIONS = [
  { value: "center", label: "Center" },
  { value: "auto", label: "Auto (AI)" },
  { value: "face", label: "Face Detect" },
  { value: "faces", label: "Multi-Face" },
];

const QUALITY_OPTIONS = [
  { value: "auto:eco", label: "Eco (smaller)" },
  { value: "auto:best", label: "Best (quality)" },
  { value: "auto", label: "Auto (balanced)" },
];

const FORMAT_OPTIONS = [
  { value: "", label: "Original" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
  { value: "jpg", label: "JPEG" },
];

export function TransformPreviewPanel({
  imageUrl,
  initialRecipe,
  onApply,
  onCancel,
}: TransformPreviewPanelProps) {
  // Crop state
  const [cropWidth, setCropWidth] = useState(initialRecipe?.crop?.width || "");
  const [cropHeight, setCropHeight] = useState(initialRecipe?.crop?.height || "");
  const [gravity, setGravity] = useState(initialRecipe?.crop?.gravity || "center");

  // Effects state
  const [sharpen, setSharpen] = useState(initialRecipe?.effects?.sharpen || false);
  const [improve, setImprove] = useState(initialRecipe?.effects?.improve || false);
  const [autoBrightness, setAutoBrightness] = useState(initialRecipe?.effects?.autoBrightness || false);
  const [vibrance, setVibrance] = useState(initialRecipe?.effects?.vibrance || false);

  // Optimization state
  const [quality, setQuality] = useState<"auto" | "auto:best" | "auto:eco" | "auto:low" | number>(
    initialRecipe?.optimize?.quality || "auto:eco"
  );
  const [format, setFormat] = useState<"auto" | "webp" | "avif" | "jpg" | "png" | undefined>(
    initialRecipe?.optimize?.format || undefined
  );

  // Recipe name
  const [recipeName, setRecipeName] = useState(initialRecipe?.name || "Custom Transform");

  // Build current recipe
  const currentRecipe = useMemo(
    (): TransformRecipe => ({
      id: initialRecipe?.id || `custom-${Date.now()}`,
      name: recipeName,
      description: "Custom transform configuration",
      crop:
        cropWidth && cropHeight
          ? {
              width: Number(cropWidth),
              height: Number(cropHeight),
              gravity: gravity as "center" | "auto" | "face" | "faces",
            }
          : undefined,
      effects: {
        sharpen: sharpen || undefined,
        improve: improve || undefined,
        autoBrightness: autoBrightness || undefined,
        vibrance: vibrance || undefined,
      },
      optimize: {
        quality: quality as "auto" | "auto:best" | "auto:eco" | number,
        format: format || undefined,
      },
    }),
    [cropWidth, cropHeight, gravity, sharpen, improve, autoBrightness, vibrance, quality, format, recipeName, initialRecipe?.id]
  );

  // Generate preview URL
  const previewUrl = useMemo(() => {
    return buildTransformUrl(imageUrl, {
      crop: currentRecipe.crop,
      effects: currentRecipe.effects,
      optimize: currentRecipe.optimize,
    });
  }, [imageUrl, currentRecipe]);

  const handleApply = useCallback(() => {
    onApply(currentRecipe);
  }, [currentRecipe, onApply]);

  const hasCrop = cropWidth && cropHeight;
  const hasEffects = sharpen || improve || autoBrightness || vibrance;
  const hasOptimization = quality !== "auto" || format !== undefined;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        background: "rgba(6,6,6,0.92)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#f6f3ef",
            fontSize: 14,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontFamily: "'Pica', sans-serif",
          }}
        >
          Transform Preview
        </h2>
        <button
          type="button"
          onClick={onCancel}
          style={{
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.04)",
            color: "#f0ebe4",
            padding: 6,
            cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>
      </header>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Preview area */}
        <div
          style={{
            flex: 2,
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "100%",
              maxHeight: "100%",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <img
              src={previewUrl}
              alt="Transform preview"
              style={{
                maxWidth: "70vw",
                maxHeight: "70vh",
                display: "block",
                objectFit: "contain",
              }}
            />
            {/* Preview label */}
            <div
              style={{
                position: "absolute",
                bottom: 12,
                left: 12,
                padding: "6px 12px",
                borderRadius: 6,
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
                fontSize: 12,
              }}
            >
              Preview
            </div>
          </div>
        </div>

        {/* Controls panel */}
        <div
          style={{
            flex: 1,
            minWidth: 280,
            maxWidth: 340,
            padding: 20,
            borderLeft: "1px solid rgba(255,255,255,0.1)",
            overflow: "auto",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          {/* Recipe name */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: "rgba(240,235,228,0.7)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Recipe Name
            </label>
            <input
              type="text"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "#f0ebe4",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          {/* Crop section */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                fontSize: 12,
                color: "rgba(240,235,228,0.9)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <Crop size={14} />
              <span>Crop & Resize</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 10,
                    color: "rgba(240,235,228,0.6)",
                    marginBottom: 4,
                  }}
                >
                  Width (px)
                </label>
                <input
                  type="number"
                  value={cropWidth}
                  onChange={(e) => setCropWidth(e.target.value)}
                  placeholder="Auto"
                  min={1}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.05)",
                    color: "#f0ebe4",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 10,
                    color: "rgba(240,235,228,0.6)",
                    marginBottom: 4,
                  }}
                >
                  Height (px)
                </label>
                <input
                  type="number"
                  value={cropHeight}
                  onChange={(e) => setCropHeight(e.target.value)}
                  placeholder="Auto"
                  min={1}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.05)",
                    color: "#f0ebe4",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  color: "rgba(240,235,228,0.6)",
                  marginBottom: 4,
                }}
              >
                Gravity
              </label>
              <select
                value={gravity}
                onChange={(e) => setGravity(e.target.value as "center" | "auto" | "face" | "faces")}
                disabled={!hasCrop}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: hasCrop ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                  color: hasCrop ? "#f0ebe4" : "rgba(240,235,228,0.4)",
                  fontSize: 12,
                  outline: "none",
                  cursor: hasCrop ? "pointer" : "not-allowed",
                }}
              >
                {GRAVITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Effects section */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                fontSize: 12,
                color: "rgba(240,235,228,0.9)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <Sparkles size={14} />
              <span>AI Enhancements</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <EffectToggle
                label="Sharpen"
                active={!!sharpen}
                onToggle={() => setSharpen((prev) => (prev ? false : true))}
              />
              <EffectToggle
                label="Auto-Improve"
                active={improve}
                onToggle={() => setImprove((prev) => !prev)}
              />
              <EffectToggle
                label="Auto-Brightness"
                active={autoBrightness}
                onToggle={() => setAutoBrightness((prev) => !prev)}
              />
              <EffectToggle
                label="Vibrance"
                active={!!vibrance}
                onToggle={() => setVibrance((prev) => (prev ? false : true))}
              />
            </div>
          </div>

          {/* Optimization section */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                fontSize: 12,
                color: "rgba(240,235,228,0.9)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <Zap size={14} />
              <span>Optimization</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  color: "rgba(240,235,228,0.6)",
                  marginBottom: 4,
                }}
              >
                Quality
              </label>
              <select
                value={quality}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "auto" || val === "auto:best" || val === "auto:eco" || val === "auto:low") {
                    setQuality(val);
                  } else {
                    setQuality(Number(val));
                  }
                }}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#f0ebe4",
                  fontSize: 12,
                  outline: "none",
                }}
              >
                {QUALITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  color: "rgba(240,235,228,0.6)",
                  marginBottom: 4,
                }}
              >
                Format
              </label>
              <select
                value={format || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || val === "auto" || val === "webp" || val === "avif" || val === "jpg" || val === "png") {
                    setFormat(val || undefined);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#f0ebe4",
                  fontSize: 12,
                  outline: "none",
                }}
              >
                {FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "rgba(240,235,228,0.6)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Applied Transforms
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {hasCrop && (
                <TransformBadge icon={<Crop size={10} />} label={`Crop ${cropWidth}x${cropHeight}`} />
              )}
              {sharpen && <TransformBadge icon={<Sparkles size={10} />} label="Sharpen" />}
              {improve && <TransformBadge icon={<Sparkles size={10} />} label="Improve" />}
              {autoBrightness && <TransformBadge icon={<Zap size={10} />} label="Brightness" />}
              {vibrance && <TransformBadge icon={<Sparkles size={10} />} label="Vibrance" />}
              {quality && typeof quality === "string" && (
                <TransformBadge icon={<ImageIcon size={10} />} label={quality.replace("auto:", "")} />
              )}
              {quality && typeof quality === "number" && (
                <TransformBadge icon={<ImageIcon size={10} />} label={`Q${quality}`} />
              )}
              {format && <TransformBadge icon={<ImageIcon size={10} />} label={format.toUpperCase()} />}
              {!hasCrop && !hasEffects && !hasOptimization && (
                <span style={{ fontSize: 11, color: "rgba(240,235,228,0.5)", fontStyle: "italic" }}>
                  No transforms selected
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
            <button
              type="button"
              onClick={handleApply}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "rgba(240,235,228,0.9)",
                color: "#1a1a1a",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Check size={16} />
              Apply Transform
            </button>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.05)",
                color: "#f0ebe4",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component for effect toggles
function EffectToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderRadius: 6,
        border: active ? "1px solid rgba(240,235,228,0.4)" : "1px solid rgba(255,255,255,0.1)",
        background: active ? "rgba(240,235,228,0.1)" : "rgba(255,255,255,0.03)",
        color: active ? "#f0ebe4" : "rgba(240,235,228,0.7)",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <span style={{ fontSize: 12 }}>{label}</span>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: active ? "none" : "1px solid rgba(255,255,255,0.3)",
          background: active ? "rgba(240,235,228,0.9)" : "transparent",
          display: "grid",
          placeItems: "center",
        }}
      >
        {active && <Check size={12} color="#1a1a1a" />}
      </div>
    </button>
  );
}

// Sub-component for transform badges
function TransformBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        borderRadius: 4,
        background: "rgba(240,235,228,0.12)",
        color: "#f0ebe4",
        fontSize: 10,
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
