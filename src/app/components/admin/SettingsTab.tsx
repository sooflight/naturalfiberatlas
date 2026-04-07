import React, { useState, useCallback, useEffect, useRef } from "react";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";
import { PROVIDERS, testConnection, type ImageSource } from "@/utils/imageSearch";
import { AI_PROVIDERS, fetchOllamaModels, type AiProvider } from "@/utils/aiGenerate";
import {
  getCloudinarySignedStatus,
  requestCloudinaryUpscale,
  testCloudinaryConnection,
} from "@/utils/cloudinary";
import { logActivity } from "@/utils/activityLog";
import { ATLAS_IMAGES } from "@/data/atlas-images";
import { toast } from "sonner";
import type { ImageMap } from "./image-database";
import { buildProfileImageLinksExport } from "./ImageDatabaseManager";

type ConnectionStatus = "unconnected" | "checking" | "connected" | "error";
const IMAGE_PROVIDER_ORDER_STORAGE_KEY = "atlas-settings-image-provider-order";
const AI_PROVIDER_ORDER_STORAGE_KEY = "atlas-settings-ai-provider-order";
const HIDDEN_IMAGE_PROVIDER_IDS: ImageSource[] = ["flickr"];
const HIDDEN_AI_PROVIDER_IDS: AiProvider[] = ["openai", "claude"];

function readAtlasImagesMapFromStorage(): ImageMap {
  try {
    const s = localStorage.getItem("atlas-images");
    if (!s) return ATLAS_IMAGES;
    const parsed = JSON.parse(s) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return ATLAS_IMAGES;
    return parsed as ImageMap;
  } catch {
    return ATLAS_IMAGES;
  }
}

function readOrderedIds<T extends string>(storageKey: string, fallbackIds: readonly T[]): T[] {
  try {
    if (typeof localStorage?.getItem !== "function") return [...fallbackIds];
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [...fallbackIds];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...fallbackIds];
    const incoming = parsed.filter((id): id is T => typeof id === "string" && fallbackIds.includes(id as T));
    const missing = fallbackIds.filter((id) => !incoming.includes(id));
    return [...incoming, ...missing];
  } catch {
    return [...fallbackIds];
  }
}

function writeOrderedIds(storageKey: string, ids: readonly string[]): void {
  try {
    if (typeof localStorage?.setItem !== "function") return;
    localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    // Ignore storage write issues in constrained environments.
  }
}

function reorderIds<T extends string>(ids: readonly T[], fromId: T, toId: T): T[] {
  if (fromId === toId) return [...ids];
  const next = [...ids];
  const fromIdx = next.indexOf(fromId);
  const toIdx = next.indexOf(toId);
  if (fromIdx < 0 || toIdx < 0) return next;
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

// ── Section Wrapper ──

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "rgba(255,255,255,0.02)",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.05em",
        }}
      >
        {title}
        <span style={{ fontSize: 10, color: "#666", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
      </button>
      {open && <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>}
    </div>
  );
}

// ── Inline field row ──

