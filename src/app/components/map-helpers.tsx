import {
  Droplets,
  FlaskConical,
  Leaf,
  Recycle,
  Globe2,
} from "lucide-react";
import { useState, useEffect } from "react";

import worldSvgUrl from "../../imports/world.svg?url";

/* ═══════════════════════════════════════════
   REGION DOT DATABASE
   Equirectangular projection calibrated to the Simplemaps
   world.svg (viewBox 2000×857, lat ≈ 84 °N → −67 °S).
   Formulae:  x = lon + 180   y = (84 − lat) / 151 × 160
   ═══════════════════════════════════════════ */

interface RegionDot {
  x: number;
  y: number;
  label: string;
}

const REGION_MAP: Record<string, RegionDot[]> = {
  /* ── Asia ── */
  "Central Asia":    [{ x: 245, y: 46, label: "Central Asia" }],
  "China":           [{ x: 285, y: 52, label: "China" }],
  "India":           [{ x: 258, y: 67, label: "India" }],
  "Southeast Asia":  [{ x: 285, y: 78, label: "SE Asia" }],
  "Japan":           [{ x: 318, y: 51, label: "Japan" }],
  "Korea":           [{ x: 308, y: 51, label: "Korea" }],
  "South Korea":     [{ x: 308, y: 51, label: "S. Korea" }],
  "Bangladesh":      [{ x: 270, y: 64, label: "Bangladesh" }],
  "Pakistan":        [{ x: 249, y: 57, label: "Pakistan" }],
  "Indonesia":       [{ x: 298, y: 91, label: "Indonesia" }],
  "Java":            [{ x: 290, y: 92, label: "Java" }],
  "Philippines":     [{ x: 302, y: 76, label: "Philippines" }],
  "Thailand":        [{ x: 280, y: 73, label: "Thailand" }],
  "Vietnam":         [{ x: 286, y: 72, label: "Vietnam" }],
  "Myanmar":         [{ x: 277, y: 68, label: "Myanmar" }],
  "Cambodia":        [{ x: 285, y: 76, label: "Cambodia" }],
  "Nepal":           [{ x: 264, y: 59, label: "Nepal" }],
  "Bhutan":          [{ x: 270, y: 60, label: "Bhutan" }],
  "Sri Lanka":       [{ x: 261, y: 81, label: "Sri Lanka" }],
  "Taiwan":          [{ x: 301, y: 64, label: "Taiwan" }],
  "Mongolia":        [{ x: 284, y: 39, label: "Mongolia" }],
  "Tibet":           [{ x: 271, y: 52, label: "Tibet" }],
  "Malaysia":        [{ x: 282, y: 85, label: "Malaysia" }],
  "Uzbekistan":      [{ x: 249, y: 46, label: "Uzbekistan" }],
  "Kyrgyzstan":      [{ x: 255, y: 45, label: "Kyrgyzstan" }],

  /* ── Europe ── */
  "Europe":          [{ x: 190, y: 36, label: "Europe" }],
  "Western Europe":  [{ x: 182, y: 39, label: "W. Europe" }],
  "Eastern Europe":  [{ x: 200, y: 36, label: "E. Europe" }],
  "Northern Europe": [{ x: 190, y: 25, label: "N. Europe" }],
  "Scandinavia":     [{ x: 192, y: 22, label: "Scandinavia" }],
  "Mediterranean":   [{ x: 195, y: 47, label: "Mediterranean" }],
  "France":          [{ x: 182, y: 39, label: "France" }],
  "Italy":           [{ x: 192, y: 45, label: "Italy" }],
  "Spain":           [{ x: 176, y: 47, label: "Spain" }],
  "Germany":         [{ x: 190, y: 35, label: "Germany" }],
  "UK":              [{ x: 178, y: 32, label: "UK" }],
  "Belgium":         [{ x: 184, y: 35, label: "Belgium" }],
  "Netherlands":     [{ x: 186, y: 34, label: "Netherlands" }],
  "Austria":         [{ x: 194, y: 38, label: "Austria" }],
  "Portugal":        [{ x: 171, y: 48, label: "Portugal" }],
  "Romania":         [{ x: 206, y: 41, label: "Romania" }],
  "Norway":          [{ x: 190, y: 22, label: "Norway" }],
  "Greenland":       [{ x: 138, y: 12, label: "Greenland" }],

  /* ── Middle East & Turkey ── */
  "Turkey":          [{ x: 215, y: 48, label: "Turkey" }],
  "Egypt":           [{ x: 210, y: 60, label: "Egypt" }],
  "Middle East":     [{ x: 225, y: 58, label: "Middle East" }],
  "Iran":            [{ x: 233, y: 54, label: "Iran" }],
  "Afghanistan":     [{ x: 249, y: 50, label: "Afghanistan" }],

  /* ── Africa ── */
  "Africa":          [{ x: 202, y: 87, label: "Africa" }],
  "East Africa":     [{ x: 217, y: 90, label: "E. Africa" }],
  "West Africa":     [{ x: 178, y: 78, label: "W. Africa" }],
  "North Africa":    [{ x: 190, y: 57, label: "N. Africa" }],
  "South Africa":    [{ x: 208, y: 120, label: "S. Africa" }],
  "Sub-Saharan Africa": [{ x: 202, y: 94, label: "Sub-Saharan" }],
  "Tanzania":        [{ x: 215, y: 95, label: "Tanzania" }],
  "Kenya":           [{ x: 218, y: 89, label: "Kenya" }],
  "Ethiopia":        [{ x: 219, y: 79, label: "Ethiopia" }],
  "Uganda":          [{ x: 213, y: 88, label: "Uganda" }],
  "Madagascar":      [{ x: 227, y: 109, label: "Madagascar" }],
  "Morocco":         [{ x: 174, y: 55, label: "Morocco" }],
  "Algeria":         [{ x: 183, y: 55, label: "Algeria" }],
  "Tunisia":         [{ x: 190, y: 53, label: "Tunisia" }],
  "Lesotho":         [{ x: 208, y: 121, label: "Lesotho" }],

  /* ── Americas ── */
  "North America":   [{ x: 80, y: 47, label: "N. America" }],
  "United States":   [{ x: 82, y: 48, label: "USA" }],
  "USA":             [{ x: 82, y: 48, label: "USA" }],
  "Canada":          [{ x: 84, y: 30, label: "Canada" }],
  "Mexico":          [{ x: 78, y: 65, label: "Mexico" }],
  "Central America": [{ x: 93, y: 74, label: "C. America" }],
  "South America":   [{ x: 125, y: 100, label: "S. America" }],
  "Brazil":          [{ x: 128, y: 100, label: "Brazil" }],
  "Peru":            [{ x: 104, y: 100, label: "Peru" }],
  "Argentina":       [{ x: 116, y: 125, label: "Argentina" }],
  "Colombia":        [{ x: 106, y: 85, label: "Colombia" }],
  "Bolivia":         [{ x: 114, y: 106, label: "Bolivia" }],
  "Chile":           [{ x: 110, y: 122, label: "Chile" }],
  "Ecuador":         [{ x: 101, y: 89, label: "Ecuador" }],
  "Uruguay":         [{ x: 124, y: 122, label: "Uruguay" }],
  "Caribbean":       [{ x: 105, y: 70, label: "Caribbean" }],
  "Costa Rica":      [{ x: 96, y: 79, label: "Costa Rica" }],
  "Alaska":          [{ x: 30, y: 22, label: "Alaska" }],

  /* ── Oceania ── */
  "Australia":       [{ x: 314, y: 116, label: "Australia" }],
  "New Zealand":     [{ x: 354, y: 134, label: "New Zealand" }],
  "Oceania":         [{ x: 340, y: 100, label: "Oceania" }],

  /* ── Russia ── */
  "Russia":          [{ x: 280, y: 25, label: "Russia" }],

  /* ── Aggregates ── */
  "Worldwide":       [
    { x: 85,  y: 57,  label: "Americas" },
    { x: 190, y: 36,  label: "Europe" },
    { x: 260, y: 62,  label: "Asia" },
    { x: 202, y: 89,  label: "Africa" },
  ],
  "Global":          [
    { x: 85,  y: 57,  label: "Americas" },
    { x: 190, y: 36,  label: "Europe" },
    { x: 260, y: 62,  label: "Asia" },
  ],
  "Tropical":        [
    { x: 110, y: 84,  label: "Americas" },
    { x: 205, y: 94,  label: "Africa" },
    { x: 280, y: 84,  label: "Asia" },
  ],
  "Temperate":       [
    { x: 85,  y: 47,  label: "Americas" },
    { x: 190, y: 36,  label: "Europe" },
    { x: 280, y: 47,  label: "Asia" },
  ],
};

