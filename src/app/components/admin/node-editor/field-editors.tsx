import React, { useState, useCallback, useRef, useMemo } from "react";
import type { ConfidenceLevel } from "../../../types/material";
import type { VideoEntry, EmbedEntry, LinkEntry } from "../../../types/atlas-media";
import { sanitizeHtml } from "../../../utils/admin/sanitize";

// ── Shared styles ────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  fontSize: 12,
  color: "#ddd",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 4,
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: "#888",
  textTransform: "capitalize",
  whiteSpace: "nowrap",
};

const CONF_COLORS: Record<ConfidenceLevel, string> = {
  verified: "#0F783C",
  estimated: "#60a5fa",
  unverified: "#f87171",
};

// ── ConfidenceBadge ──────────────────────────────────────────

export function ConfidenceBadge({
  value,
  onChange,
}: {
  value: ConfidenceLevel;
  onChange: (v: ConfidenceLevel) => void;
}) {
  const levels: ConfidenceLevel[] = ["unverified", "estimated", "verified"];
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {levels.map((lv) => (
        <button
          key={lv}
          onClick={() => onChange(lv)}
          title={lv}
          style={{
            width: 16,
            height: 10,
            borderRadius: 2,
            border: value === lv ? `1px solid ${CONF_COLORS[lv]}` : "1px solid rgba(255,255,255,0.08)",
            background: value === lv ? `${CONF_COLORS[lv]}30` : "transparent",
            cursor: "pointer",
          }}
        />
      ))}
    </div>
  );
}

// ── RatingSlider ─────────────────────────────────────────────

export function RatingSlider({
  label,
  rating,
  ratingLabel,
  confidence,
  onChange,
}: {
  label: string;
  rating: number;
  ratingLabel?: string;
  confidence: ConfidenceLevel;
  onChange: (v: { rating: number; label: string; confidence: ConfidenceLevel }) => void;
}) {
  const LABELS = ["Very Low", "Low", "Moderate", "High", "Very High"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ ...labelStyle, minWidth: 100 }}>{label.replace(/([A-Z])/g, " $1")}</span>
      <div style={{ display: "flex", gap: 2, flex: 1 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            aria-label={`${label} ${n}`}
            onClick={() => onChange({ rating: n, label: LABELS[n - 1], confidence })}
            style={{
              flex: 1,
              height: 14,
              borderRadius: 2,
              border: "none",
              background: n <= rating ? "#0F783C" : "rgba(255,255,255,0.06)",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 9, color: "#666", minWidth: 56, textAlign: "right" }}>{ratingLabel || LABELS[(rating || 1) - 1]}</span>
      <ConfidenceBadge value={confidence} onChange={(c) => onChange({ rating, label: ratingLabel || LABELS[(rating || 1) - 1], confidence: c })} />
    </div>
  );
}

// ── SourcedDropdown ──────────────────────────────────────────

export function SourcedDropdown({
  label,
  value,
  options,
  confidence,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  confidence: ConfidenceLevel;
  onChange: (v: { value: string; confidence: ConfidenceLevel }) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ ...labelStyle, minWidth: 100 }}>{label.replace(/([A-Z])/g, " $1")}</span>
      <select
        value={value}
        onChange={(e) => onChange({ value: e.target.value, confidence })}
        style={{
          ...inputStyle,
          flex: 1,
          appearance: "none",
          paddingRight: 20,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 6px center",
        }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt} style={{ background: "#1a1a1a", color: "#ddd" }}>
            {opt}
          </option>
        ))}
      </select>
      <ConfidenceBadge value={confidence} onChange={(c) => onChange({ value, confidence: c })} />
    </div>
  );
}

// ── ChipInput ────────────────────────────────────────────────