function KeyRow({
  label,
  sublabel,
  color,
  configUrl,
  value,
  onChange,
  isPassword,
  testFn,
  testLabel,
  hideInput,
  alwaysConnected,
  dragHandleProps,
}: {
  label: string;
  sublabel?: string;
  color?: string;
  configUrl?: string;
  value: string;
  onChange: (v: string) => void;
  isPassword?: boolean;
  testFn?: () => Promise<void>;
  testLabel?: string;
  hideInput?: boolean;
  alwaysConnected?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const safeValue = typeof value === "string" ? value : String(value ?? "");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    alwaysConnected ? "connected" : safeValue.trim() ? (testFn ? "checking" : "connected") : "unconnected"
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const autoTestSeqRef = useRef(0);
  const savedNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedNoticeTimerRef.current) clearTimeout(savedNoticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (alwaysConnected) {
      setConnectionStatus("connected");
      setResult(null);
      return;
    }
    if (!testFn || hideInput) return;
    const trimmed = safeValue.trim();
    if (!trimmed) {
      setConnectionStatus("unconnected");
      setResult(null);
      return;
    }

    const seq = ++autoTestSeqRef.current;
    setConnectionStatus("checking");
    const timer = setTimeout(async () => {
      try {
        await testFn();
        if (autoTestSeqRef.current !== seq) return;
        setConnectionStatus("connected");
        setResult({ ok: true, msg: "Connected!" });
      } catch (e: any) {
        if (autoTestSeqRef.current !== seq) return;
        setConnectionStatus("error");
        setResult({ ok: false, msg: e.message?.slice(0, 100) || "Failed" });
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [safeValue, testFn, alwaysConnected, hideInput]);

  useEffect(() => {
    if (alwaysConnected || testFn || hideInput) return;
    setConnectionStatus(safeValue.trim() ? "connected" : "unconnected");
  }, [safeValue, alwaysConnected, testFn, hideInput]);

  const handleTest = async () => {
    if (!testFn || hideInput) return;
    autoTestSeqRef.current += 1;
    setTesting(true);
    setConnectionStatus("checking");
    setResult(null);
    try {
      await testFn();
      setConnectionStatus("connected");
      setResult({ ok: true, msg: "Connected!" });
    } catch (e: any) {
      setConnectionStatus("error");
      setResult({ ok: false, msg: e.message?.slice(0, 100) || "Failed" });
    } finally {
      setTesting(false);
    }
  };

  const statusColor =
    connectionStatus === "connected"
      ? "#4ade80"
      : connectionStatus === "error"
        ? "#fb923c"
        : "rgba(255,255,255,0.78)";
  const statusOpacity = connectionStatus === "unconnected" ? 0.38 : 1;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div
          {...dragHandleProps}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            ...(dragHandleProps?.style ?? {}),
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 500, color: color || "#ddd" }}>{label}</span>
          {sublabel && <span style={{ fontSize: 10, color: "#555" }}>{sublabel}</span>}
        </div>
        {configUrl && (
          <a href={configUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#555", textDecoration: "none" }}>
            {isPassword ? "Get key →" : "Docs →"}
          </a>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span
          data-testid={`${label}-connection-light`}
          data-status={connectionStatus}
          title={`Connection: ${connectionStatus}`}
          aria-label={`${label} connection status`}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: statusColor,
            opacity: statusOpacity,
            boxShadow: connectionStatus === "connected" ? "0 0 8px rgba(74,222,128,0.7)" : "none",
            border: "1px solid rgba(255,255,255,0.25)",
            flexShrink: 0,
          }}
        />
        {hideInput ? (
          <div
            style={{
              flex: 1,
              padding: "7px 10px",
              fontSize: 11,
              borderRadius: 8,
              border: "1px dashed rgba(74,222,128,0.35)",
              background: "rgba(74,222,128,0.1)",
              color: "#86efac",
            }}
          >
            No key required
          </div>
        ) : (
          <input
            type={isPassword ? "password" : "text"}
            value={safeValue}
            onChange={(e) => {
              const nextValue = e.target.value;
              onChange(nextValue);
              setResult(null);
              if (isPassword) {
                const hasValue = nextValue.trim().length > 0;
                if (savedNoticeTimerRef.current) clearTimeout(savedNoticeTimerRef.current);
                if (hasValue) {
                  setSavedNotice("Key received and saved");
                  savedNoticeTimerRef.current = setTimeout(() => setSavedNotice(null), 2000);
                } else {
                  setSavedNotice(null);
                  setConnectionStatus("unconnected");
                }
              }
            }}
            placeholder={isPassword ? `${label} API key…` : `${label} URL…`}
            style={{
              flex: 1,
              padding: "7px 10px",
              fontSize: 12,
              fontFamily: "monospace",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              color: "#ddd",
              outline: "none",
            }}
          />
        )}
        {testFn && !hideInput && (
          <button
            onClick={handleTest}
            disabled={testing || (isPassword && !safeValue.trim())}
            style={{
              padding: "6px 14px",
              fontSize: 11,
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              background: "transparent",
              color: testing ? "#555" : "#aaa",
              cursor: testing ? "wait" : "pointer",
              whiteSpace: "nowrap",
              opacity: testing || (isPassword && !safeValue.trim()) ? 0.4 : 1,
            }}
          >
            {testing ? "…" : testLabel || "Test"}
          </button>
        )}
      </div>
      {savedNotice && <div style={{ fontSize: 10, marginTop: 4, color: "#93c5fd" }}>{savedNotice}</div>}
      {result && (
        <div style={{ fontSize: 10, marginTop: 4, color: result.ok ? "#4ade80" : "#f87171" }}>{result.msg}</div>
      )}
    </div>
  );
}

// ── Main Settings Tab ──

export default function SettingsTab() {
  const { settings, updateSettings: rawUpdate } = useAdminSettings();
  const updateSettings = useCallback((patch: Parameters<typeof rawUpdate>[0]) => {
    rawUpdate(patch);
    const keys = Object.keys(patch);
    logActivity({ tab: "settings", action: "update", entityType: "settings", entityId: keys.join(","), summary: `Updated settings: ${keys.join(", ")}` });
  }, [rawUpdate]);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [cloudinarySignedCheck, setCloudinarySignedCheck] = useState<{ ok: boolean; msg: string } | null>(null);
  const [checkingCloudinarySigned, setCheckingCloudinarySigned] = useState(false);
  const [cloudinaryUpscaleUrl, setCloudinaryUpscaleUrl] = useState(
    "https://res.cloudinary.com/demo/image/upload/sample.jpg"
  );
  const [cloudinaryUpscaleScale, setCloudinaryUpscaleScale] = useState<"2x" | "4x">("2x");
  const [cloudinaryUpscaleTesting, setCloudinaryUpscaleTesting] = useState(false);
  const [cloudinaryUpscaleResult, setCloudinaryUpscaleResult] = useState<{ ok: boolean; msg: string; url?: string } | null>(null);
  const [draggingImageProviderId, setDraggingImageProviderId] = useState<ImageSource | null>(null);
  const [draggingAiProviderId, setDraggingAiProviderId] = useState<AiProvider | null>(null);
  const visibleImageProviders = PROVIDERS.filter((p) => !HIDDEN_IMAGE_PROVIDER_IDS.includes(p.id));
  const visibleAiProviders = AI_PROVIDERS.filter((p) => !HIDDEN_AI_PROVIDER_IDS.includes(p.id));

  const [imageProviderOrder, setImageProviderOrder] = useState<ImageSource[]>(
    () => readOrderedIds<ImageSource>(IMAGE_PROVIDER_ORDER_STORAGE_KEY, visibleImageProviders.map((p) => p.id))
  );
  const [aiProviderOrder, setAiProviderOrder] = useState<AiProvider[]>(
    () => readOrderedIds<AiProvider>(AI_PROVIDER_ORDER_STORAGE_KEY, visibleAiProviders.map((p) => p.id))
  );

  useEffect(() => {
    writeOrderedIds(IMAGE_PROVIDER_ORDER_STORAGE_KEY, imageProviderOrder);
  }, [imageProviderOrder]);

  useEffect(() => {
    writeOrderedIds(AI_PROVIDER_ORDER_STORAGE_KEY, aiProviderOrder);
  }, [aiProviderOrder]);

  const handleExportProfileImageLinks = useCallback(() => {
    try {
      const images = readAtlasImagesMapFromStorage();
      const payload = buildProfileImageLinksExport(images);
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `atlas-profile-image-links-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(blobUrl);
      toast.success(`Exported ${payload.imageLinkCount} image links from ${payload.profileCount} profiles`);
      logActivity({
        tab: "settings",
        action: "export",
        entityType: "settings",
        entityId: "profile-image-links",
        summary: `Exported profile image links JSON (${payload.profileCount} profiles)`,
      });
    } catch {
      toast.error("Export failed. Try again.");
    }
  }, []);

  const orderedImageProviders = [...visibleImageProviders].sort(
    (a, b) => imageProviderOrder.indexOf(a.id) - imageProviderOrder.indexOf(b.id)
  );
  const orderedAiProviders = [...visibleAiProviders].sort(
    (a, b) => aiProviderOrder.indexOf(a.id) - aiProviderOrder.indexOf(b.id)
  );

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
      }}
    >
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "32px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Settings</h2>
        <p style={{ fontSize: 11, color: "#666", margin: "4px 0 0" }}>
          All API keys and preferences — shared across every admin tab.
        </p>
      </div>

      {/* Image Sources */}
      <Section title="Image Sources">
        {orderedImageProviders.map((p) => {
          const raw = settings.imageSearch[p.id];
          const providerValue = typeof raw === "string" ? raw : "";
          return (
            <div
              key={p.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!draggingImageProviderId) return;
                setImageProviderOrder((prev) => reorderIds(prev, draggingImageProviderId, p.id));
              }}
              style={{
                border:
                  draggingImageProviderId === p.id ? "1px solid rgba(96,165,250,0.45)" : "1px solid transparent",
                borderRadius: 10,
                padding: 6,
              }}
            >
              <KeyRow
                label={p.label}
                sublabel={p.description}
                color={p.color === "#ffffff" ? "#ddd" : p.color}
                configUrl={p.configUrl}
                value={providerValue === "_none_" ? "" : providerValue}
                onChange={(v) => updateSettings({ imageSearch: { [p.id]: v || (p.keyRequired ? "" : "_none_") } })}
                isPassword={p.keyRequired}
                testFn={p.keyRequired ? () => testConnection(p.id, providerValue || "_none_") : undefined}
                hideInput={!p.keyRequired}
                alwaysConnected={!p.keyRequired}
                dragHandleProps={{
                  draggable: true,
                  onDragStart: () => setDraggingImageProviderId(p.id),
                  onDragEnd: () => setDraggingImageProviderId(null),
                  style: { cursor: "grab" },
                  title: "Drag to reorder",
                }}
              />
            </div>
          );
        })}
      </Section>

      {/* AI Providers */}
      <Section title="AI Providers">
        {orderedAiProviders.map((p) => {
          const isOllama = p.id === "ollama";
          return (
            <div
              key={p.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!draggingAiProviderId) return;
                setAiProviderOrder((prev) => reorderIds(prev, draggingAiProviderId, p.id));
              }}
              style={{
                border:
                  draggingAiProviderId === p.id ? "1px solid rgba(96,165,250,0.45)" : "1px solid transparent",
                borderRadius: 10,
                padding: 6,
              }}
            >
              <KeyRow
                label={p.label}
                sublabel={p.description}
                color={isOllama ? "#4ade80" : undefined}
                configUrl={p.configUrl}
                value={settings.ai[p.id]}
                onChange={(v) => updateSettings({ ai: { [p.id]: v } })}
                isPassword={p.keyRequired !== false}
                testFn={
                  isOllama
                    ? async () => {
                        const models = await fetchOllamaModels(settings.ai.ollama || "http://localhost:11434");
                        if (models.length === 0) throw new Error("No models found — pull one with `ollama pull`");
                        setOllamaModels(models);
                      }
                    : undefined
                }
                testLabel={isOllama ? "Discover Models" : "Test"}
                dragHandleProps={{
                  draggable: true,
                  onDragStart: () => setDraggingAiProviderId(p.id),
                  onDragEnd: () => setDraggingAiProviderId(null),
                  style: { cursor: "grab" },
                  title: "Drag to reorder",
                }}
              />
              {isOllama && ollamaModels.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ollamaModels.map((m) => (
                    <span
                      key={m}
                      style={{
                        padding: "3px 10px",
                        fontSize: 10,
                        borderRadius: 20,
                        background: "rgba(74,222,128,0.1)",
                        border: "1px solid rgba(74,222,128,0.2)",
                        color: "#4ade80",
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Section>

      {/* Cloudinary */}
      <Section title="Cloudinary (Image Uploads)">
        <KeyRow
          label="Cloud Name"
          value={settings.cloudinary.cloudName}
          onChange={(v) => updateSettings({ cloudinary: { cloudName: v.trim() } })}
        />
        <KeyRow
          label="Upload Preset"
          sublabel="Must be unsigned"
          value={settings.cloudinary.uploadPreset}
          onChange={(v) => updateSettings({ cloudinary: { uploadPreset: v.trim() } })}
          testFn={
            settings.cloudinary.cloudName && settings.cloudinary.uploadPreset
              ? async () => { await testCloudinaryConnection({ cloudName: settings.cloudinary.cloudName, uploadPreset: settings.cloudinary.uploadPreset }); }
              : undefined
          }
          testLabel="Test Upload"
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={async () => {
              setCheckingCloudinarySigned(true);
              setCloudinarySignedCheck(null);
              try {
                const status = await getCloudinarySignedStatus();
                if (!status.configured) {
                  setCloudinarySignedCheck({
                    ok: false,
                    msg: "Signed tools missing env vars (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)",
                  });
                } else {
                  setCloudinarySignedCheck({ ok: true, msg: "Signed Cloudinary tools are configured on the server." });
                }
              } catch (err: any) {
                setCloudinarySignedCheck({ ok: false, msg: err.message || "Signed tools check failed" });
              } finally {
                setCheckingCloudinarySigned(false);
              }
            }}
            disabled={checkingCloudinarySigned}
            style={{
              padding: "6px 12px",
              fontSize: 11,
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              background: "transparent",
              color: checkingCloudinarySigned ? "#555" : "#aaa",
              cursor: checkingCloudinarySigned ? "wait" : "pointer",
            }}
          >
            {checkingCloudinarySigned ? "…" : "Check Signed Tools"}
          </button>
          {cloudinarySignedCheck && (
            <span style={{ fontSize: 10, color: cloudinarySignedCheck.ok ? "#4ade80" : "#f87171" }}>
              {cloudinarySignedCheck.msg}
            </span>
          )}
        </div>
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>Cloudinary Upscale (Signed Tools)</div>
          <div style={{ fontSize: 10, color: "#666" }}>
            Runs a server-signed Cloudinary upscale request against a sample image URL.
          </div>
          <input
            type="text"
            value={cloudinaryUpscaleUrl}
            onChange={(e) => {
              setCloudinaryUpscaleUrl(e.target.value);
              setCloudinaryUpscaleResult(null);
            }}
            placeholder="https://..."
            style={{
              width: "100%",
              padding: "7px 10px",
              fontSize: 12,
              fontFamily: "monospace",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              color: "#ddd",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={cloudinaryUpscaleScale}
              onChange={(e) => {
                setCloudinaryUpscaleScale(e.target.value === "4x" ? "4x" : "2x");
                setCloudinaryUpscaleResult(null);
              }}
              style={{
                padding: "6px 10px",
                fontSize: 11,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                color: "#ddd",
              }}
            >
              <option value="2x">2x</option>
              <option value="4x">4x</option>
            </select>
            <button
              onClick={async () => {
                setCloudinaryUpscaleTesting(true);
                setCloudinaryUpscaleResult(null);
                try {
                  const secureUrl = await requestCloudinaryUpscale({
                    imageUrl: cloudinaryUpscaleUrl.trim(),
                    cloudName: settings.cloudinary.cloudName,
                    scale: cloudinaryUpscaleScale,
                  });
                  setCloudinaryUpscaleResult({
                    ok: true,
                    msg: "Upscale test succeeded.",
                    url: secureUrl,
                  });
                } catch (err: any) {
                  setCloudinaryUpscaleResult({
                    ok: false,
                    msg: err.message || "Upscale test failed",
                  });
                } finally {
                  setCloudinaryUpscaleTesting(false);
                }
              }}
              disabled={
                cloudinaryUpscaleTesting ||
                !settings.cloudinary.cloudName ||
                !cloudinaryUpscaleUrl.trim()
              }
              style={{
                padding: "6px 12px",
                fontSize: 11,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                background: "transparent",
                color: cloudinaryUpscaleTesting ? "#555" : "#aaa",
                cursor: cloudinaryUpscaleTesting ? "wait" : "pointer",
                opacity:
                  cloudinaryUpscaleTesting || !settings.cloudinary.cloudName || !cloudinaryUpscaleUrl.trim()
                    ? 0.5
                    : 1,
              }}
            >
              {cloudinaryUpscaleTesting ? "…" : "Run Upscale Test"}
            </button>
          </div>
          {cloudinaryUpscaleResult && (
            <div style={{ fontSize: 10, color: cloudinaryUpscaleResult.ok ? "#4ade80" : "#f87171" }}>
              {cloudinaryUpscaleResult.msg}{" "}
              {cloudinaryUpscaleResult.url && (
                <a
                  href={cloudinaryUpscaleResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#93c5fd", textDecoration: "underline" }}
                >
                  Open result
                </a>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Image Upscaling */}
      <Section title="Image Upscaling">
        <KeyRow
          label="Replicate"
          sublabel="Cloud HD upscaling via Real-ESRGAN x4plus"
          color="#c084fc"
          configUrl="https://replicate.com/account/api-tokens"
          value={settings.upscale.replicateApiKey}
          onChange={(v) => updateSettings({ upscale: { replicateApiKey: v.trim() } })}
          isPassword
        />
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "#ddd" }}>Default Engine</span>
            <span style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>{settings.upscale.defaultEngine}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["slim", "medium", "replicate", "cloudinary"] as const).map((eng) => (
              <button
                key={eng}
                onClick={() => updateSettings({ upscale: { defaultEngine: eng } })}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: `1px solid ${settings.upscale.defaultEngine === eng ? "rgba(192,132,252,0.4)" : "rgba(255,255,255,0.08)"}`,
                  background: settings.upscale.defaultEngine === eng ? "rgba(192,132,252,0.15)" : "transparent",
                  color: settings.upscale.defaultEngine === eng ? "#c084fc" : "#888",
                  cursor: "pointer",
                }}
              >
                {eng === "slim" ? "Quick" : eng === "medium" ? "Quality" : eng === "replicate" ? "Cloud HD" : "Cloudinary AI"}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>
            Quick = fast/lightweight. Quality = better textures, slower. Cloud HD = Replicate API. Cloudinary AI = server-signed Cloudinary upscale.
          </div>
        </div>
      </Section>

      {/* Profile image links export */}
      <Section title="Profile image links">
        <p style={{ fontSize: 11, color: "#888", lineHeight: 1.5, margin: 0 }}>
          Export gallery URLs per profile from the Image Base workspace (stored in{" "}
          <span style={{ fontFamily: "monospace" }}>localStorage</span> as{" "}
          <span style={{ fontFamily: "monospace" }}>atlas-images</span>).
        </p>
        <button
          type="button"
          onClick={handleExportProfileImageLinks}
          style={{
            alignSelf: "flex-start",
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "#ddd",
            cursor: "pointer",
          }}
        >
          Export JSON
        </button>
      </Section>

      {/* Preferences */}
      <Section title="Preferences">
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "#ddd" }}>Default Thumbnail Zoom</span>
            <span style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>{settings.preferences.defaultZoom}px</span>
          </div>
          <input
            type="range"
            min={80}
            max={400}
            step={20}
            value={settings.preferences.defaultZoom}
            onChange={(e) => updateSettings({ preferences: { defaultZoom: Number(e.target.value) } })}
            style={{ width: "100%", accentColor: "#60a5fa" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#555" }}>
            <span>80px</span>
            <span>400px</span>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <div style={{ fontSize: 10, color: "#444", textAlign: "center", paddingTop: 8 }}>
        Settings persist in <span style={{ fontFamily: "monospace" }}>localStorage</span> and sync across all admin tabs.
      </div>
    </div>
    </div>
  );
}