export function resolveRegionDots(regionsStr: string): RegionDot[] {
  const regions = regionsStr.split(", ").map((r) => r.trim());
  const dots: RegionDot[] = [];
  const seen = new Set<string>();

  for (const region of regions) {
    // Try exact match first
    let matched = REGION_MAP[region];

    // Fuzzy: strip parenthetical qualifiers — "USA (Texas)" → "USA"
    if (!matched) {
      const base = region.replace(/\s*\(.*?\)\s*$/, "").trim();
      if (base !== region) matched = REGION_MAP[base];
    }

    if (matched) {
      for (const dot of matched) {
        const key = `${dot.x}-${dot.y}`;
        if (!seen.has(key)) {
          seen.add(key);
          dots.push({ ...dot, label: region.replace(/\s*\(.*?\)/, "").trim() });
        }
      }
    }
  }

  // Fallback: if nothing matched, place a generic dot
  if (dots.length === 0) {
    dots.push({ x: 180, y: 70, label: regionsStr });
  }

  return dots;
}

/* ═══════════════════════════════════════════
   WORLD MAP — Simplemaps.com SVG (MIT license)
   Paths fetched at runtime, rendered inline in our SVG.
   Source viewBox 2000×857 → scaled into 360×160 space.
   ═══════════════════════════════════════════ */