export function ChipInput({
  label,
  values,
  onChange,
  suggestions,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addChip = useCallback(
    (val: string) => {
      const trimmed = val.trim();
      if (trimmed && !values.includes(trimmed)) {
        onChange([...values, trimmed]);
      }
      setInput("");
      setShowSuggestions(false);
    },
    [values, onChange]
  );

  const removeChip = useCallback(
    (idx: number) => onChange(values.filter((_, i) => i !== idx)),
    [values, onChange]
  );

  const filteredSuggestions = suggestions?.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !values.includes(s)
  );

  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, alignItems: "center" }}>
        {values.map((v, i) => (
          <span
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              padding: "2px 6px",
              borderRadius: 3,
              background: "rgba(96,165,250,0.1)",
              color: "#60a5fa",
              fontSize: 10,
            }}
          >
            {v}
            <button
              onClick={() => removeChip(i)}
              style={{
                background: "none",
                border: "none",
                color: "#60a5fa",
                cursor: "pointer",
                fontSize: 10,
                padding: 0,
                lineHeight: 1,
              }}
            >
              x
            </button>
          </span>
        ))}
        <div style={{ position: "relative", flex: 1, minWidth: 80 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) {
                e.preventDefault();
                addChip(input);
              }
              if (e.key === "Backspace" && !input && values.length) {
                removeChip(values.length - 1);
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={placeholder || "Add..."}
            style={{ ...inputStyle, border: "none", background: "transparent", padding: "4px 0" }}
          />
          {showSuggestions && filteredSuggestions && filteredSuggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 4,
                zIndex: 10,
                maxHeight: 120,
                overflow: "auto",
              }}
            >
              {filteredSuggestions.slice(0, 8).map((s) => (
                <button
                  key={s}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addChip(s);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "4px 8px",
                    fontSize: 11,
                    color: "#bbb",
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── KVEditor ─────────────────────────────────────────────────

export function KVEditor({
  label,
  pairs,
  onChange,
}: {
  label: string;
  pairs: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
}) {
  const entries = Object.entries(pairs);

  const updateKey = useCallback(
    (oldKey: string, newKey: string) => {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(pairs)) {
        result[k === oldKey ? newKey : k] = v;
      }
      onChange(result);
    },
    [pairs, onChange]
  );

  const updateValue = useCallback(
    (key: string, val: any) => onChange({ ...pairs, [key]: val }),
    [pairs, onChange]
  );

  const removeEntry = useCallback(
    (key: string) => {
      const next = { ...pairs };
      delete next[key];
      onChange(next);
    },
    [pairs, onChange]
  );

  const addEntry = useCallback(
    () => onChange({ ...pairs, "": "" }),
    [pairs, onChange]
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={labelStyle}>{label}</span>
        <button onClick={addEntry} style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 10, cursor: "pointer" }}>
          + Add
        </button>
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        {entries.map(([k, v], i) => (
          <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              value={k}
              onChange={(e) => updateKey(k, e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
              placeholder="key"
            />
            <input
              value={String(v ?? "")}
              onChange={(e) => updateValue(k, e.target.value)}
              style={{ ...inputStyle, flex: 2 }}
              placeholder="value"
            />
            <button
              onClick={() => removeEntry(k)}
              style={{ background: "none", border: "none", color: "#f87171", fontSize: 12, cursor: "pointer", padding: "0 4px" }}
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── OrderedListEditor ────────────────────────────────────────

export function OrderedListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const move = useCallback(
    (from: number, to: number) => {
      const next = [...items];
      const [el] = next.splice(from, 1);
      next.splice(to, 0, el);
      onChange(next);
    },
    [items, onChange]
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={labelStyle}>{label}</span>
        <button
          onClick={() => onChange([...items, ""])}
          style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 10, cursor: "pointer" }}
        >
          + Add
        </button>
      </div>
      <div style={{ display: "grid", gap: 3 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 9, color: "#555", minWidth: 14, textAlign: "right" }}>{i + 1}.</span>
            <input
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              style={{ ...inputStyle, flex: 1 }}
              placeholder={placeholder || "Step..."}
            />
            <button
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
              style={{ background: "none", border: "none", color: i === 0 ? "#333" : "#888", fontSize: 10, cursor: i === 0 ? "default" : "pointer", padding: "0 2px" }}
            >
              ↑
            </button>
            <button
              disabled={i === items.length - 1}
              onClick={() => move(i, i + 1)}
              style={{ background: "none", border: "none", color: i === items.length - 1 ? "#333" : "#888", fontSize: 10, cursor: i === items.length - 1 ? "default" : "pointer", padding: "0 2px" }}
            >
              ↓
            </button>
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              style={{ background: "none", border: "none", color: "#f87171", fontSize: 12, cursor: "pointer", padding: "0 4px" }}
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── RepeatingGroup ───────────────────────────────────────────

export function RepeatingGroup<T extends Record<string, any>>({
  label,
  items,
  fields,
  emptyItem,
  onChange,
}: {
  label: string;
  items: T[];
  fields: { key: keyof T; label: string; placeholder?: string }[];
  emptyItem: T;
  onChange: (v: T[]) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={labelStyle}>{label}</span>
        <button
          onClick={() => onChange([...items, { ...emptyItem }])}
          style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 10, cursor: "pointer" }}
        >
          + Add
        </button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              padding: "8px",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 4,
              display: "grid",
              gap: 4,
            }}
          >
            {fields.map((f) => (
              <div key={String(f.key)} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ ...labelStyle, minWidth: 50 }}>{f.label}</span>
                <input
                  value={String(item[f.key] ?? "")}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...next[i], [f.key]: e.target.value };
                    onChange(next);
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              style={{
                alignSelf: "end",
                background: "none",
                border: "none",
                color: "#f87171",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TextInput helper ─────────────────────────────────────────

export function TextInput({
  label: lbl,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  if (multiline) {
    return (
      <div>
        <span style={labelStyle}>{lbl}</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", marginTop: 4 }}
        />
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ ...labelStyle, minWidth: 100 }}>{lbl}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, flex: 1 }}
      />
    </div>
  );
}

// ── Toggle ───────────────────────────────────────────────────

export function Toggle({
  label: lbl,
  value,
  confidence,
  onChange,
}: {
  label: string;
  value: boolean;
  confidence: ConfidenceLevel;
  onChange: (v: { value: boolean; confidence: ConfidenceLevel }) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ ...labelStyle, minWidth: 100 }}>{lbl}</span>
      <button
        onClick={() => onChange({ value: !value, confidence })}
        aria-label={lbl}
        style={{
          width: 32,
          height: 16,
          borderRadius: 8,
          border: "none",
          background: value ? "#0F783C" : "rgba(255,255,255,0.1)",
          position: "relative",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 16 : 2,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
          }}
        />
      </button>
      <ConfidenceBadge value={confidence} onChange={(c) => onChange({ value, confidence: c })} />
    </div>
  );
}

// ── VideoInput ────────────────────────────────────────────────

function detectVideoProvider(url: string): VideoEntry["provider"] {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/vimeo\.com/i.test(url)) return "vimeo";
  if (/cloudinary\.com/i.test(url)) return "cloudinary";
  return "direct";
}

function videoThumb(entry: VideoEntry): string | null {
  if (entry.thumbUrl) return entry.thumbUrl;
  if (entry.provider === "youtube" || /youtu/i.test(entry.url)) {
    const id = entry.url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  }
  return null;
}

export function VideoInput({
  items,
  onChange,
}: {
  items: VideoEntry[];
  onChange: (v: VideoEntry[]) => void;
}) {
  const [newUrl, setNewUrl] = useState("");

  const addVideo = useCallback(() => {
    const url = newUrl.trim();
    if (!url) return;
    const entry: VideoEntry = { url, provider: detectVideoProvider(url) };
    onChange([...items, entry]);
    setNewUrl("");
  }, [newUrl, items, onChange]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={labelStyle}>Videos ({items.length})</span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((v, i) => {
          const thumb = videoThumb(v);
          return (
            <div key={i} style={{ display: "flex", gap: 8, padding: 6, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4 }}>
              <div style={{ width: 80, height: 50, borderRadius: 3, overflow: "hidden", flexShrink: 0, background: "#111" }}>
                {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 18 }}>▶</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <input
                  value={v.url}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...v, url: e.target.value, provider: detectVideoProvider(e.target.value) };
                    onChange(next);
                  }}
                  style={{ ...inputStyle, fontSize: 10 }}
                  placeholder="Video URL..."
                />
                <input
                  value={v.caption || ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...v, caption: e.target.value };
                    onChange(next);
                  }}
                  style={{ ...inputStyle, fontSize: 10 }}
                  placeholder="Caption..."
                />
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: "#666" }}>{v.provider || "direct"}</span>
                  <button
                    onClick={() => onChange(items.filter((_, j) => j !== i))}
                    style={{ marginLeft: "auto", background: "none", border: "none", color: "#f87171", fontSize: 10, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addVideo(); }}
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Paste video URL (YouTube, Vimeo, etc.)..."
        />
        <button
          onClick={addVideo}
          disabled={!newUrl.trim()}
          style={{
            padding: "4px 10px",
            borderRadius: 4,
            border: "none",
            background: newUrl.trim() ? "#60a5fa" : "rgba(255,255,255,0.06)",
            color: newUrl.trim() ? "#000" : "#555",
            fontSize: 10,
            fontWeight: 600,
            cursor: newUrl.trim() ? "pointer" : "default",
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── EmbedInput ────────────────────────────────────────────────

function detectEmbedSource(html: string): string {
  if (/instagram/i.test(html)) return "instagram";
  if (/twitter|x\.com/i.test(html)) return "twitter";
  if (/codepen/i.test(html)) return "codepen";
  if (/spotify/i.test(html)) return "spotify";
  if (/soundcloud/i.test(html)) return "soundcloud";
  if (/iframe/i.test(html)) return "iframe";
  return "custom";
}

export function EmbedInput({
  items,
  onChange,
}: {
  items: EmbedEntry[];
  onChange: (v: EmbedEntry[]) => void;
}) {
  const [newHtml, setNewHtml] = useState("");

  const addEmbed = useCallback(() => {
    const html = newHtml.trim();
    if (!html) return;
    const urlMatch = html.match(/src=["']([^"']+)["']/);
    onChange([...items, { html, source: detectEmbedSource(html), url: urlMatch?.[1] || "" }]);
    setNewHtml("");
  }, [newHtml, items, onChange]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={labelStyle}>Embeds ({items.length})</span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((embed, i) => (
          <div key={i} style={{ padding: 8, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: "#60a5fa", textTransform: "capitalize" }}>{embed.source || "embed"}</span>
              <button
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", color: "#f87171", fontSize: 10, cursor: "pointer" }}
              >
                Remove
              </button>
            </div>
            <textarea
              value={embed.html}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...embed, html: e.target.value, source: detectEmbedSource(e.target.value) };
                onChange(next);
              }}
              rows={3}
              style={{ ...inputStyle, fontSize: 10, resize: "vertical", fontFamily: "monospace" }}
              placeholder="Embed HTML / iframe code..."
            />
            <input
              value={embed.caption || ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...embed, caption: e.target.value };
                onChange(next);
              }}
              style={{ ...inputStyle, fontSize: 10, marginTop: 4 }}
              placeholder="Caption..."
            />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 6 }}>
        <textarea
          value={newHtml}
          onChange={(e) => setNewHtml(e.target.value)}
          rows={2}
          style={{ ...inputStyle, fontSize: 10, resize: "vertical", fontFamily: "monospace" }}
          placeholder="Paste embed code or iframe HTML..."
        />
        <button
          onClick={addEmbed}
          disabled={!newHtml.trim()}
          style={{
            marginTop: 4,
            padding: "4px 10px",
            borderRadius: 4,
            border: "none",
            background: newHtml.trim() ? "#60a5fa" : "rgba(255,255,255,0.06)",
            color: newHtml.trim() ? "#000" : "#555",
            fontSize: 10,
            fontWeight: 600,
            cursor: newHtml.trim() ? "pointer" : "default",
          }}
        >
          Add Embed
        </button>
      </div>
    </div>
  );
}

