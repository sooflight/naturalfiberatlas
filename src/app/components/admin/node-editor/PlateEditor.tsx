import React, { useState, useCallback } from "react";
import type { NodeData, NodeVariety } from "../../../hooks/useNodeData";
import type { MaterialPassport, ConfidenceLevel, RatedProperty, SourcedValue } from "../../../types/material";
import type { VideoEntry, EmbedEntry, LinkEntry, ImageEntry } from "../../../types/atlas-media";
import { extractImageUrl } from "../../../utils/admin/imageUrl";
import type { SectionId } from "../../../utils/admin/aiGenerate";
import {
  TextInput,
  RatingSlider,
  SourcedDropdown,
  ChipInput,
  KVEditor,
  OrderedListEditor,
  RepeatingGroup,
  Toggle,
  VideoInput,
  EmbedInput,
  LinkInput,
  MarkdownEditor,
} from "./field-editors";

// ── Types ────────────────────────────────────────────────────

export interface EditorState {
  nodeData: Partial<NodeData>;
  passport: Partial<MaterialPassport>;
  images: ImageEntry[];
  videos: VideoEntry[];
  embeds: EmbedEntry[];
  links: LinkEntry[];
  era: string;
  origins: string;
  scientificName: string;
  tags: string[];
}

interface PlateEditorProps {
  nodeId: string;
  state: EditorState;
  onChange: (next: EditorState) => void;
  onAiRequest?: (sectionId: SectionId) => void;
  onOpenScout?: () => void;
}

// ── Accordion Section ────────────────────────────────────────

function Section({
  title,
  hasData,
  defaultOpen,
  sectionId,
  onAiRequest,
  children,
}: {
  title: string;
  hasData: boolean;
  defaultOpen?: boolean;
  sectionId?: SectionId;
  onAiRequest?: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            padding: "10px 12px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#ddd",
            fontSize: 12,
            gap: 8,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: hasData ? "#0F783C" : "#333",
              flexShrink: 0,
            }}
          />
          <span style={{ flex: 1, textAlign: "left", fontWeight: 500 }}>{title}</span>
          <span style={{ fontSize: 10, color: "#555" }}>{open ? "▾" : "▸"}</span>
        </button>
        {sectionId && onAiRequest && (
          <button
            onClick={(e) => { e.stopPropagation(); onAiRequest(sectionId); }}
            title={`AI-generate ${title} data`}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#555",
              fontSize: 13,
              padding: "4px 10px 4px 0",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "#60a5fa"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "#555"; }}
          >
            ✦
          </button>
        )}
      </div>
      {open && <div style={{ padding: "4px 12px 14px", display: "grid", gap: 10 }}>{children}</div>}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function rated(prop: RatedProperty | undefined): { rating: number; label: string; confidence: ConfidenceLevel } {
  return {
    rating: prop?.rating ?? 3,
    label: prop?.label ?? "Moderate",
    confidence: prop?.confidence ?? "estimated",
  };
}

function sourced<T>(prop: SourcedValue<T> | undefined, fallback: T): { value: T; confidence: ConfidenceLevel } {
  return {
    value: prop?.value ?? fallback,
    confidence: prop?.confidence ?? "estimated",
  };
}

// ── Component ────────────────────────────────────────────────