/*
 * Transform from SVG source coords (2000×857) into our 360×160 viewBox.
 * scaleX = 360/2000 = 0.18   scaleY = 160/857 ≈ 0.1867
 * A small Y translate (~-1) trims the arctic margin so dots align.
 */
const SX = 360 / 2000;
const SY = 160 / 857;

/** Lazily-loaded world path data (shared across all instances) */
let _cachedPaths: string[] | null = null;
let _loadPromise: Promise<string[]> | null = null;

function loadWorldPaths(): Promise<string[]> {
  if (_cachedPaths) return Promise.resolve(_cachedPaths);
  if (_loadPromise) return _loadPromise;
  _loadPromise = fetch(worldSvgUrl)
    .then((r) => r.text())
    .then((text) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "image/svg+xml");
      const els = doc.querySelectorAll("path");
      const paths = Array.from(els).map((p) => p.getAttribute("d") || "");
      _cachedPaths = paths;
      return paths;
    })
    .catch(() => {
      _loadPromise = null;
      return [] as string[];
    });
  return _loadPromise;
}

/** Hook: returns the parsed world SVG path strings */
function useWorldPaths(): string[] {
  const [paths, setPaths] = useState<string[]>(_cachedPaths ?? []);
  useEffect(() => {
    if (!_cachedPaths) {
      loadWorldPaths().then(setPaths);
    }
  }, []);
  return paths;
}