// ── LinkInput ─────────────────────────────────────────────────

export function LinkInput({
  items,
  onChange,
}: {
  items: LinkEntry[];
  onChange: (v: LinkEntry[]) => void;
}) {
  const [newUrl, setNewUrl] = useState("");
  const [fetching, setFetching] = useState(false);

  const addLink = useCallback(async () => {
    const url = newUrl.trim();
    if (!url) return;
    setFetching(true);
    let entry: LinkEntry = { url, title: url, description: "" };
    try {
      const res = await fetch("/__admin/link-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data = await res.json();
        entry = {
          url,
          title: data.title || url,
          description: data.description || "",
          favicon: data.favicon || "",
          ogImage: data.ogImage || "",
        };
      }
    } catch { /* use default entry */ }
    onChange([...items, entry]);
    setNewUrl("");
    setFetching(false);
  }, [newUrl, items, onChange]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={labelStyle}>Links ({items.length})</span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((link, i) => (
          <div key={i} style={{ display: "flex", gap: 8, padding: 6, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4 }}>
            {link.favicon && (
              <img src={link.favicon} alt="" style={{ width: 16, height: 16, borderRadius: 2, flexShrink: 0, marginTop: 2 }} />
            )}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <input
                value={link.title}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...link, title: e.target.value };
                  onChange(next);
                }}
                style={{ ...inputStyle, fontSize: 10, fontWeight: 600 }}
                placeholder="Title"
              />
              <input
                value={link.url}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...link, url: e.target.value };
                  onChange(next);
                }}
                style={{ ...inputStyle, fontSize: 10, color: "#60a5fa" }}
                placeholder="URL"
              />
              <input
                value={link.description || ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...link, description: e.target.value };
                  onChange(next);
                }}
                style={{ ...inputStyle, fontSize: 10 }}
                placeholder="Description"
              />
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <ChipInput
                  label=""
                  values={link.tags || []}
                  onChange={(tags) => {
                    const next = [...items];
                    next[i] = { ...link, tags };
                    onChange(next);
                  }}
                  placeholder="Add tag..."
                />
                <button
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  style={{ marginLeft: "auto", background: "none", border: "none", color: "#f87171", fontSize: 10, cursor: "pointer", flexShrink: 0 }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addLink(); }}
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Paste URL to add..."
        />
        <button
          onClick={addLink}
          disabled={!newUrl.trim() || fetching}
          style={{
            padding: "4px 10px",
            borderRadius: 4,
            border: "none",
            background: newUrl.trim() && !fetching ? "#60a5fa" : "rgba(255,255,255,0.06)",
            color: newUrl.trim() && !fetching ? "#000" : "#555",
            fontSize: 10,
            fontWeight: 600,
            cursor: newUrl.trim() && !fetching ? "pointer" : "default",
          }}
        >
          {fetching ? "..." : "Add"}
        </button>
      </div>
    </div>
  );
}

