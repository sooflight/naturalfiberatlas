import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  type AiProvider,
  type AiApiKeys,
  type SectionId,
  AI_PROVIDERS,
  getConfiguredProviders,
  generate,
  buildFullNodePrompt,
  buildSectionPrompt,
  parseAiResponse,
  fetchOllamaModels,
} from "../../../utils/admin/aiGenerate";
import type { EditorState } from "./PlateEditor";
import { useAdminSettings } from "@/contexts/AdminSettingsContext";

// ── Styles ──

const panelStyle: React.CSSProperties = {
  width: 340,
  flexShrink: 0,
  borderLeft: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(8,8,8,0.98)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
};

const pillBase: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.1)",
  fontSize: 10,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
  background: "transparent",
  color: "#888",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  fontSize: 11,
  color: "#ddd",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 4,
  outline: "none",
  fontFamily: "inherit",
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  background: "#60a5fa",
  color: "#000",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
};

const PROVIDER_COLORS: Record<AiProvider, string> = {
  openai: "#74aa9c",
  claude: "#d4a574",
  gemini: "#4285f4",
  openrouter: "#8b5cf6",
  ollama: "#22c55e",
};

// ── DiffRow ──

function DiffRow({
  field,
  oldVal,
  newVal,
  accepted,
  onToggle,
}: {
  field: string;
  oldVal: string;
  newVal: string;
  accepted: boolean;
  onToggle: () => void;
}) {
  const changed = oldVal !== newVal;
  const isNew = !oldVal && !!newVal;
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        alignItems: "flex-start",
        padding: "4px 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        opacity: accepted ? 1 : 0.5,
      }}
    >
      <input
        type="checkbox"
        checked={accepted}
        onChange={onToggle}
        style={{ marginTop: 3, accentColor: "#60a5fa", flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, color: "#888", fontWeight: 600, textTransform: "capitalize" }}>
          {field}
          {isNew && <span style={{ color: "#4ade80", marginLeft: 4 }}>NEW</span>}
          {changed && !isNew && <span style={{ color: "#60a5fa", marginLeft: 4 }}>CHANGED</span>}
        </div>
        {changed ? (
          <>
            {oldVal && (
              <div style={{ fontSize: 10, color: "#f87171", textDecoration: "line-through", wordBreak: "break-word" }}>
                {truncate(oldVal, 120)}
              </div>
            )}
            <div style={{ fontSize: 10, color: "#4ade80", wordBreak: "break-word" }}>
              {truncate(newVal, 200)}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 10, color: "#555", wordBreak: "break-word" }}>{truncate(newVal, 120)}</div>
        )}
      </div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

// ── Main Panel ──

interface AiAssistPanelProps {
  nodeId: string;
  state: EditorState;
  targetSection?: SectionId | null;
  onApplyPatch: (patch: Partial<EditorState>) => void;
  onClose: () => void;
}

type AiResult = Record<string, unknown> & {
  nodeData?: Record<string, unknown>;
  passport?: Record<string, unknown>;
  tags?: string[];
  scientificName?: string;
  era?: string;
  origins?: string;
};