export function PlateEditor({ nodeId, state, onChange, onAiRequest, onOpenScout }: PlateEditorProps) {
  const nd = state.nodeData;
  const pp = state.passport;

  const updateND = useCallback(
    (patch: Partial<NodeData>) => onChange({ ...state, nodeData: { ...nd, ...patch } }),
    [state, nd, onChange]
  );

  const updatePP = useCallback(
    (patch: Partial<MaterialPassport>) => onChange({ ...state, passport: { ...pp, ...patch } }),
    [state, pp, onChange]
  );

  const updateMeta = useCallback(
    (patch: Partial<Pick<EditorState, "era" | "origins" | "scientificName" | "tags" | "images">>) =>
      onChange({ ...state, ...patch }),
    [state, onChange]
  );

  const perf = pp.performance ?? {};
  const proc = pp.process ?? {};
  const dye = pp.dyeing ?? {};
  const sust = pp.sustainability ?? {};
  const src = pp.sourcing ?? {};
  const endUse = pp.endUse ?? {};

  const PERF_KEYS: (keyof NonNullable<MaterialPassport["performance"]>)[] = [
    "strength", "breathability", "drape", "absorbency", "thermalRegulation",
    "durability", "elasticity", "uvResistance", "moistureWicking",
  ];

  const PROC_OPTIONS = ["excellent", "good", "fair", "poor", "not-applicable"];
  const DYE_COMPAT_OPTIONS = ["excellent", "good", "fair", "poor"];
  const DYE_AFFINITY_OPTIONS = ["high", "moderate", "low"];
  const PRICE_OPTIONS = ["low", "moderate", "high", "premium"];

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontSize: 11, color: "#888" }}>
        Editing: <span style={{ color: "#eee", textTransform: "capitalize" }}>{nodeId.replace(/-/g, " ")}</span>
      </div>

      {/* ── 1. Identity ── */}
      <Section title="Identity" hasData={!!(nd.name || nd.tagline)} defaultOpen sectionId="identity" onAiRequest={onAiRequest}>
        <TextInput label="Name" value={nd.name || ""} onChange={(v) => updateND({ name: v })} placeholder="Material name" />
        <TextInput label="Scientific Name" value={state.scientificName} onChange={(v) => updateMeta({ scientificName: v })} placeholder="Genus species" />
        <TextInput label="Tagline" value={nd.tagline || ""} onChange={(v) => updateND({ tagline: v })} placeholder="Short description" />
        <TextInput label="Type" value={nd.type || ""} onChange={(v) => updateND({ type: v })} placeholder="fiber, textile, dye..." />
        <TextInput label="Category" value={nd.category || ""} onChange={(v) => updateND({ category: v })} />
        <TextInput label="Subcategory" value={nd.subcategory || ""} onChange={(v) => updateND({ subcategory: v })} />
        <TextInput label="Portal" value={nd.portal || ""} onChange={(v) => updateND({ portal: v })} />
        <TextInput label="Era" value={state.era} onChange={(v) => updateMeta({ era: v })} placeholder="Ancient, Medieval..." />
        <TextInput label="Origins" value={state.origins} onChange={(v) => updateMeta({ origins: v })} placeholder="Region of origin" />
        <ChipInput label="Tags" values={state.tags} onChange={(v) => updateMeta({ tags: v })} placeholder="Add tag..." />
      </Section>

      {/* ── 2. Gallery ── */}
      <Section title="Gallery" hasData={state.images.length > 0} sectionId={undefined}>
        <div style={{ fontSize: 9, color: "#666", marginBottom: 4 }}>
          Image order determines plate assignment: 1=Hero, 2=Origin, 3=Fiber, 4=Process, 5=Color
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 6 }}>
          {state.images.map((entry, i) => {
            const url = extractImageUrl(entry);
            const isRich = typeof entry === "object";
            return (
              <div key={i} style={{ position: "relative" }}>
                <div
                  style={{
                    aspectRatio: "4/3",
                    borderRadius: 4,
                    overflow: "hidden",
                    background: "#111",
                    border: isRich ? "1px solid rgba(96,165,250,0.25)" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <span style={{ position: "absolute", top: 2, left: 4, fontSize: 8, color: "#60a5fa" }}>{i + 1}</span>
                {isRich && (
                  <span
                    style={{ position: "absolute", bottom: 2, left: 4, fontSize: 7, color: "#60a5fa", background: "rgba(0,0,0,0.7)", padding: "1px 3px", borderRadius: 3 }}
                    title={[entry.provider, entry.rights, entry.attribution].filter(Boolean).join(" · ")}
                  >
                    {entry.provider || "meta"}
                  </span>
                )}
                <button
                  onClick={() => updateMeta({ images: state.images.filter((_, j) => j !== i) })}
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.7)",
                    border: "none",
                    color: "#f87171",
                    fontSize: 9,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  x
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            placeholder="Paste image URL..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) {
                  updateMeta({ images: [...state.images, val] });
                  (e.target as HTMLInputElement).value = "";
                }
              }
            }}
            style={{
              flex: 1,
              padding: "6px 8px",
              fontSize: 11,
              color: "#ddd",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 4,
              outline: "none",
            }}
          />
          {onOpenScout && (
            <button
              onClick={onOpenScout}
              style={{
                padding: "5px 12px",
                borderRadius: 4,
                border: "1px solid rgba(96,165,250,0.2)",
                background: "transparent",
                color: "#60a5fa",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                whiteSpace: "nowrap",
              }}
            >
              <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              Scout
            </button>
          )}
        </div>
      </Section>

      {/* ── 3. Videos ── */}
      <Section title="Videos" hasData={state.videos.length > 0}>
        <VideoInput
          items={state.videos}
          onChange={(v) => onChange({ ...state, videos: v })}
        />
      </Section>

      {/* ── 4. Embeds ── */}
      <Section title="Embeds" hasData={state.embeds.length > 0}>
        <EmbedInput
          items={state.embeds}
          onChange={(v) => onChange({ ...state, embeds: v })}
        />
      </Section>

      {/* ── 5. Links & Resources ── */}
      <Section title="Links & Resources" hasData={state.links.length > 0}>
        <LinkInput
          items={state.links}
          onChange={(v) => onChange({ ...state, links: v })}
        />
      </Section>

      {/* ── 6. Origin ── */}
      <Section title="Origin" hasData={!!(nd.summary || nd.culturalSignificance)} sectionId="origin" onAiRequest={onAiRequest}>
        <MarkdownEditor label="Summary" value={nd.summary || ""} onChange={(v) => updateND({ summary: v })} placeholder="Overview of this material..." />
        <TextInput label="Cultural Significance" value={nd.culturalSignificance || ""} onChange={(v) => updateND({ culturalSignificance: v })} multiline />
        <ChipInput
          label="Primary Regions"
          values={sourced(src.primaryRegions, []).value as string[]}
          onChange={(v) => updatePP({ sourcing: { ...src, primaryRegions: { value: v, confidence: sourced(src.primaryRegions, []).confidence } } })}
        />
        <TextInput
          label="Seasonality"
          value={sourced(src.seasonality, "").value as string}
          onChange={(v) => updatePP({ sourcing: { ...src, seasonality: { value: v, confidence: sourced(src.seasonality, "").confidence } } })}
        />
        <SourcedDropdown
          label="Price Range"
          value={sourced(src.priceRange, "moderate").value as string}
          options={PRICE_OPTIONS}
          confidence={sourced(src.priceRange, "moderate").confidence}
          onChange={(v) => updatePP({ sourcing: { ...src, priceRange: { value: v.value as any, confidence: v.confidence } } })}
        />
      </Section>

      {/* ── 7. The Fiber ── */}
      <Section title="The Fiber" hasData={!!pp.performance || !!nd.properties} sectionId="fiber" onAiRequest={onAiRequest}>
        <div style={{ fontSize: 9, color: "#666", marginBottom: 4 }}>Performance Ratings</div>
        {PERF_KEYS.map((key) => {
          const r = rated(perf[key]);
          return (
            <RatingSlider
              key={key}
              label={key}
              rating={r.rating}
              ratingLabel={r.label}
              confidence={r.confidence}
              onChange={(v) => updatePP({ performance: { ...perf, [key]: { rating: v.rating, label: v.label, confidence: v.confidence } } })}
            />
          );
        })}
        <KVEditor
          label="Properties (fallback)"
          pairs={nd.properties || {}}
          onChange={(v) => updateND({ properties: v })}
        />
      </Section>

      {/* ── 8. Processing ── */}
      <Section title="Processing" hasData={!!pp.process || !!(nd.processing && nd.processing.length > 0)} sectionId="processing" onAiRequest={onAiRequest}>
        {(["spinning", "weaving", "knitting", "finishing"] as const).map((key) => {
          const s = sourced(proc[key] as SourcedValue<string> | undefined, "good");
          return (
            <SourcedDropdown
              key={key}
              label={key}
              value={s.value}
              options={PROC_OPTIONS}
              confidence={s.confidence}
              onChange={(v) => updatePP({ process: { ...proc, [key]: { value: v.value, confidence: v.confidence } } })}
            />
          );
        })}
        <TextInput
          label="Blending"
          value={sourced(proc.blending, "").value as string}
          onChange={(v) => updatePP({ process: { ...proc, blending: { value: v, confidence: sourced(proc.blending, "").confidence } } })}
        />
        <OrderedListEditor
          label="Processing Steps"
          items={nd.processing || []}
          onChange={(v) => updateND({ processing: v })}
          placeholder="Processing step..."
        />
      </Section>

      {/* ── 9. Dye & Color ── */}
      <Section title="Dye & Color" hasData={!!pp.dyeing || !!nd.dyeCompatibility} sectionId="dyeColor" onAiRequest={onAiRequest}>
        <SourcedDropdown
          label="Compatibility"
          value={sourced(dye.compatibility, "good").value as string}
          options={DYE_COMPAT_OPTIONS}
          confidence={sourced(dye.compatibility, "good").confidence}
          onChange={(v) => updatePP({ dyeing: { ...dye, compatibility: { value: v.value as any, confidence: v.confidence } } })}
        />
        <SourcedDropdown
          label="Fastness"
          value={sourced(dye.fastness, "good").value as string}
          options={DYE_COMPAT_OPTIONS}
          confidence={sourced(dye.fastness, "good").confidence}
          onChange={(v) => updatePP({ dyeing: { ...dye, fastness: { value: v.value as any, confidence: v.confidence } } })}
        />
        <SourcedDropdown
          label="Natural Dye Affinity"
          value={sourced(dye.naturalDyeAffinity, "moderate").value as string}
          options={DYE_AFFINITY_OPTIONS}
          confidence={sourced(dye.naturalDyeAffinity, "moderate").confidence}
          onChange={(v) => updatePP({ dyeing: { ...dye, naturalDyeAffinity: { value: v.value as any, confidence: v.confidence } } })}
        />
        <ChipInput
          label="Recommended Methods"
          values={sourced(dye.recommendedMethods, []).value as string[]}
          onChange={(v) => updatePP({ dyeing: { ...dye, recommendedMethods: { value: v, confidence: sourced(dye.recommendedMethods, []).confidence } } })}
        />
        <TextInput
          label="Notes"
          value={dye.notes || ""}
          onChange={(v) => updatePP({ dyeing: { ...dye, notes: v } })}
          multiline
        />
        <KVEditor
          label="Dye Compatibility (fallback)"
          pairs={nd.dyeCompatibility || {}}
          onChange={(v) => updateND({ dyeCompatibility: v })}
        />
      </Section>

      {/* ── 10. Sustainability ── */}
      <Section title="Sustainability" hasData={!!pp.sustainability || !!nd.environmental} sectionId="sustainability" onAiRequest={onAiRequest}>
        {(["waterUsage", "carbonFootprint", "chemicalProcessing", "circularity"] as const).map((key) => {
          const r = rated(sust[key] as RatedProperty | undefined);
          return (
            <RatingSlider
              key={key}
              label={key}
              rating={r.rating}
              ratingLabel={r.label}
              confidence={r.confidence}
              onChange={(v) => updatePP({ sustainability: { ...sust, [key]: { rating: v.rating, label: v.label, confidence: v.confidence } } })}
            />
          );
        })}
        <Toggle
          label="Biodegradable"
          value={sourced(sust.biodegradable, false).value as boolean}
          confidence={sourced(sust.biodegradable, false).confidence}
          onChange={(v) => updatePP({ sustainability: { ...sust, biodegradable: { value: v.value, confidence: v.confidence } } })}
        />
        <Toggle
          label="Recyclable"
          value={sourced(sust.recyclable, false).value as boolean}
          confidence={sourced(sust.recyclable, false).confidence}
          onChange={(v) => updatePP({ sustainability: { ...sust, recyclable: { value: v.value, confidence: v.confidence } } })}
        />
        <ChipInput
          label="Certifications"
          values={sourced(sust.certifications, []).value as string[]}
          onChange={(v) => updatePP({ sustainability: { ...sust, certifications: { value: v, confidence: sourced(sust.certifications, []).confidence } } })}
          suggestions={["GOTS", "OEKO-TEX", "BCI", "RWS", "European Flax", "ZQ Merino", "Cradle to Cradle", "USDA Organic"]}
        />
        <KVEditor
          label="Environmental (fallback)"
          pairs={nd.environmental || {}}
          onChange={(v) => updateND({ environmental: v })}
        />
      </Section>

      {/* ── 11. Source ── */}
      <Section title="Source" hasData={!!(src.typicalMOQ || src.leadTime)} sectionId="source" onAiRequest={onAiRequest}>
        <TextInput
          label="Typical MOQ"
          value={src.typicalMOQ || ""}
          onChange={(v) => updatePP({ sourcing: { ...src, typicalMOQ: v } })}
          placeholder="e.g. 500 kg"
        />
        <TextInput
          label="Lead Time"
          value={src.leadTime || ""}
          onChange={(v) => updatePP({ sourcing: { ...src, leadTime: v } })}
          placeholder="e.g. 4-8 weeks"
        />
        {(["apparel", "interiors", "technical", "accessories", "industrial"] as const).map((key) => (
          <Toggle
            key={key}
            label={key}
            value={sourced(endUse[key] as SourcedValue<boolean> | undefined, false).value as boolean}
            confidence={sourced(endUse[key] as SourcedValue<boolean> | undefined, false).confidence}
            onChange={(v) => updatePP({ endUse: { ...endUse, [key]: { value: v.value, confidence: v.confidence } } })}
          />
        ))}
        <ChipInput
          label="Best For"
          values={endUse.bestFor || []}
          onChange={(v) => updatePP({ endUse: { ...endUse, bestFor: v } })}
        />
      </Section>

      {/* ── 12. Connections ── */}
      <Section title="Connections" hasData={!!(nd.crossReferences || nd.varieties?.length)} sectionId="connections" onAiRequest={onAiRequest}>
        <KVEditor
          label="Cross References"
          pairs={
            nd.crossReferences
              ? Object.fromEntries(Object.entries(nd.crossReferences).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v]))
              : {}
          }
          onChange={(v) => {
            const parsed: Record<string, string[]> = {};
            for (const [k, val] of Object.entries(v)) {
              parsed[k] = String(val).split(",").map((s) => s.trim()).filter(Boolean);
            }
            updateND({ crossReferences: parsed });
          }}
        />
        <ChipInput
          label="Applications"
          values={Array.isArray(nd.applications) ? nd.applications : []}
          onChange={(v) => updateND({ applications: v })}
        />
        <RepeatingGroup<NodeVariety>
          label="Varieties"
          items={nd.varieties || []}
          fields={[
            { key: "name", label: "Name", placeholder: "Variety name" },
            { key: "traits", label: "Traits", placeholder: "Key traits" },
            { key: "uses", label: "Uses", placeholder: "Common uses" },
          ]}
          emptyItem={{ name: "", traits: "", uses: "" }}
          onChange={(v) => updateND({ varieties: v })}
        />
      </Section>
    </div>
  );
}