// ── MarkdownEditor ────────────────────────────────────────────

export function MarkdownEditor({
  label: lbl,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = useCallback((before: string, after: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const newText = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newText);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    });
  }, [value, onChange]);

  const renderedHtml = useMemo(() => {
    if (!showPreview) return "";
    return value
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^### (.+)$/gm, "<h4>$1</h4>")
      .replace(/^## (.+)$/gm, "<h3>$1</h3>")
      .replace(/^# (.+)$/gm, "<h2>$1</h2>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#60a5fa">$1</a>')
      .replace(/\n\n/g, "<br/><br/>")
      .replace(/\n/g, "<br/>");
  }, [value, showPreview]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={labelStyle}>{lbl}</span>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={() => insertMarkdown("**", "**")}
            title="Bold"
            style={{ background: "none", border: "none", color: "#888", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "0 4px" }}
          >
            B
          </button>
          <button
            onClick={() => insertMarkdown("*", "*")}
            title="Italic"
            style={{ background: "none", border: "none", color: "#888", fontSize: 11, fontStyle: "italic", cursor: "pointer", padding: "0 4px" }}
          >
            I
          </button>
          <button
            onClick={() => insertMarkdown("## ", "")}
            title="Heading"
            style={{ background: "none", border: "none", color: "#888", fontSize: 10, cursor: "pointer", padding: "0 4px" }}
          >
            H
          </button>
          <button
            onClick={() => insertMarkdown("- ", "")}
            title="List item"
            style={{ background: "none", border: "none", color: "#888", fontSize: 10, cursor: "pointer", padding: "0 4px" }}
          >
            &bull;
          </button>
          <button
            onClick={() => insertMarkdown("[", "](url)")}
            title="Link"
            style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 10, cursor: "pointer", padding: "0 4px" }}
          >
            Link
          </button>
          <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)", margin: "0 2px" }} />
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              background: showPreview ? "rgba(96,165,250,0.1)" : "none",
              border: "none",
              color: showPreview ? "#60a5fa" : "#888",
              fontSize: 9,
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 3,
            }}
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
      </div>
      {showPreview ? (
        <div
          style={{
            padding: "8px 10px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 4,
            minHeight: 80,
            fontSize: 12,
            lineHeight: 1.6,
            color: "#ccc",
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderedHtml) }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={6}
          style={{ ...inputStyle, resize: "vertical", marginTop: 0, lineHeight: 1.5 }}
        />
      )}
    </div>
  );
}
