/**
 * supplementary-editors.tsx — Editors for the five supplementary data tables.
 *
 * C3: Process steps, Anatomy, Care, Quotes, World Names editors.
 * Each editor reads current data from the dataSource and pushes
 * updates via the corresponding update* method, triggering live
 * preview in the detail plates behind the drawer.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { dataSource } from "../../data/data-provider";
import type { ProcessStep, AnatomyData, CareData, QuoteEntry } from "../../data/atlas-data";
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════
   Shared styles
   ══════════════════════════════════════════════════════════ */

const labelCls = "block text-white/40 mb-1";
const labelStyle = { fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" as const };
const inputCls = "w-full px-2.5 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors";
const inputStyle = { fontSize: "12px" };
const btnCls = "p-1 rounded text-white/30 hover:text-white/60 transition-colors cursor-pointer";
const addBtnCls = "flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] border-dashed rounded-md text-white/40 hover:text-white/60 hover:border-white/20 transition-colors cursor-pointer w-full justify-center";

function SmallField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className={labelCls} style={labelStyle}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
        style={inputStyle}
      />
    </label>
  );
}

/* ══════════════════════════════════════════════════════════
   Process Steps Editor
   ══════════════════════════════════════════════════════════ */

export function ProcessEditor({ fiberId }: { fiberId: string }) {
  const steps = dataSource.getProcessData()[fiberId] ?? [];
  const [draft, setDraft] = useState<ProcessStep[]>(steps);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(dataSource.getProcessData()[fiberId] ?? []);
  }, [fiberId]);

  const push = useCallback((newSteps: ProcessStep[]) => {
    setDraft(newSteps);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dataSource.updateProcessData(fiberId, newSteps);
    }, 300);
  }, [fiberId]);

  const updateStep = (index: number, field: keyof ProcessStep, value: string) => {
    const next = draft.map((s, i) => i === index ? { ...s, [field]: value } : s);
    push(next);
  };

  const addStep = () => push([...draft, { name: "", detail: "" }]);
  const removeStep = (index: number) => push(draft.filter((_, i) => i !== index));
  const moveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    push(next);
  };

  return (
    <div className="space-y-2">
      {draft.map((step, i) => (
        <div key={i} className="flex gap-2 items-start bg-white/[0.02] rounded-lg p-2 border border-white/[0.04]">
          <div className="flex flex-col gap-0.5 pt-1 shrink-0">
            <button className={btnCls} onClick={() => moveStep(i, -1)} title="Move up"><ArrowUp size={10} /></button>
            <GripVertical size={10} className="text-white/15 mx-auto" />
            <button className={btnCls} onClick={() => moveStep(i, 1)} title="Move down"><ArrowDown size={10} /></button>
          </div>
          <div className="flex-1 space-y-1.5">
            <input
              value={step.name}
              onChange={(e) => updateStep(i, "name", e.target.value)}
              placeholder="Step name..."
              className={inputCls}
              style={{ ...inputStyle, fontWeight: 600 }}
            />
            <input
              value={step.detail}
              onChange={(e) => updateStep(i, "detail", e.target.value)}
              placeholder="Detail..."
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <button className={`${btnCls} pt-1 shrink-0`} onClick={() => removeStep(i)} title="Remove">
            <Trash2 size={11} className="text-red-400/50 hover:text-red-400/80" />
          </button>
        </div>
      ))}
      <button className={addBtnCls} onClick={addStep} style={{ fontSize: "11px" }}>
        <Plus size={12} /> Add Step
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Anatomy Editor
   ══════════════════════════════════════════════════════════ */

// Structured anatomy fields store { raw: string; ... }; plain fields are strings.
type AnatomyStructuredKey = "diameter" | "length" | "tensileStrength" | "moistureRegain";
type AnatomyPlainKey = "crossSection" | "surfaceTexture";

const ANATOMY_STRUCTURED_FIELDS: Array<{ key: AnatomyStructuredKey; label: string }> = [
  { key: "diameter", label: "Diameter" },
  { key: "length", label: "Length" },
  { key: "tensileStrength", label: "Tensile Strength" },
  { key: "moistureRegain", label: "Moisture Regain" },
];

const ANATOMY_PLAIN_FIELDS: Array<{ key: AnatomyPlainKey; label: string }> = [
  { key: "crossSection", label: "Cross Section" },
  { key: "surfaceTexture", label: "Surface Texture" },
];

const EMPTY_ANATOMY: AnatomyData = {
  diameter: { raw: "" },
  crossSection: "",
  surfaceTexture: "",
  length: { raw: "" },
  tensileStrength: { raw: "" },
  moistureRegain: { raw: "" },
};

export function AnatomyEditor({ fiberId }: { fiberId: string }) {
  const data = dataSource.getAnatomyData()[fiberId];
  const [draft, setDraft] = useState<AnatomyData>(data ?? EMPTY_ANATOMY);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(dataSource.getAnatomyData()[fiberId] ?? EMPTY_ANATOMY);
  }, [fiberId]);

  const push = useCallback((next: AnatomyData) => {
    setDraft(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dataSource.updateAnatomyData(fiberId, next);
    }, 300);
  }, [fiberId]);

  const updateStructured = (key: AnatomyStructuredKey, raw: string) => {
    push({ ...draft, [key]: { ...(draft[key] as { raw: string }), raw } });
  };

  const updatePlain = (key: AnatomyPlainKey, value: string) => {
    push({ ...draft, [key]: value });
  };

  return (
    <div className="space-y-2">
      {!data && (
        <div className="text-blue-400/40 mb-2" style={{ fontSize: "10px" }}>
          No anatomy data — fill in to create
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {ANATOMY_STRUCTURED_FIELDS.map(({ key, label }) => (
          <SmallField
            key={key}
            label={label}
            value={(draft[key] as { raw: string }).raw}
            onChange={(v) => updateStructured(key, v)}
          />
        ))}
        {ANATOMY_PLAIN_FIELDS.map(({ key, label }) => (
          <SmallField
            key={key}
            label={label}
            value={draft[key] as string}
            onChange={(v) => updatePlain(key, v)}
          />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Care Editor
   ══════════════════════════════════════════════════════════ */

const CARE_FIELDS: Array<{ key: keyof CareData; label: string }> = [
  { key: "washTemp", label: "Wash Temp" },
  { key: "dryMethod", label: "Dry Method" },
  { key: "ironTemp", label: "Iron Temp" },
  { key: "specialNotes", label: "Special Notes" },
];

const EMPTY_CARE: CareData = {
  washTemp: "", dryMethod: "", ironTemp: "", specialNotes: "",
};

export function CareEditor({ fiberId }: { fiberId: string }) {
  const data = dataSource.getCareData()[fiberId];
  const [draft, setDraft] = useState<CareData>(data ?? EMPTY_CARE);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(dataSource.getCareData()[fiberId] ?? EMPTY_CARE);
  }, [fiberId]);

  const push = useCallback((next: CareData) => {
    setDraft(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dataSource.updateCareData(fiberId, next);
    }, 300);
  }, [fiberId]);

  const updateField = (key: keyof CareData, value: string) => {
    push({ ...draft, [key]: value });
  };

  return (
    <div className="space-y-2">
      {!data && (
        <div className="text-blue-400/40 mb-2" style={{ fontSize: "10px" }}>
          No care data — fill in to create
        </div>
      )}
      {CARE_FIELDS.map(({ key, label }) => (
        <SmallField key={key} label={label} value={draft[key]} onChange={(v) => updateField(key, v)} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Quote Editor
   ══════════════════════════════════════════════════════════ */

export function QuoteEditor({ fiberId }: { fiberId: string }) {
  const quotes = dataSource.getQuoteData()[fiberId] ?? [];
  const [draft, setDraft] = useState<QuoteEntry[]>(quotes);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(dataSource.getQuoteData()[fiberId] ?? []);
  }, [fiberId]);

  const push = useCallback((next: QuoteEntry[]) => {
    setDraft(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dataSource.updateQuoteData(fiberId, next);
    }, 300);
  }, [fiberId]);

  const updateQuote = (index: number, field: keyof QuoteEntry, value: string) => {
    const next = draft.map((q, i) => i === index ? { ...q, [field]: value } : q);
    push(next);
  };

  const addQuote = () => push([...draft, { text: "", attribution: "" }]);
  const removeQuote = (index: number) => push(draft.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {draft.map((q, i) => (
        <div key={i} className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04] space-y-1.5">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <textarea
                value={q.text}
                onChange={(e) => updateQuote(i, "text", e.target.value)}
                placeholder="Quote text..."
                rows={2}
                className={`${inputCls} resize-y`}
                style={{ ...inputStyle, lineHeight: "1.5", fontStyle: "italic" }}
              />
            </div>
            <button className={`${btnCls} pt-1 shrink-0`} onClick={() => removeQuote(i)} title="Remove">
              <Trash2 size={11} className="text-red-400/50" />
            </button>
          </div>
          <input
            value={q.attribution}
            onChange={(e) => updateQuote(i, "attribution", e.target.value)}
            placeholder="Attribution..."
            className={inputCls}
            style={{ ...inputStyle, fontWeight: 500 }}
          />
        </div>
      ))}
      <button className={addBtnCls} onClick={addQuote} style={{ fontSize: "11px" }}>
        <Plus size={12} /> Add Quote
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   World Names Editor
   ══════════════════════════════════════════════════════════ */

export function WorldNamesEditor({ fiberId }: { fiberId: string }) {
  const allNames = dataSource.getWorldNames()[fiberId] ?? [];
  const [draft, setDraft] = useState<string[]>(allNames);
  const [newName, setNewName] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(dataSource.getWorldNames()[fiberId] ?? []);
  }, [fiberId]);

  const push = useCallback((next: string[]) => {
    setDraft(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dataSource.updateWorldNames(fiberId, next);
    }, 300);
  }, [fiberId]);

  const updateName = (index: number, value: string) => {
    const next = draft.map((n, i) => i === index ? value : n);
    push(next);
  };

  const addName = () => {
    const trimmed = newName.trim();
    if (trimmed) {
      push([...draft, trimmed]);
      setNewName("");
    }
  };

  const removeName = (index: number) => push(draft.filter((_, i) => i !== index));

  const moveName = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    push(next);
  };

  return (
    <div className="space-y-1.5">
      {draft.length === 0 && (
        <div className="text-blue-400/40 mb-2" style={{ fontSize: "10px" }}>
          No world names — add translations
        </div>
      )}
      {draft.map((name, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-white/20 w-4 text-right shrink-0" style={{ fontSize: "9px" }}>{i}</span>
          <input
            value={name}
            onChange={(e) => updateName(i, e.target.value)}
            className={`flex-1 ${inputCls}`}
            style={inputStyle}
          />
          <button className={btnCls} onClick={() => moveName(i, -1)} title="Move up"><ArrowUp size={10} /></button>
          <button className={btnCls} onClick={() => moveName(i, 1)} title="Move down"><ArrowDown size={10} /></button>
          <button className={btnCls} onClick={() => removeName(i)} title="Remove">
            <Trash2 size={10} className="text-red-400/50" />
          </button>
        </div>
      ))}
      <div className="flex gap-1.5 mt-1">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addName(); } }}
          placeholder="Add name (e.g. 大麻 (Taima))..."
          className={`flex-1 ${inputCls}`}
          style={inputStyle}
        />
        <button onClick={addName} className="px-3 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-md text-white/50 hover:text-white/80 transition-colors cursor-pointer" style={{ fontSize: "11px" }}>Add</button>
      </div>
    </div>
  );
}