export function AiAssistPanel({ nodeId, state, targetSection, onApplyPatch, onClose }: AiAssistPanelProps) {
  const { settings, goToSettings } = useAdminSettings();
  const keys: AiApiKeys = settings.ai;

  const [provider, setProvider] = useState<AiProvider>(() => {
    if (settings.ai.gemini) return "gemini";
    if (settings.ai.openai) return "openai";
    if (settings.ai.claude) return "claude";
    return "ollama";
  });
  const [mode, setMode] = useState<"full" | "section">(targetSection ? "section" : "full");
  const [section, setSection] = useState<SectionId>(targetSection || "identity");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState<AiResult | null>(null);
  const [diffFields, setDiffFields] = useState<{ field: string; oldVal: string; newVal: string; accepted: boolean }[]>([]);
  const [usageInfo, setUsageInfo] = useState<{ model: string; input: number; output: number } | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [selectedOllamaModel, setSelectedOllamaModel] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const configured = useMemo(() => getConfiguredProviders(keys), [keys]);
  const hasKey = useMemo(() => {
    if (provider === "ollama") return true;
    return !!keys[provider];
  }, [keys, provider]);

  const refreshOllamaModels = useCallback(async (url?: string) => {
    const models = await fetchOllamaModels(url || keys.ollama);
    setOllamaModels(models);
    if (models.length > 0 && !selectedOllamaModel) {
      setSelectedOllamaModel(models[0]);
    }
  }, [keys.ollama, selectedOllamaModel]);

  useEffect(() => {
    if (provider === "ollama" && ollamaModels.length === 0) {
      refreshOllamaModels();
    }
  }, [provider]);

  useEffect(() => {
    if (targetSection) {
      setMode("section");
      setSection(targetSection);
    }
  }, [targetSection]);

  const SECTIONS: { id: SectionId; label: string }[] = [
    { id: "identity", label: "Identity" },
    { id: "origin", label: "Origin" },
    { id: "fiber", label: "The Fiber" },
    { id: "processing", label: "Processing" },
    { id: "dyeColor", label: "Dye & Color" },
    { id: "sustainability", label: "Sustainability" },
    { id: "source", label: "Source" },
    { id: "connections", label: "Connections" },
  ];

  const handleGenerate = useCallback(async () => {
    if (!hasKey) { goToSettings?.(); return; }
    setRetryCount(0);
    setLoading(true);
    setError(null);
    setResult(null);
    setDiffFields([]);

    try {
      const messages =
        mode === "full"
          ? buildFullNodePrompt(nodeId, { nodeData: state.nodeData, passport: state.passport })
          : buildSectionPrompt(section, nodeId, { name: state.nodeData.name, type: state.nodeData.type, category: state.nodeData.category });

      if (customPrompt.trim()) {
        messages.push({ role: "user", content: customPrompt.trim() });
      }

      const modelOverride = provider === "ollama" && selectedOllamaModel ? selectedOllamaModel : undefined;
      const res = await generate(provider, keys[provider], messages, { model: modelOverride });
      setUsageInfo({ model: res.model, input: res.usage.input, output: res.usage.output });

      const parsed = parseAiResponse(res.content);
      if (!parsed) {
        setError("Could not parse AI response as JSON. Try again or switch providers.");
        return;
      }

      setResult(parsed);
      buildDiff(parsed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [hasKey, mode, section, nodeId, state, keys, provider, customPrompt, selectedOllamaModel, goToSettings]);

  const handleRetry = useCallback(async () => {
    setRetryCount((c) => c + 1);
    await handleGenerate();
  }, [handleGenerate]);

  const buildDiff = useCallback(
    (parsed: AiResult) => {
      const fields: { field: string; oldVal: string; newVal: string; accepted: boolean }[] = [];

      if (mode === "full" && parsed.nodeData) {
        for (const [k, v] of Object.entries(parsed.nodeData)) {
          if (k === "id" || k === "materialId") continue;
          const oldV = stringify((state.nodeData as Record<string, unknown>)[k]);
          const newV = stringify(v);
          if (newV) fields.push({ field: `nodeData.${k}`, oldVal: oldV, newVal: newV, accepted: oldV !== newV });
        }
      }
      if (mode === "full" && parsed.passport) {
        flattenObject(parsed.passport, "passport", fields, state.passport as Record<string, unknown>);
      }
      if (mode === "full") {
        for (const k of ["era", "origins", "scientificName", "tags"] as const) {
          if (parsed[k] !== undefined) {
            const oldV = stringify((state as unknown as Record<string, unknown>)[k]);
            const newV = stringify(parsed[k]);
            if (newV) fields.push({ field: k, oldVal: oldV, newVal: newV, accepted: oldV !== newV });
          }
        }
      }

      // Section mode: flatten everything at top level
      if (mode === "section") {
        for (const [k, v] of Object.entries(parsed)) {
          const oldV = stringify(readCurrentValue(state, k));
          const newV = stringify(v);
          if (newV) fields.push({ field: k, oldVal: oldV, newVal: newV, accepted: oldV !== newV });
        }
      }

      setDiffFields(fields);
    },
    [mode, state],
  );

  const handleAccept = useCallback(() => {
    if (!result) return;
    const patch: Partial<EditorState> = {};

    if (mode === "full") {
      if (result.nodeData) {
        const accepted = diffFields.filter((f) => f.accepted && f.field.startsWith("nodeData."));
        if (accepted.length) {
          const ndPatch: Record<string, unknown> = { ...(state.nodeData as Record<string, unknown>) };
          for (const f of accepted) {
            const key = f.field.replace("nodeData.", "");
            ndPatch[key] = result.nodeData[key];
          }
          patch.nodeData = ndPatch;
        }
      }
      if (result.passport) {
        const accepted = diffFields.filter((f) => f.accepted && f.field.startsWith("passport."));
        if (accepted.length) {
          patch.passport = deepMerge(state.passport as Record<string, unknown>, result.passport);
        }
      }
      for (const k of ["era", "origins", "scientificName", "tags"] as const) {
        const f = diffFields.find((d) => d.field === k && d.accepted);
        if (f && result[k] !== undefined) {
          (patch as unknown as Record<string, unknown>)[k] = result[k];
        }
      }
    } else {
      // Section mode: map fields back to the correct EditorState slice
      const sectionResult = result;
      patch.nodeData = { ...(state.nodeData as Record<string, unknown>) };
      patch.passport = { ...(state.passport as Record<string, unknown>) };

      for (const f of diffFields) {
        if (!f.accepted) continue;
        const val = sectionResult[f.field];
        if (val === undefined) continue;

        if (isPassportField(f.field)) {
          (patch.passport as Record<string, unknown>)[f.field] = val;
        } else if (f.field === "tags" && Array.isArray(val)) {
          patch.tags = val.map(String);
        } else if (f.field === "scientificName" && typeof val === "string") {
          patch.scientificName = val;
        } else if (f.field === "era" && typeof val === "string") {
          patch.era = val;
        } else if (f.field === "origins" && typeof val === "string") {
          patch.origins = val;
        } else {
          (patch.nodeData as Record<string, unknown>)[f.field] = val;
        }
      }
    }

    onApplyPatch(patch);
    setResult(null);
    setDiffFields([]);
    setCustomPrompt("");
  }, [result, diffFields, mode, state, onApplyPatch]);

  const toggleField = useCallback((idx: number) => {
    setDiffFields((prev) => prev.map((f, i) => (i === idx ? { ...f, accepted: !f.accepted } : f)));
  }, []);

  const acceptedCount = diffFields.filter((f) => f.accepted).length;

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#ddd" }}>AI Assist</span>
          <span style={{ fontSize: 9, color: "#555" }}>{nodeId.replace(/-/g, " ")}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => goToSettings?.()}
            style={{ ...pillBase, fontSize: 9, padding: "2px 8px" }}
            title="Configure API keys in Settings"
          >
            Settings
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}>
            ×
          </button>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflow: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Provider pills */}
        <div>
          <div style={{ fontSize: 9, color: "#666", marginBottom: 4 }}>Provider</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {AI_PROVIDERS.map((p) => {
              const active = provider === p.id;
              const isLocal = p.keyRequired === false;
              const hasK = isLocal || !!keys[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  style={{
                    ...pillBase,
                    background: active ? PROVIDER_COLORS[p.id] + "22" : "transparent",
                    borderColor: active ? PROVIDER_COLORS[p.id] : "rgba(255,255,255,0.08)",
                    color: active ? PROVIDER_COLORS[p.id] : hasK ? "#999" : "#444",
                    opacity: hasK ? 1 : 0.5,
                  }}
                >
                  {p.label}
                  {isLocal && <span style={{ marginLeft: 4, fontSize: 7, color: "#4ade80" }}>local</span>}
                  {!isLocal && !keys[p.id] && <span style={{ marginLeft: 4, fontSize: 8, color: "#f87171" }}>no key</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ollama model selector */}
        {provider === "ollama" && (
          <div>
            <div style={{ fontSize: 9, color: "#666", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
              <span>Ollama Model</span>
              <button onClick={() => refreshOllamaModels()} style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 9, cursor: "pointer", padding: 0 }}>
                Refresh
              </button>
            </div>
            {ollamaModels.length > 0 ? (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {ollamaModels.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedOllamaModel(m)}
                    style={{
                      ...pillBase,
                      fontSize: 9,
                      padding: "3px 8px",
                      background: selectedOllamaModel === m ? "rgba(34,197,94,0.12)" : "transparent",
                      borderColor: selectedOllamaModel === m ? "#22c55e" : "rgba(255,255,255,0.08)",
                      color: selectedOllamaModel === m ? "#4ade80" : "#888",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 10, color: "#555", padding: "6px 0" }}>
                No models found. Make sure Ollama is running and you have models pulled (e.g. <code style={{ color: "#888" }}>ollama pull llama3.1</code>)
              </div>
            )}
          </div>
        )}

        {/* Mode selector */}
        <div>
          <div style={{ fontSize: 9, color: "#666", marginBottom: 4 }}>Mode</div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["full", "section"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  ...pillBase,
                  flex: 1,
                  textAlign: "center",
                  background: mode === m ? "rgba(96,165,250,0.12)" : "transparent",
                  borderColor: mode === m ? "#60a5fa" : "rgba(255,255,255,0.08)",
                  color: mode === m ? "#60a5fa" : "#888",
                }}
              >
                {m === "full" ? "Full Node" : "Section"}
              </button>
            ))}
          </div>
        </div>

        {/* Section selector (section mode) */}
        {mode === "section" && (
          <div>
            <div style={{ fontSize: 9, color: "#666", marginBottom: 4 }}>Target Section</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  style={{
                    ...pillBase,
                    fontSize: 9,
                    padding: "3px 8px",
                    background: section === s.id ? "rgba(96,165,250,0.12)" : "transparent",
                    borderColor: section === s.id ? "#60a5fa" : "rgba(255,255,255,0.08)",
                    color: section === s.id ? "#60a5fa" : "#888",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom prompt */}
        <div>
          <div style={{ fontSize: 9, color: "#666", marginBottom: 4 }}>Additional instructions (optional)</div>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Add specific guidance, e.g. 'Focus on traditional Japanese uses' or 'Include recent sustainability research'..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.4 }}
          />
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !hasKey || (provider === "ollama" && ollamaModels.length === 0)}
          style={{
            ...btnPrimary,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? "wait" : hasKey ? "pointer" : "not-allowed",
            background: hasKey && !(provider === "ollama" && ollamaModels.length === 0) ? "#60a5fa" : "rgba(255,255,255,0.06)",
            color: hasKey && !(provider === "ollama" && ollamaModels.length === 0) ? "#000" : "#555",
          }}
        >
          {loading ? "Generating..." : !hasKey ? "Configure API Key First" : provider === "ollama" && ollamaModels.length === 0 ? "No Ollama models found" : mode === "full" ? "Generate Full Node" : `Generate ${SECTIONS.find((s) => s.id === section)?.label || section}`}
        </button>

        {/* Error */}
        {error && (
          <div style={{ padding: "8px 10px", background: "rgba(248,113,113,0.08)", borderRadius: 6, border: "1px solid rgba(248,113,113,0.2)" }}>
            <div style={{ fontSize: 10, color: "#f87171" }}>{error}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
              <button
                onClick={() => {
                    void handleRetry();
                }}
                disabled={loading}
                style={{ ...pillBase, fontSize: 9, padding: "2px 8px", color: "#fca5a5", borderColor: "rgba(248,113,113,0.3)" }}
              >
                Retry
              </button>
              {retryCount > 0 && (
                <span style={{ fontSize: 9, color: "#777", alignSelf: "center" }}>
                  Retried {retryCount} time{retryCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Usage info */}
        {usageInfo && (
          <div style={{ fontSize: 9, color: "#555", display: "flex", gap: 8 }}>
            <span>Model: {usageInfo.model}</span>
            <span>In: {usageInfo.input}</span>
            <span>Out: {usageInfo.output}</span>
          </div>
        )}

        {/* Diff preview */}
        {diffFields.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#ddd" }}>
                Review Changes ({acceptedCount}/{diffFields.length} selected)
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setDiffFields((prev) => prev.map((f) => ({ ...f, accepted: true })))}
                  style={{ ...pillBase, fontSize: 8, padding: "2px 6px" }}
                >
                  All
                </button>
                <button
                  onClick={() => setDiffFields((prev) => prev.map((f) => ({ ...f, accepted: false })))}
                  style={{ ...pillBase, fontSize: 8, padding: "2px 6px" }}
                >
                  None
                </button>
              </div>
            </div>

            <div style={{ maxHeight: 300, overflow: "auto", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "4px 8px" }}>
              {diffFields.map((f, i) => (
                <DiffRow
                  key={f.field}
                  field={f.field}
                  oldVal={f.oldVal}
                  newVal={f.newVal}
                  accepted={f.accepted}
                  onToggle={() => toggleField(i)}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button
                onClick={() => { setResult(null); setDiffFields([]); }}
                style={{ ...btnPrimary, background: "rgba(255,255,255,0.06)", color: "#888", flex: 1 }}
              >
                Discard
              </button>
              <button
                onClick={handleAccept}
                disabled={acceptedCount === 0}
                style={{ ...btnPrimary, flex: 1, opacity: acceptedCount ? 1 : 0.4 }}
              >
                Apply {acceptedCount} field{acceptedCount !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !result && diffFields.length === 0 && !error && (
          <div style={{ textAlign: "center", color: "#444", fontSize: 11, padding: "20px 10px", lineHeight: 1.6 }}>
            {configured.length === 0 ? (
              <>No providers configured. Click <strong>Keys</strong> above to add API keys, or select <strong>Ollama</strong> for free local models.</>
            ) : (
              <>Select a provider and mode, then click <strong>Generate</strong> to have AI research and fill in data for this node.</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──

function stringify(val: unknown): string {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return JSON.stringify(val);
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix: string,
  out: { field: string; oldVal: string; newVal: string; accepted: boolean }[],
  comparison: Record<string, unknown> | null | undefined,
) {
  for (const [k, v] of Object.entries(obj)) {
    const path = `${prefix}.${k}`;
    if (v && typeof v === "object" && !Array.isArray(v) && !("value" in v) && !("rating" in v)) {
      flattenObject(v as Record<string, unknown>, path, out, (comparison?.[k] as Record<string, unknown> | undefined) ?? undefined);
    } else {
      const oldV = stringify(getNestedValue(comparison, k));
      const newV = stringify(v);
      if (newV) out.push({ field: path, oldVal: oldV, newVal: newV, accepted: oldV !== newV });
    }
  }
}

function getNestedValue(obj: Record<string, unknown> | null | undefined, key: string): unknown {
  if (!obj) return undefined;
  return obj[key];
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target };
  for (const [k, v] of Object.entries(source)) {
    const targetValue = target[k];
    if (v && typeof v === "object" && !Array.isArray(v) && targetValue && typeof targetValue === "object") {
      out[k] = deepMerge(targetValue as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const PASSPORT_FIELDS = new Set([
  "performance", "process", "dyeing", "sustainability", "sourcing", "endUse",
  "strength", "breathability", "drape", "absorbency", "thermalRegulation",
  "durability", "elasticity", "uvResistance", "moistureWicking",
  "spinning", "weaving", "knitting", "finishing", "blending",
  "compatibility", "fastness", "naturalDyeAffinity", "recommendedMethods",
  "waterUsage", "carbonFootprint", "chemicalProcessing", "circularity",
  "biodegradable", "recyclable", "certifications",
  "primaryRegions", "seasonality", "priceRange", "typicalMOQ", "leadTime",
  "apparel", "interiors", "technical", "accessories", "industrial", "bestFor",
]);

function isPassportField(field: string): boolean {
  return PASSPORT_FIELDS.has(field);
}

function readCurrentValue(state: EditorState, field: string): unknown {
  if (field === "tags") return state.tags;
  if (field === "scientificName") return state.scientificName;
  if (field === "era") return state.era;
  if (field === "origins") return state.origins;
  if (isPassportField(field)) return (state.passport as Record<string, unknown>)?.[field];
  return (state.nodeData as Record<string, unknown>)?.[field];
}
