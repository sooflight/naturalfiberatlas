/**
 * card-editor.tsx — WYSIWYG card-based fiber editor.
 *
 * Instead of form fields, each plate is rendered as an editable card that
 * mirrors the real plate aesthetic. Click any text to edit inline; changes
 * flow through the same debounced pushUpdate pipeline as the form editor.
 *
 * Cards use the same frosted-glass + ambient-image backdrop as the
 * production detail cards, but with editable overlays.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAtlasData } from "../../context/atlas-data-context";
import type { FiberProfile } from "../../data/atlas-data";
import { dataSource } from "../../data/data-provider";
import { splitAboutText } from "../plate-primitives";
import {
  Pencil,
  Check,
  Layers,
  Lightbulb,
  MapPin,
  DollarSign,
  Leaf,
  Globe2,
  Link2,
  Dna,
  Shirt,
  Image as ImageIcon,
  Quote,
  Package,
  Clock,
  CalendarDays,
  Droplets,
  FlaskConical,
  Recycle,
  Plus,
  X,
  BookOpen,
} from "lucide-react";

/* ── Inline editable text ── */
export function InlineText({
  value,
  onChange,
  className = "",
  style = {},
  multiline = false,
  placeholder = "Click to edit...",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  if (editing) {
    const shared = `bg-transparent border-b border-blue-400/30 focus:border-blue-400/60 outline-none w-full ${className}`;
    if (multiline) {
      return (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
          className={shared}
          style={{ ...style, resize: "vertical", minHeight: 80 }}
          rows={4}
        />
      );
    }
    return (
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className={shared}
        style={style}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-text group/inline relative inline-block ${className}`}
      style={style}
      title="Click to edit"
    >
      {value || <span className="text-white/20 italic">{placeholder}</span>}
      <Pencil
        size={9}
        className="absolute -right-3.5 top-0 text-blue-400/0 group-hover/inline:text-blue-400/50 transition-opacity"
      />
    </span>
  );
}

/* ── Inline number ── */
export function InlineNumber({
  value,
  onChange,
  min = 1,
  max = 5,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: max }, (_, i) => i + min).map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`w-[clamp(6px,2cqi,10px)] h-[clamp(6px,2cqi,10px)] rounded-full cursor-pointer transition-all ${
            n <= value
              ? "bg-emerald-400/60 border border-emerald-400/30"
              : "bg-white/[0.08] border border-white/[0.06] hover:bg-white/[0.15]"
          }`}
        />
      ))}
    </div>
  );
}

/* ── Card shell with ambient image ── */
export function EditableCardShell({
  fiber,
  children,
  minHeight = 200,
  className = "",
}: {
  fiber: FiberProfile;
  children: React.ReactNode;
  minHeight?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-[5/7] w-full rounded-2xl overflow-hidden border border-white/[0.08] hover:border-white/[0.12] transition-colors ${className}`}
      style={{ containerType: "inline-size", minHeight }}
    >
      {/* Ambient image backdrop */}
      {fiber.image && (
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `url(${fiber.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(50px) saturate(0.4)",
          }}
        />
      )}
      <div className="absolute inset-0 bg-[#0e0e0e]/85" />

      {/* Content — scrollable when overflowing the 5:7 portrait frame */}
      <div className="relative z-10 h-full overflow-y-auto">{children}</div>
    </div>
  );
}

/* ── Section label (matches plate style) ── */
export function CardLabel({
  icon: Icon,
  children,
  iconColor = "text-blue-400/50",
  badge,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  iconColor?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className={iconColor} />
      <span
        className="text-white/40 uppercase tracking-[0.14em] flex-1"
        style={{ fontSize: "11px", fontWeight: 600 }}
      >
        {children}
      </span>
      {badge && (
        <span
          className="px-1.5 py-0.5 rounded-full bg-blue-400/[0.06] border border-blue-400/10 text-blue-400/40"
          style={{ fontSize: "8px", fontWeight: 600, textTransform: "uppercase" }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EDITABLE CARDS
   ═══════════════════════════════════════════════════════════ */

/* ── 1. Profile Hero Card ── */
export function ProfileHeroCard({
  fiber,
  onUpdate,
}: {
  fiber: FiberProfile;
  onUpdate: (patch: Partial<FiberProfile>) => void;
}) {
  const categories = ["fiber", "textile", "dye"] as const;

  return (
    <EditableCardShell fiber={fiber} minHeight={280}>
      {/* Hero image */}
      <div className="relative aspect-[16/9] max-h-[220px] overflow-hidden">
        {fiber.image ? (
          <img
            src={fiber.image}
            alt={fiber.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-white/[0.02] flex items-center justify-center">
            <ImageIcon size={32} className="text-white/10" />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(14,14,14,1) 0%, rgba(14,14,14,0.6) 40%, transparent 70%)",
          }}
        />

        {/* Category pills */}
        <div className="absolute top-3 left-4 flex gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onUpdate({ category: cat })}
              className={`px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
                fiber.category === cat
                  ? "bg-white/[0.12] border-white/[0.2] text-white/80"
                  : "bg-black/40 border-white/[0.08] text-white/30 hover:text-white/50 hover:border-white/[0.15]"
              }`}
              style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Fiber info overlay */}
      <div className="px-5 pb-5 -mt-12 relative z-10">
        <InlineText
          value={fiber.name}
          onChange={(v) => onUpdate({ name: v })}
          className="text-white/90 block"
          style={{
            fontSize: "22px",
            fontWeight: 300,
            letterSpacing: "0.04em",
            lineHeight: 1.2,
          }}
          placeholder="Fiber name"
        />
        <InlineText
          value={fiber.subtitle}
          onChange={(v) => onUpdate({ subtitle: v })}
          className="text-blue-400/60 block mt-1"
          style={{ fontSize: "12px", fontWeight: 500, lineHeight: 1.4 }}
          placeholder="Subtitle"
        />
      </div>
    </EditableCardShell>
  );
}

/* ── 2. About Card ── */
export function AboutCard({
  fiber,
  onUpdate,
}: {
  fiber: FiberProfile;
  onUpdate: (patch: Partial<FiberProfile>) => void;
}) {
  return (
    <EditableCardShell fiber={fiber} minHeight={180}>
      <div className="p-5">
        <CardLabel icon={Layers} iconColor="text-blue-400/50">
          About
        </CardLabel>

        <div className="w-6 h-px bg-blue-400/30 mb-3" />

        <InlineText
          value={fiber.about}
          onChange={(v) => onUpdate({ about: v })}
          className="text-white/[0.68] block"
          style={{
            fontSize: "12px",
            lineHeight: 1.65,
            letterSpacing: "0.01em",
          }}
          multiline
          placeholder="Write about this fiber..."
        />

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {fiber.tags.map((tag, i) => (
            <span
              key={tag}
              className="group/tag inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/[0.12] text-white/[0.48] hover:border-white/[0.2] transition-colors"
              style={{ fontSize: "10px" }}
            >
              {tag}
              <button
                onClick={() =>
                  onUpdate({ tags: fiber.tags.filter((_, j) => j !== i) })
                }
                className="text-white/0 group-hover/tag:text-white/30 hover:!text-red-400/60 cursor-pointer transition-colors"
              >
                <X size={8} />
              </button>
            </span>
          ))}
          <TagAdder
            onAdd={(tag) => {
              if (!fiber.tags.includes(tag)) {
                onUpdate({ tags: [...fiber.tags, tag] });
              }
            }}
          />
        </div>
      </div>
    </EditableCardShell>
  );
}

function TagAdder({ onAdd }: { onAdd: (tag: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding && ref.current) ref.current.focus();
  }, [adding]);

  const commit = () => {
    const trimmed = input.trim();
    if (trimmed) onAdd(trimmed);
    setInput("");
    setAdding(false);
  };

  if (adding) {
    return (
      <input
        ref={ref}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setInput(""); setAdding(false); }
        }}
        className="px-2.5 py-1 rounded-full border border-blue-400/20 bg-transparent text-white/60 outline-none"
        style={{ fontSize: "10px", width: 80 }}
        placeholder="tag..."
      />
    );
  }

  return (
    <button
      onClick={() => setAdding(true)}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-white/[0.08] text-white/20 hover:text-white/40 hover:border-white/[0.15] cursor-pointer transition-colors"
      style={{ fontSize: "10px" }}
    >
      <Plus size={8} /> tag
    </button>
  );
}

/* ── 3. Insight Cards (read-only preview with link to About) ── */
export function InsightCard({
  fiber,
  half,
}: {
  fiber: FiberProfile;
  half: 1 | 2;
}) {
  const [part1, part2] = splitAboutText(fiber.about);
  const text = half === 1 ? part1 : part2;
  if (!text) return null;

  return (
    <EditableCardShell fiber={fiber} minHeight={140}>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          {half === 1 ? (
            <Lightbulb size={14} className="text-blue-400/40" />
          ) : (
            <BookOpen size={14} className="text-blue-400/40" />
          )}
          <span
            className="text-white/40 uppercase tracking-[0.14em] flex-1"
            style={{ fontSize: "11px", fontWeight: 600 }}
          >
            Insight {half} — {half === 1 ? "Origins" : "Depth"}
          </span>
          <span
            className="px-1.5 py-0.5 rounded bg-blue-400/[0.06] border border-blue-400/10 text-blue-400/40"
            style={{ fontSize: "8px" }}
          >
            auto
          </span>
        </div>

        {/* Blockquote */}
        <div className="border-l-2 border-blue-400/30 pl-4">
          <p
            className="text-white/[0.88]"
            style={{
              fontSize: "13px",
              lineHeight: 1.55,
              fontFamily: "'PICA', 'Pica', serif",
              letterSpacing: "0.06em",
            }}
          >
            {text}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div className="w-4 h-px bg-blue-400/25" />
          <span
            className="text-blue-400/40 uppercase tracking-[0.15em]"
            style={{
              fontSize: "9px",
            }}
          >
            {fiber.name} — {half === 1 ? "Origins" : "Insight"}
          </span>
        </div>

        <p className="text-white/20 mt-2 italic" style={{ fontSize: "9px" }}>
          Edit the About text to change insight content
        </p>
      </div>
    </EditableCardShell>
  );
}

/* ── 4. Trade Card ── */
export function TradeCard({
  fiber,
  onUpdate,
}: {
  fiber: FiberProfile;
  onUpdate: (patch: Partial<FiberProfile>) => void;
}) {
  const rows = [
    { icon: DollarSign, label: "Cost Range", key: "priceRange" as const, color: "text-blue-400/60", displayValue: fiber.priceRange.raw, onChangeValue: (v: string) => onUpdate({ priceRange: { ...fiber.priceRange, raw: v } }) },
    { icon: Package, label: "Typical MOQ", key: "typicalMOQ" as const, color: "text-blue-400/50", displayValue: `${fiber.typicalMOQ.quantity} ${fiber.typicalMOQ.unit.toUpperCase()}`, onChangeValue: (v: string) => { const m = v.match(/(\d+)\s*(.*)/); onUpdate({ typicalMOQ: m ? { quantity: Number(m[1]), unit: m[2].trim().toLowerCase() } : fiber.typicalMOQ }); } },
    { icon: Clock, label: "Lead Time", key: "leadTime" as const, color: "text-blue-400/50", displayValue: `${fiber.leadTime.minWeeks}–${fiber.leadTime.maxWeeks} Weeks`, onChangeValue: (v: string) => { const m = v.match(/(\d+)[–\-](\d+)/); onUpdate({ leadTime: m ? { minWeeks: Number(m[1]), maxWeeks: Number(m[2]) } : fiber.leadTime }); } },
    { icon: CalendarDays, label: "Season", key: "seasonality" as const, color: "text-blue-400/50", displayValue: fiber.seasonality, onChangeValue: (v: string) => onUpdate({ seasonality: v }) },
    { icon: MapPin, label: "Regions", key: "regions" as const, color: "text-blue-400/60", displayValue: fiber.regions.join(", "), onChangeValue: (v: string) => onUpdate({ regions: v.split(",").map((r) => r.trim()).filter(Boolean) }) },
  ];

  return (
    <EditableCardShell fiber={fiber} minHeight={200}>
      <div className="p-5">
        <CardLabel icon={DollarSign} iconColor="text-blue-400/50">
          Source & Trade
        </CardLabel>

        <div className="space-y-2.5">
          {rows.map(({ icon: Icon, label, key, color, displayValue, onChangeValue }) => (
            <div key={key} className="flex items-center gap-3">
              <Icon size={13} className={`${color} shrink-0`} />
              <span
                className="text-white/[0.48] uppercase tracking-[0.1em] shrink-0"
                style={{ fontSize: "10px", fontWeight: 600, width: 85 }}
              >
                {label}
              </span>
              <InlineText
                value={displayValue}
                onChange={onChangeValue}
                className="text-white/[0.68] flex-1"
                style={{ fontSize: "12px" }}
                placeholder={`Add ${label.toLowerCase()}...`}
              />
            </div>
          ))}
        </div>
      </div>
    </EditableCardShell>
  );
}

/* ── 5. Sustainability Card ── */
export function SustainabilityCard({
  fiber,
  onUpdate,
}: {
  fiber: FiberProfile;
  onUpdate: (patch: Partial<FiberProfile>) => void;
}) {
  const s = fiber.sustainability;
  const updateSust = (key: string, val: number | boolean | string[]) => {
    onUpdate({ sustainability: { ...s, [key]: val } });
  };

  const ratings = [
    { icon: Droplets, label: "Water", key: "waterUsage", color: "text-blue-400/80" },
    { icon: Leaf, label: "Carbon", key: "carbonFootprint", color: "text-green-400/80" },
    { icon: FlaskConical, label: "Chemical", key: "chemicalProcessing", color: "text-blue-400/80" },
    { icon: Recycle, label: "Circular", key: "circularity", color: "text-emerald-400/80" },
    { icon: Globe2, label: "Environment", key: "environmentalRating", color: "text-teal-400/80" },
  ];

  return (
    <EditableCardShell fiber={fiber} minHeight={200}>
      <div className="p-5">
        <CardLabel icon={Leaf} iconColor="text-emerald-400/50">
          Sustainability
        </CardLabel>

        <div className="space-y-3">
          {ratings.map(({ icon: Icon, label, key, color }) => (
            <div key={key} className="flex items-center gap-3">
              <Icon size={13} className={`${color} shrink-0`} />
              <span
                className="text-white/[0.48] uppercase tracking-[0.1em] shrink-0"
                style={{ fontSize: "10px", fontWeight: 600, width: 80 }}
              >
                {label}
              </span>
              <div className="flex-1 h-[4px] rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400/50 transition-[width] duration-300"
                  style={{ width: `${(((s as unknown as Record<string, unknown>)[key] as number) / 5) * 100}%` }}
                />
              </div>
              <InlineNumber
                value={(s as unknown as Record<string, number>)[key]}
                onChange={(v) => updateSust(key, v)}
              />
              <span
                className="text-white/40 shrink-0"
                style={{ fontSize: "11px", fontWeight: 600, width: 14, textAlign: "right" }}
              >
                {(s as unknown as Record<string, number>)[key]}
              </span>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => updateSust("biodegradable", !s.biodegradable)}
            className={`px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
              s.biodegradable
                ? "bg-green-500/10 border-green-500/25 text-green-400/80"
                : "bg-white/[0.02] border-white/[0.06] text-white/20 hover:text-white/40"
            }`}
            style={{ fontSize: "10px" }}
          >
            Biodegradable
          </button>
          <button
            onClick={() => updateSust("recyclable", !s.recyclable)}
            className={`px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
              s.recyclable
                ? "bg-blue-500/10 border-blue-500/25 text-blue-400/80"
                : "bg-white/[0.02] border-white/[0.06] text-white/20 hover:text-white/40"
            }`}
            style={{ fontSize: "10px" }}
          >
            Recyclable
          </button>
          {s.certifications.map((cert, i) => (
            <span
              key={cert}
              className="group/cert inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/[0.08] text-white/[0.48]"
              style={{ fontSize: "10px" }}
            >
              {cert}
              <button
                onClick={() =>
                  updateSust(
                    "certifications",
                    s.certifications.filter((_, j) => j !== i)
                  )
                }
                className="text-white/0 group-hover/cert:text-white/30 hover:!text-red-400/60 cursor-pointer transition-colors"
              >
                <X size={8} />
              </button>
            </span>
          ))}
          <TagAdder
            onAdd={(cert) => {
              if (!s.certifications.includes(cert)) {
                updateSust("certifications", [...s.certifications, cert]);
              }
            }}
          />
        </div>
      </div>
    </EditableCardShell>
  );
}

/* ── 6. Profile Pills Card ── */
export function ProfilePillsCard({
  fiber,
  onUpdate,
}: {
  fiber: FiberProfile;
  onUpdate: (patch: Partial<FiberProfile>) => void;
}) {
  const pills = fiber.profilePills;
  const entries = [
    { label: "Scientific Name", key: "scientificName" as const },
    { label: "Plant Part", key: "plantPart" as const },
    { label: "Hand", key: "handFeel" as const },
    { label: "Fiber Type", key: "fiberType" as const },
    { label: "Era", key: "era" as const },
    { label: "Origin", key: "origin" as const },
  ];

  return (
    <EditableCardShell fiber={fiber} minHeight={140}>
      <div className="p-5">
        <CardLabel icon={Layers} iconColor="text-white/30">
          Profile Pills
        </CardLabel>

        <div className="flex flex-wrap gap-2">
          {entries.map(({ label, key }) => (
            <div
              key={key}
              className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 min-w-[120px]"
            >
              <span
                className="text-white/25 block mb-0.5 uppercase tracking-[0.08em]"
                style={{ fontSize: "8px", fontWeight: 600 }}
              >
                {label}
              </span>
              <InlineText
                value={pills[key]}
                onChange={(v) =>
                  onUpdate({ profilePills: { ...pills, [key]: v } })
                }
                className="text-white/70"
                style={{ fontSize: "11px" }}
                placeholder={label}
              />
            </div>
          ))}
        </div>
      </div>
    </EditableCardShell>
  );
}

/* ── 7. Quote Card ── */
function QuoteCard({ fiber }: { fiber: FiberProfile }) {
  const quotes = dataSource.getQuoteData()[fiber.id] ?? [];

  return (
    <EditableCardShell fiber={fiber} minHeight={140}>
      <div className="p-5">
        <CardLabel icon={Quote} iconColor="text-blue-400/40">
          Quotes
        </CardLabel>

        {quotes.length === 0 ? (
          <p className="text-white/20 italic" style={{ fontSize: "11px" }}>
            No curated quotes. Add them from the supplementary editors.
          </p>
        ) : (
          <div className="space-y-4">
            {quotes.map((q, i) => (
              <div key={i}>
                <div className="border-l-2 border-blue-400/30 pl-4">
                  <p
                    className="text-white/[0.88]"
                    style={{
                      fontSize: "13px",
                      lineHeight: 1.55,
                      fontFamily: "'PICA', 'Pica', serif",
                      letterSpacing: "0.06em",
                    }}
                  >
                    &ldquo;{q.text}&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2 ml-4">
                  <div className="w-4 h-px bg-blue-400/25" />
                  <span
                    className="text-blue-400/50 uppercase tracking-[0.12em]"
                    style={{ fontSize: "9px" }}
                  >
                    {q.attribution}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-white/15 mt-3 italic" style={{ fontSize: "9px" }}>
          Use the Quotes supplementary editor for full editing
        </p>
      </div>
    </EditableCardShell>
  );
}

/* ── 8. Supplementary data card (Process/Anatomy/Care/WorldNames) ── */
function SupplementaryCard({
  fiber,
  icon,
  label,
  iconColor,
  dataDescription,
  itemCount,
  onOpenEditor,
}: {
  fiber: FiberProfile;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  iconColor: string;
  dataDescription: string;
  itemCount: number;
  onOpenEditor?: () => void;
}) {
  return (
    <EditableCardShell fiber={fiber} minHeight={100}>
      <div className="p-5">
        <CardLabel icon={icon} iconColor={iconColor}>
          {label}
        </CardLabel>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-white/50 block" style={{ fontSize: "11px" }}>
              {itemCount > 0
                ? `${itemCount} ${dataDescription}`
                : `No ${dataDescription.toLowerCase()} defined`}
            </span>
            {itemCount === 0 && (
              <span className="text-white/20 block mt-1" style={{ fontSize: "9px" }}>
                Add data to generate this card
              </span>
            )}
          </div>
          {onOpenEditor && (
            <button
              onClick={onOpenEditor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/70 hover:border-white/[0.15] cursor-pointer transition-colors"
              style={{ fontSize: "10px", fontWeight: 500 }}
            >
              <Pencil size={10} />
              Open Editor
            </button>
          )}
        </div>
      </div>
    </EditableCardShell>
  );
}

/* ── 9. See Also Card ── */
export function SeeAlsoCard({
  fiber,
  onUpdate,
}: {
  fiber: FiberProfile;
  onUpdate: (patch: Partial<FiberProfile>) => void;
}) {
  const related = fiber.seeAlso
    .map((s) => dataSource.getFiberById(s.id))
    .filter(Boolean) as FiberProfile[];

  return (
    <EditableCardShell fiber={fiber} minHeight={100}>
      <div className="p-5">
        <CardLabel icon={Link2} iconColor="text-white/30">
          See Also
        </CardLabel>

        <div className="space-y-2">
          {related.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 group/see"
            >
              <img
                src={r.image}
                alt={r.name}
                className="w-8 h-8 rounded-lg object-cover border border-white/[0.1]"
              />
              <div className="flex-1 min-w-0">
                <span
                  className="text-white/[0.88] uppercase tracking-[0.08em] block truncate"
                  style={{ fontSize: "11px", fontWeight: 500 }}
                >
                  {r.name}
                </span>
                <span className="text-white/[0.28] block truncate" style={{ fontSize: "9px" }}>
                  {r.subtitle}
                </span>
              </div>
              <button
                onClick={() =>
                  onUpdate({
                    seeAlso: fiber.seeAlso.filter((s) => s.id !== r.id),
                  })
                }
                className="text-white/0 group-hover/see:text-white/20 hover:!text-red-400/50 cursor-pointer transition-colors shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {fiber.seeAlso.length === 0 && (
          <p className="text-white/20 italic" style={{ fontSize: "11px" }}>
            No related fibers linked yet
          </p>
        )}
      </div>
    </EditableCardShell>
  );
}

/* ── 10. Contact Sheet Card ── */
function ContactSheetCard({
  fiber,
  onOpenGalleryStudio,
}: {
  fiber: FiberProfile;
  onOpenGalleryStudio?: () => void;
}) {
  const images = fiber.galleryImages ?? [];

  return (
    <EditableCardShell fiber={fiber} minHeight={100}>
      <div className="p-5">
        <CardLabel icon={ImageIcon} iconColor="text-white/30">
          Contact Sheet
        </CardLabel>

        {images.length > 0 ? (
          <div className="grid grid-cols-4 gap-1.5">
            {images.slice(0, 8).map((img, i) => (
              <div
                key={img.url}
                className="aspect-square rounded-lg overflow-hidden border border-white/[0.06]"
              >
                <img
                  src={img.url}
                  alt={img.title ?? `Image ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {images.length > 8 && (
              <div className="aspect-square rounded-lg border border-white/[0.06] flex items-center justify-center bg-white/[0.02]">
                <span className="text-white/30" style={{ fontSize: "11px" }}>
                  +{images.length - 8}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-white/20 italic" style={{ fontSize: "11px" }}>
            No gallery images
          </p>
        )}

        {onOpenGalleryStudio && (
          <button
            onClick={onOpenGalleryStudio}
            className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/70 hover:border-white/[0.15] cursor-pointer transition-colors"
            style={{ fontSize: "10px", fontWeight: 500 }}
          >
            <ImageIcon size={10} />
            Gallery Studio
          </button>
        )}
      </div>
    </EditableCardShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN CARD EDITOR
   ═══════════════════════════════════════════════════════════ */

interface CardEditorProps {
  fiberId: string;
  onOpenGalleryStudio?: () => void;
  onScrollToFormSection?: (section: string) => void;
}

export function CardEditor({ fiberId, onOpenGalleryStudio, onScrollToFormSection }: CardEditorProps) {
  const { getFiberById, updateFiber, version } = useAtlasData();
  const fiber = getFiberById(fiberId);

  /* Draft + debounced save (mirroring fiber-editor.tsx logic) */
  const [draft, setDraft] = useState<FiberProfile | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<Partial<FiberProfile>>({});
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confirmSave = useCallback(() => {
    setSaveState("saved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveState("idle"), 1500);
  }, []);

  /* Sync + flush on fiber switch */
  useEffect(() => {
    if (fiberId !== lastIdRef.current) {
      if (lastIdRef.current && Object.keys(pendingPatchRef.current).length > 0) {
        const prevId = lastIdRef.current;
        const prevPatch = pendingPatchRef.current;
        pendingPatchRef.current = {};
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        updateFiber(prevId, prevPatch);
      }
      lastIdRef.current = fiberId;
      const f = getFiberById(fiberId);
      if (f) setDraft({ ...f });
      setSaveState("idle");
    }
  }, [fiberId, getFiberById, updateFiber]);

  /* Also re-sync draft when version changes (e.g. undo/redo) */
  useEffect(() => {
    const f = getFiberById(fiberId);
    if (f && Object.keys(pendingPatchRef.current).length === 0) {
      setDraft({ ...f });
    }
  }, [version, fiberId, getFiberById]);

  /* Flush on unmount */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const accumulated = pendingPatchRef.current;
      if (Object.keys(accumulated).length > 0 && lastIdRef.current) {
        dataSource.updateFiber(lastIdRef.current, accumulated);
      }
    };
  }, []);

  const pushUpdate = useCallback(
    (patch: Partial<FiberProfile>) => {
      setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
      setSaveState("pending");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const accumulated = pendingPatchRef.current;
        pendingPatchRef.current = {};
        updateFiber(fiberId, accumulated);
        confirmSave();
      }, 300);
    },
    [fiberId, updateFiber, confirmSave]
  );

  /* Supplementary data counts */
  const processSteps = useMemo(
    () => (dataSource.getProcessData()[fiberId] ?? []).length,
    [fiberId, version]
  );
  const hasAnatomy = useMemo(
    () => !!dataSource.getAnatomyData()[fiberId],
    [fiberId, version]
  );
  const hasCare = useMemo(
    () => !!dataSource.getCareData()[fiberId],
    [fiberId, version]
  );
  const worldNames = useMemo(
    () => (dataSource.getWorldNames()[fiberId] ?? []).length,
    [fiberId, version]
  );
  const sentences = useMemo(
    () => draft?.about?.match(/[^.!?]+[.!?]+/g) ?? [],
    [draft?.about]
  );

  if (!draft || !fiber) {
    return (
      <div className="flex items-center justify-center h-40 text-white/20" style={{ fontSize: "12px" }}>
        Select a fiber to edit
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white/30" style={{ fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
            Card Editor
          </span>
          <span className="text-white/15" style={{ fontSize: "9px" }}>
            Click any field to edit inline
          </span>
        </div>
        <div className="flex items-center gap-2">
          {saveState === "pending" && (
            <span className="text-white/20 animate-pulse" style={{ fontSize: "9px" }}>saving...</span>
          )}
          {saveState === "saved" && (
            <span className="inline-flex items-center gap-0.5 text-emerald-400/60" style={{ fontSize: "9px" }}>
              <Check size={8} /> saved
            </span>
          )}
        </div>
      </div>

      {/* Scrollable card list */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}
      >
        {/* Profile Hero */}
        <ProfileHeroCard fiber={draft} onUpdate={pushUpdate} />

        {/* About */}
        <AboutCard fiber={draft} onUpdate={pushUpdate} />

        {/* Insights (auto-generated) */}
        {sentences.length >= 2 && (
          <>
            <InsightCard fiber={draft} half={1} />
            <InsightCard fiber={draft} half={2} />
          </>
        )}

        {/* Profile Pills */}
        <ProfilePillsCard fiber={draft} onUpdate={pushUpdate} />

        {/* Trade */}
        <TradeCard fiber={draft} onUpdate={pushUpdate} />

        {/* Sustainability */}
        <SustainabilityCard fiber={draft} onUpdate={pushUpdate} />

        {/* Quote */}
        <QuoteCard fiber={draft} />

        {/* Supplementary data cards */}
        <SupplementaryCard
          fiber={draft}
          icon={Layers}
          label="Process"
          iconColor="text-teal-400/50"
          dataDescription={processSteps === 1 ? "step" : "steps"}
          itemCount={processSteps}
          onOpenEditor={onScrollToFormSection ? () => onScrollToFormSection("Process Steps") : undefined}
        />

        <SupplementaryCard
          fiber={draft}
          icon={Dna}
          label="Anatomy"
          iconColor="text-cyan-400/50"
          dataDescription="anatomy data"
          itemCount={hasAnatomy ? 1 : 0}
          onOpenEditor={onScrollToFormSection ? () => onScrollToFormSection("Anatomy") : undefined}
        />

        <SupplementaryCard
          fiber={draft}
          icon={Shirt}
          label="Care & Use"
          iconColor="text-indigo-400/50"
          dataDescription="care data"
          itemCount={hasCare ? 1 : 0}
          onOpenEditor={onScrollToFormSection ? () => onScrollToFormSection("Care & Use") : undefined}
        />

        <SupplementaryCard
          fiber={draft}
          icon={Globe2}
          label="World Names"
          iconColor="text-purple-400/50"
          dataDescription={worldNames === 1 ? "name" : "names"}
          itemCount={worldNames}
          onOpenEditor={onScrollToFormSection ? () => onScrollToFormSection("World Names") : undefined}
        />

        {/* See Also */}
        <SeeAlsoCard fiber={draft} onUpdate={pushUpdate} />

        {/* Contact Sheet / Gallery */}
        <ContactSheetCard fiber={draft} onOpenGalleryStudio={onOpenGalleryStudio} />
      </div>
    </div>
  );
}