/** Renders country silhouette paths scaled into 360×160 space */
function WorldSilhouette() {
  const paths = useWorldPaths();
  if (paths.length === 0) return null;
  return (
    <g transform={`scale(${SX},${SY})`} opacity="0.2">
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="rgba(255,255,255,0.7)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="0.4"
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

/** Original simple map — kept for backward compatibility */
export function MiniWorldMap({ dots }: { dots: RegionDot[] }) {
  return (
    <svg viewBox="0 0 360 160" className="w-full" style={{ aspectRatio: "360/160" }}>
      <defs>
        <filter id="region-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="region-glow-strong">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Country-level world map silhouette */}
      <WorldSilhouette />

      {/* Graticule grid */}
      {GRATICULE_LATS.map((y) => (
        <line key={`lat-${y}`} x1="0" y1={y} x2="360" y2={y}
          stroke="rgba(255,255,255,0.025)" strokeWidth="0.4" strokeDasharray="4 6" />
      ))}
      {GRATICULE_LONS.map((x) => (
        <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2="160"
          stroke="rgba(255,255,255,0.025)" strokeWidth="0.4" strokeDasharray="4 6" />
      ))}

      {/* Equator emphasis (0° latitude → y = 89) */}
      <line x1="0" y1="89" x2="360" y2="89"
        stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

      {dots.map((dot, i) => (
        <g key={i}>
          <circle cx={dot.x} cy={dot.y} r="6" fill="rgba(15,120,60,0.12)" />
          <circle cx={dot.x} cy={dot.y} r="3" fill="rgba(26,155,80,0.2)" />
          <circle cx={dot.x} cy={dot.y} r="1.5" fill="rgba(26,155,80,0.7)" />
        </g>
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════
   ENHANCED INTERACTIVE WORLD MAP
   — Graticule grid, connection arcs,
     hover-linked dots, origin marker
   ═══════════════════════════════════════════ */

/** Generate a quadratic Bézier arc between two dots */
function connectionArc(a: RegionDot, b: RegionDot): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // Arc curvature perpendicular to the midpoint
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const bulge = Math.min(dist * 0.25, 20);
  // Perpendicular offset (always curve upward for aesthetics)
  const cx = mx - (dy / dist) * bulge;
  const cy = my + (dx / dist) * bulge * 0.3 - bulge * 0.5;
  return `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`;
}

/** Graticule lines at standard parallels and meridians.
 * y values computed from: y = (84 − lat) / 151 × 160
 *   60°N → 25.4,  30°N → 57.2,  0° (equator) → 89.0,  30°S → 120.8,  60°S → 152.6
 */
const GRATICULE_LATS = [25, 57, 89, 121, 153]; // 60°N, 30°N, 0°, 30°S, 60°S
const GRATICULE_LONS = [60, 120, 180, 240, 300]; // −120°, −60°, 0° (PM), 60°, 120°

export function InteractiveWorldMap({
  dots,
  highlightIndex = null,
  originIndex = 0,
  onHoverDot,
}: {
  dots: RegionDot[];
  highlightIndex?: number | null;
  originIndex?: number;
  onHoverDot?: (index: number | null) => void;
}) {
  // Build connection arcs between consecutive dots
  const arcs: string[] = [];
  if (dots.length >= 2) {
    for (let i = 0; i < dots.length - 1; i++) {
      arcs.push(connectionArc(dots[i], dots[i + 1]));
    }
    // Also connect last → first if 3+ dots for a network feel
    if (dots.length >= 3) {
      arcs.push(connectionArc(dots[dots.length - 1], dots[0]));
    }
  }

  return (
    <svg viewBox="0 0 360 160" className="relative w-full h-full">
      <defs>
        <filter id="region-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="region-glow-strong">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Graticule grid */}
      {GRATICULE_LATS.map((y) => (
        <line key={`lat-${y}`} x1="0" y1={y} x2="360" y2={y}
          stroke="rgba(255,255,255,0.025)" strokeWidth="0.4" strokeDasharray="4 6" />
      ))}
      {GRATICULE_LONS.map((x) => (
        <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2="160"
          stroke="rgba(255,255,255,0.025)" strokeWidth="0.4" strokeDasharray="4 6" />
      ))}

      {/* Equator emphasis (0° latitude → y = 89) */}
      <line x1="0" y1="89" x2="360" y2="89"
        stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

      {/* Country-level world map silhouette */}
      <WorldSilhouette />

      {/* Connection arcs */}
      {arcs.map((d, i) => (
        <path key={`arc-${i}`} d={d}
          fill="none"
          stroke={highlightIndex !== null ? "rgba(15,120,60,0.12)" : "rgba(15,120,60,0.08)"}
          strokeWidth="0.6"
          strokeDasharray="3 4"
          className="transition-[stroke] duration-300"
        />
      ))}

      {/* Region dots */}
      {dots.map((dot, i) => {
        const isHighlighted = highlightIndex === i;
        const isOrigin = originIndex === i;
        const isDimmed = highlightIndex !== null && !isHighlighted;

        return (
          <g key={i}
            onMouseEnter={() => onHoverDot?.(i)}
            onMouseLeave={() => onHoverDot?.(null)}
            style={{ cursor: "default" }}
            className="transition-opacity duration-300"
            opacity={isDimmed ? 0.35 : 1}
          >
            {/* Pulse ring on highlight */}
            {isHighlighted && (
              <circle cx={dot.x} cy={dot.y} r="10"
                fill="none" stroke="rgba(26,155,80,0.3)" strokeWidth="0.5">
                <animate attributeName="r" from="6" to="14" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Outer glow */}
            <circle cx={dot.x} cy={dot.y}
              r={isHighlighted ? 8 : 6}
              fill={isHighlighted ? "rgba(15,120,60,0.25)" : "rgba(15,120,60,0.12)"}
              filter={isHighlighted ? "url(#region-glow-strong)" : undefined}
              className="transition-all duration-300"
            />
            {/* Mid ring */}
            <circle cx={dot.x} cy={dot.y}
              r={isHighlighted ? 4 : 3}
              fill={isHighlighted ? "rgba(26,155,80,0.4)" : "rgba(26,155,80,0.2)"}
              className="transition-all duration-300"
            />
            {/* Core — diamond for origin, circle for others */}
            {isOrigin ? (
              <rect
                x={dot.x - (isHighlighted ? 2.5 : 2)}
                y={dot.y - (isHighlighted ? 2.5 : 2)}
                width={isHighlighted ? 5 : 4}
                height={isHighlighted ? 5 : 4}
                rx="0.5"
                transform={`rotate(45 ${dot.x} ${dot.y})`}
                fill={isHighlighted ? "rgba(26,155,80,1)" : "rgba(26,155,80,0.85)"}
                className="transition-all duration-300"
              />
            ) : (
              <circle cx={dot.x} cy={dot.y}
                r={isHighlighted ? 2 : 1.5}
                fill={isHighlighted ? "rgba(26,155,80,1)" : "rgba(26,155,80,0.7)"}
                className="transition-all duration-300"
              />
            )}

            {/* Hover label */}
            {isHighlighted && (
              <text
                x={dot.x} y={dot.y - 12}
                textAnchor="middle"
                fill="rgba(255,255,255,0.7)"
                style={{ fontSize: "5px", letterSpacing: "0.08em", fontWeight: 500 }}
              >
                {dot.label}
              </text>
            )}

            {/* Hit area (invisible, larger for easier hover) */}
            <circle cx={dot.x} cy={dot.y} r="12" fill="transparent" />
          </g>
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════
   SUSTAINABILITY RADAR CHART
   ═══════════════════════════════════════════ */

interface RadarMetric {
  label: string;
  value: number;
  max: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export function getSustainabilityMetrics(sustainability: {
  environmentalRating: number;
  waterUsage: number;
  carbonFootprint: number;
  chemicalProcessing: number;
  circularity: number;
}): RadarMetric[] {
  return [
    { label: "Eco Rating", value: sustainability.environmentalRating, max: 5, icon: Leaf },
    { label: "Water", value: 5 - sustainability.waterUsage, max: 5, icon: Droplets },
    { label: "Carbon", value: 5 - sustainability.carbonFootprint, max: 5, icon: Globe2 },
    { label: "Chemical", value: 5 - sustainability.chemicalProcessing, max: 5, icon: FlaskConical },
    { label: "Circularity", value: sustainability.circularity, max: 5, icon: Recycle },
  ];
}

export function SustainabilityRadar({ values, showValues }: { values: RadarMetric[]; showValues?: boolean }) {
  const n = values.length;
  const cx = 50;
  const cy = 50;
  const maxR = 38;
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  const getPoint = (index: number, radius: number) => {
    const angle = (index / n) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  };

  // Background rings
  const ringPaths = rings.map((scale) => {
    const r = maxR * scale;
    const points = Array.from({ length: n }, (_, i) => getPoint(i, r));
    return points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ") + " Z";
  });

  // Data polygon
  const dataPoints = values.map((v, i) =>
    getPoint(i, (v.value / v.max) * maxR)
  );
  const dataPath =
    dataPoints.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ") + " Z";

  // Axis lines
  const axes = Array.from({ length: n }, (_, i) => getPoint(i, maxR));

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Background rings */}
        {ringPaths.map((d, i) => (
          <path
            key={`ring-${i}`}
            d={d}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.3"
          />
        ))}

        {/* Axis lines */}
        {axes.map((pt, i) => (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={pt.x}
            y2={pt.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.3"
          />
        ))}

        {/* Data fill */}
        <path d={dataPath} fill="rgba(15,120,60,0.15)" stroke="rgba(26,155,80,0.5)" strokeWidth="0.6" />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle key={`pt-${i}`} cx={p.x} cy={p.y} r="1.2" fill="rgba(26,155,80,0.8)" />
        ))}
      </svg>

      {/* HTML icon labels overlaid */}
      {values.map((v, i) => {
        const labelPt = getPoint(i, maxR + 10);
        return (
          <div
            key={`label-${i}`}
            className="absolute flex flex-col items-center pointer-events-none"
            style={{
              left: `${labelPt.x}%`,
              top: `${labelPt.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <v.icon size={10} className="text-[#4ADE80]/70" />
            <span
              className="text-white/40 mt-[1px] whitespace-nowrap"
              style={{ fontSize: "clamp(7px, 2.5cqi, 10px)" }}
            >
              {v.label}{showValues ? ` ${v.value}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}