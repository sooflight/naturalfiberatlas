import React from "react";
import type { EditorState } from "./PlateEditor";
import type { RatedProperty, SourcedValue } from "../../../types/material";
import { extractImageUrl } from "../../../utils/admin/imageUrl";

interface PlatePreviewProps {
  nodeId: string;
  state: EditorState;
}

function PreviewLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 8, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6, fontWeight: 500 }}>
      {children}
    </div>
  );
}

function MiniRating({ label, prop }: { label: string; prop?: RatedProperty }) {
  if (!prop) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
      <span style={{ fontSize: 8, color: "#888", textTransform: "capitalize" }}>{label.replace(/([A-Z])/g, " $1")}</span>
      <div style={{ display: "flex", gap: 1 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} style={{ width: 5, height: 3, borderRadius: 1, background: n <= prop.rating ? "#0F783C" : "#333" }} />
        ))}
      </div>
    </div>
  );
}

export function PlatePreview({ nodeId, state }: PlatePreviewProps) {
  const { nodeData: nd, passport: pp, images, videos, embeds, links, scientificName, tags } = state;

  const hasIdentity = !!(nd.name || nd.tagline);
  const hasOrigin = !!(nd.summary || nd.culturalSignificance);
  const hasFiber = !!(pp.performance && Object.keys(pp.performance).length > 0);
  const hasProcess = !!(pp.process && Object.keys(pp.process).length > 0);
  const hasColor = !!(pp.dyeing && Object.keys(pp.dyeing).length > 0);
  const hasSustainability = !!(pp.sustainability && Object.keys(pp.sustainability).length > 0);
  const hasSource = !!(pp.sourcing?.typicalMOQ || pp.sourcing?.leadTime);

  const perf = pp.performance ?? {};
  const sust = pp.sustainability ?? {};

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        height: "100%",
        overflow: "auto",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(12,12,12,1)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>
        Live Preview
      </div>

      {/* Hero / Identity Plate */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {images[0] && (
          <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden" }}>
            <img src={extractImageUrl(images[0])} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ padding: 10 }}>
          <div style={{ fontSize: 13, color: "#f0ebe4", fontWeight: 500, marginBottom: 2 }}>
            {nd.name || nodeId.replace(/-/g, " ")}
          </div>
          {scientificName && (
            <div style={{ fontSize: 8, color: "#6b6058", fontStyle: "italic", marginBottom: 4 }}>{scientificName}</div>
          )}
          {nd.tagline && (
            <div style={{ fontSize: 9, color: "#888", lineHeight: 1.4 }}>{nd.tagline}</div>
          )}
          {tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>
              {tags.slice(0, 5).map((t) => (
                <span key={t} style={{ padding: "1px 5px", borderRadius: 2, background: "rgba(255,255,255,0.04)", color: "#888", fontSize: 7 }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Media Plate (Videos) */}
      {videos && videos.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 }}>
          <PreviewLabel>Videos ({videos.length})</PreviewLabel>
          <div style={{ display: "grid", gap: 4 }}>
            {videos.slice(0, 3).map((v, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ width: 40, height: 24, borderRadius: 2, background: "#111", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 10 }}>▶</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 8, color: "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.caption || v.url}</div>
                  <div style={{ fontSize: 7, color: "#555" }}>{v.provider || "direct"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links Plate */}
      {links && links.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 }}>
          <PreviewLabel>Links ({links.length})</PreviewLabel>
          <div style={{ display: "grid", gap: 3 }}>
            {links.slice(0, 4).map((link, i) => (
              <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {link.favicon && <img src={link.favicon} alt="" style={{ width: 10, height: 10, borderRadius: 1 }} />}
                <span style={{ fontSize: 8, color: "#60a5fa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Embeds Plate */}
      {embeds && embeds.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 }}>
          <PreviewLabel>Embeds ({embeds.length})</PreviewLabel>
          <div style={{ display: "grid", gap: 2 }}>
            {embeds.slice(0, 3).map((embed, i) => (
              <div key={i} style={{ fontSize: 8, color: "#888" }}>
                <span style={{ color: "#60a5fa", textTransform: "capitalize" }}>{embed.source || "embed"}</span>
                {embed.caption && <span> — {embed.caption}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Origin Plate */}
      {hasOrigin && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 }}>
          <PreviewLabel>Origin</PreviewLabel>
          {nd.summary && (
            <div style={{ fontSize: 9, color: "#bbb", lineHeight: 1.5, marginBottom: 4 }}>
              {(nd.summary || "").slice(0, 160)}
              {(nd.summary || "").length > 160 ? "..." : ""}
            </div>
          )}
          {nd.culturalSignificance && (
            <div style={{ fontSize: 8, color: "#888", fontStyle: "italic", lineHeight: 1.4 }}>
              {nd.culturalSignificance.slice(0, 100)}...
            </div>
          )}
        </div>
      )}

      {/* Fiber Plate */}
      {hasFiber && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 }}>
          <PreviewLabel>The Fiber</PreviewLabel>
          <div style={{ display: "grid", gap: 2 }}>
            {Object.entries(perf).map(([k, v]) => (
              <MiniRating key={k} label={k} prop={v as RatedProperty} />
            ))}
          </div>
        </div>
      )}

      {/* Process Plate */}
      {hasProcess && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 }}>
          <PreviewLabel>Processing</PreviewLabel>
          <div style={{ display: "grid", gap: 2 }}>
            {Object.entries(pp.process || {}).map(([k, v]) => {
              if (!v) return null;
              const sv = v as SourcedValue<any>;
              const display = Array.isArray(sv.value) ? sv.value.join(", ") : String(sv.value || "");
              return (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span style={{ fontSize: 8, color: "#888", textTransform: "capitalize" }}>{k}</span>
                  <span style={{ fontSize: 8, color: "#bbb" }}>{display}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Color Plate */}
      {hasColor && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 }}>
          <PreviewLabel>Dye & Color</PreviewLabel>
          {pp.dyeing?.compatibility && (
            <div style={{ fontSize: 8, color: "#bbb" }}>Compatibility: {(pp.dyeing.compatibility as SourcedValue<string>).value}</div>
          )}
          {pp.dyeing?.recommendedMethods && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 4 }}>
              {((pp.dyeing.recommendedMethods as SourcedValue<string[]>).value || []).map((m) => (
                <span key={m} style={{ padding: "1px 4px", borderRadius: 2, background: "rgba(192,132,252,0.1)", color: "#c084fc", fontSize: 7 }}>{m}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Impact Plate */}
      {hasSustainability && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 }}>
          <PreviewLabel>Sustainability</PreviewLabel>
          <div style={{ display: "grid", gap: 2 }}>
            {(["waterUsage", "carbonFootprint", "chemicalProcessing", "circularity"] as const).map((key) => (
              <MiniRating key={key} label={key} prop={sust[key] as RatedProperty | undefined} />
            ))}
          </div>
          {sust.certifications && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 4 }}>
              {((sust.certifications as SourcedValue<string[]>).value || []).map((c) => (
                <span key={c} style={{ padding: "1px 4px", borderRadius: 2, background: "rgba(15,120,60,0.1)", color: "#0F783C", fontSize: 7 }}>{c}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Source Plate */}
      {hasSource && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 }}>
          <PreviewLabel>Source</PreviewLabel>
          {pp.sourcing?.typicalMOQ && <div style={{ fontSize: 8, color: "#bbb" }}>MOQ: {pp.sourcing.typicalMOQ}</div>}
          {pp.sourcing?.leadTime && <div style={{ fontSize: 8, color: "#bbb" }}>Lead time: {pp.sourcing.leadTime}</div>}
          {pp.endUse?.bestFor && pp.endUse.bestFor.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 4 }}>
              {pp.endUse.bestFor.map((u: string) => (
                <span key={u} style={{ padding: "1px 4px", borderRadius: 2, background: "rgba(96,165,250,0.1)", color: "#60a5fa", fontSize: 7 }}>{u}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Connections */}
      {nd.varieties && nd.varieties.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 }}>
          <PreviewLabel>Varieties</PreviewLabel>
          {nd.varieties.map((v, i) => (
            <div key={i} style={{ fontSize: 8, color: "#bbb", marginBottom: 2 }}>
              <span style={{ color: "#ddd" }}>{v.name}</span> — {v.traits}
            </div>
          ))}
        </div>
      )}

      {!hasIdentity && !hasOrigin && !hasFiber && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 11 }}>
          Select a node and add data to see a preview.
        </div>
      )}
    </div>
  );
}
