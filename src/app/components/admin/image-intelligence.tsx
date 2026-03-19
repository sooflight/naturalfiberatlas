/**
 * image-intelligence.tsx — Image analysis & health scanning.
 *
 * C15: Auto-orientation detection, URL validation, bulk health scanning,
 * duplicate detection, and smart crop preview matrix.
 */

import { useState, useMemo, useCallback } from "react";
import { useAtlasData, useAdminMode } from "../../context/atlas-data-context";
import { dataSource } from "../../data/data-provider";
import type { FiberProfile } from "../../data/atlas-data";
import { toast } from "sonner";
import {
  ScanSearch,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Image as ImageIcon,
  RectangleHorizontal,
  RectangleVertical,
  Copy as CopyIcon,
  Pencil,
  RefreshCw,
  Layers,
  Globe,
  Zap,
} from "lucide-react";

/* ── Types ── */

interface ImageScanResult {
  fiberId: string;
  fiberName: string;
  url: string;
  index: number;
  status: "ok" | "slow" | "broken" | "pending" | "checking";
  loadTimeMs?: number;
  naturalWidth?: number;
  naturalHeight?: number;
  detectedOrientation?: "portrait" | "landscape";
  currentOrientation?: "portrait" | "landscape";
  orientationMismatch?: boolean;
}

interface DuplicateGroup {
  url: string;
  fibers: Array<{ fiberId: string; fiberName: string; index: number }>;
}

/* ── URL pattern validation ── */
function isCloudinaryUrl(url: string): boolean {
  return url.includes("res.cloudinary.com") || url.includes("cloudinary.com");
}

function detectDuplicates(fibers: FiberProfile[]): DuplicateGroup[] {
  const urlMap = new Map<string, Array<{ fiberId: string; fiberName: string; index: number }>>();

  for (const fiber of fibers) {
    const gallery = fiber.galleryImages ?? [];
    for (let i = 0; i < gallery.length; i++) {
      const url = gallery[i].url;
      if (!url) continue;
      const existing = urlMap.get(url) ?? [];
      existing.push({ fiberId: fiber.id, fiberName: fiber.name, index: i });
      urlMap.set(url, existing);
    }
  }

  return [...urlMap.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([url, fibers]) => ({ url, fibers }));
}

/* ═══════════════════════════════════════════════════════════
   Image Intelligence Panel
   ═══════════════════════════════════════════════════════════ */

export function ImageIntelligence() {
  const { fibers, version } = useAtlasData();
  const { setEditingFiberId, setAdminView } = useAdminMode();
  const [scanResults, setScanResults] = useState<ImageScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState<"scan" | "duplicates" | "patterns">("scan");

  /* Duplicates */
  const duplicates = useMemo(() => detectDuplicates(fibers), [fibers, version]);

  /* URL pattern analysis */
  const urlStats = useMemo(() => {
    let total = 0;
    let cloudinary = 0;
    let other = 0;
    let missing = 0;
    let noOrientation = 0;

    for (const fiber of fibers) {
      const gallery = fiber.galleryImages ?? [];
      total += gallery.length;
      for (const img of gallery) {
        if (!img.url) { missing++; continue; }
        if (isCloudinaryUrl(img.url)) cloudinary++;
        else other++;
        if (!img.orientation) noOrientation++;
      }
    }

    return { total, cloudinary, other, missing, noOrientation };
  }, [fibers, version]);

  /* Bulk scan */
  const handleScan = useCallback(async () => {
    setScanning(true);
    const results: ImageScanResult[] = [];

    for (const fiber of fibers) {
      const gallery = fiber.galleryImages ?? [];
      for (let i = 0; i < gallery.length; i++) {
        const img = gallery[i];
        if (!img.url) {
          results.push({
            fiberId: fiber.id,
            fiberName: fiber.name,
            url: "",
            index: i,
            status: "broken",
          });
          continue;
        }

        results.push({
          fiberId: fiber.id,
          fiberName: fiber.name,
          url: img.url,
          index: i,
          status: "checking",
          currentOrientation: img.orientation,
        });
      }
    }

    setScanResults([...results]);

    // Scan in batches of 10
    const BATCH_SIZE = 10;
    for (let batch = 0; batch < results.length; batch += BATCH_SIZE) {
      const slice = results.slice(batch, batch + BATCH_SIZE);
      await Promise.all(
        slice.map(async (result) => {
          if (result.status === "broken") return;

          const start = performance.now();
          try {
            const imgEl = new Image();
            await new Promise<void>((resolve, reject) => {
              imgEl.onload = () => {
                const loadTime = performance.now() - start;
                result.naturalWidth = imgEl.naturalWidth;
                result.naturalHeight = imgEl.naturalHeight;
                result.detectedOrientation =
                  imgEl.naturalHeight > imgEl.naturalWidth ? "portrait" : "landscape";
                result.orientationMismatch =
                  !!result.currentOrientation &&
                  result.currentOrientation !== result.detectedOrientation;
                result.loadTimeMs = Math.round(loadTime);
                result.status = loadTime > 3000 ? "slow" : "ok";
                resolve();
              };
              imgEl.onerror = () => {
                result.status = "broken";
                result.loadTimeMs = Math.round(performance.now() - start);
                reject();
              };
              imgEl.src = result.url;
            });
          } catch {
            result.status = "broken";
          }
        }),
      );

      setScanResults([...results]);
    }

    setScanning(false);

    const broken = results.filter((r) => r.status === "broken").length;
    const slow = results.filter((r) => r.status === "slow").length;
    const mismatched = results.filter((r) => r.orientationMismatch).length;
    toast.success(
      `Scan complete: ${results.length} images · ${broken} broken · ${slow} slow · ${mismatched} orientation mismatches`,
    );
  }, [fibers]);

  /* Auto-fix orientations */
  const handleFixOrientations = useCallback(() => {
    const mismatched = scanResults.filter((r) => r.orientationMismatch && r.detectedOrientation);
    if (mismatched.length === 0) { toast.error("No mismatches to fix"); return; }

    for (const result of mismatched) {
      const fiber = dataSource.getFiberById(result.fiberId);
      if (!fiber?.galleryImages) continue;
      const gallery = [...fiber.galleryImages];
      if (gallery[result.index]) {
        gallery[result.index] = { ...gallery[result.index], orientation: result.detectedOrientation };
      }
      dataSource.updateFiber(result.fiberId, { galleryImages: gallery });
    }

    toast.success(`Fixed orientation on ${mismatched.length} images`);
    handleScan(); // Re-scan to update results
  }, [scanResults, handleScan]);

  const handleEditFiber = (id: string) => {
    setEditingFiberId(id);
    setAdminView("edit");
  };

  /* Scan stats */
  const okCount = scanResults.filter((r) => r.status === "ok").length;
  const slowCount = scanResults.filter((r) => r.status === "slow").length;
  const brokenCount = scanResults.filter((r) => r.status === "broken").length;
  const mismatchCount = scanResults.filter((r) => r.orientationMismatch).length;

  const TABS = [
    { key: "scan" as const, label: "Health Scan" },
    { key: "duplicates" as const, label: `Duplicates (${duplicates.length})` },
    { key: "patterns" as const, label: "URL Patterns" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-white/[0.06]">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`flex-1 py-2 text-center cursor-pointer transition-colors ${
              tab === key
                ? "text-blue-400/70 border-b border-blue-400/30"
                : "text-white/30 hover:text-white/50"
            }`}
            onClick={() => setTab(key)}
            style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Health Scan tab ── */}
        {tab === "scan" && (
          <div className="p-4 space-y-3">
            {/* Scan button */}
            <button
              onClick={handleScan}
              disabled={scanning}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-400/10 border border-blue-400/20 rounded-lg text-blue-400/80 hover:text-blue-400 disabled:opacity-50 transition-colors cursor-pointer"
              style={{ fontSize: "12px", fontWeight: 600 }}
            >
              {scanning ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ScanSearch size={14} />
              )}
              {scanning
                ? `Scanning... ${okCount + slowCount + brokenCount}/${scanResults.length}`
                : scanResults.length > 0
                  ? "Re-scan All Images"
                  : "Scan All Gallery Images"
              }
            </button>

            {/* Summary */}
            {scanResults.length > 0 && (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="flex items-center gap-1 text-emerald-400/60" style={{ fontSize: "10px" }}>
                  <CheckCircle2 size={10} /> {okCount} ok
                </span>
                {slowCount > 0 && (
                  <span className="flex items-center gap-1 text-blue-400/60" style={{ fontSize: "10px" }}>
                    <AlertTriangle size={10} /> {slowCount} slow
                  </span>
                )}
                {brokenCount > 0 && (
                  <span className="flex items-center gap-1 text-red-400/60" style={{ fontSize: "10px" }}>
                    <XCircle size={10} /> {brokenCount} broken
                  </span>
                )}
                {mismatchCount > 0 && (
                  <span className="flex items-center gap-1 text-purple-400/60" style={{ fontSize: "10px" }}>
                    <RefreshCw size={10} /> {mismatchCount} orientation
                  </span>
                )}
              </div>
            )}

            {/* Auto-fix button */}
            {mismatchCount > 0 && (
              <button
                onClick={handleFixOrientations}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-400/10 border border-purple-400/15 rounded-lg text-purple-400/60 hover:text-purple-400 cursor-pointer"
                style={{ fontSize: "11px" }}
              >
                <Zap size={12} /> Auto-fix {mismatchCount} orientation mismatch{mismatchCount !== 1 ? "es" : ""}
              </button>
            )}

            {/* Problem images only */}
            {scanResults
              .filter((r) => r.status !== "ok" && r.status !== "checking" && r.status !== "pending")
              .map((r, i) => (
                <div
                  key={`${r.fiberId}-${r.index}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    r.status === "broken"
                      ? "bg-red-400/[0.03] border-red-400/10"
                      : "bg-blue-400/[0.03] border-blue-400/10"
                  }`}
                >
                  {r.status === "broken" ? (
                    <XCircle size={12} className="text-red-400/60 shrink-0" />
                  ) : (
                    <AlertTriangle size={12} className="text-blue-400/60 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-white/60 block" style={{ fontSize: "11px" }}>
                      {r.fiberName}
                      <span className="text-white/25 ml-1">#{r.index + 1}</span>
                    </span>
                    <span className="text-white/25 block truncate" style={{ fontSize: "9px", fontFamily: "monospace" }}>
                      {r.url || "(empty URL)"}
                    </span>
                    {r.loadTimeMs !== undefined && (
                      <span className="text-white/20" style={{ fontSize: "9px" }}>
                        {r.loadTimeMs}ms
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleEditFiber(r.fiberId)}
                    className="text-white/20 hover:text-white/60 cursor-pointer shrink-0"
                  >
                    <Pencil size={10} />
                  </button>
                </div>
              ))}

            {/* Orientation mismatches */}
            {scanResults
              .filter((r) => r.orientationMismatch)
              .map((r) => (
                <div
                  key={`mismatch-${r.fiberId}-${r.index}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-purple-400/[0.03] border-purple-400/10"
                >
                  <RefreshCw size={12} className="text-purple-400/50 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-white/60 block" style={{ fontSize: "11px" }}>
                      {r.fiberName}
                      <span className="text-white/25 ml-1">#{r.index + 1}</span>
                    </span>
                    <span className="text-white/25 block" style={{ fontSize: "9px" }}>
                      Set: {r.currentOrientation} · Detected: {r.detectedOrientation}
                      {r.naturalWidth && ` · ${r.naturalWidth}×${r.naturalHeight}`}
                    </span>
                  </div>
                  <button
                    onClick={() => handleEditFiber(r.fiberId)}
                    className="text-white/20 hover:text-white/60 cursor-pointer shrink-0"
                  >
                    <Pencil size={10} />
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* ── Duplicates tab ── */}
        {tab === "duplicates" && (
          <div className="p-4 space-y-3">
            {duplicates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 size={24} className="text-emerald-400/20 mb-2" />
                <span className="text-white/30" style={{ fontSize: "12px" }}>
                  No duplicate images found
                </span>
              </div>
            ) : (
              <>
                <span className="text-white/30" style={{ fontSize: "10px" }}>
                  {duplicates.length} image{duplicates.length !== 1 ? "s" : ""} shared across multiple fibers
                </span>
                {duplicates.map((dup, i) => (
                  <div key={i} className="rounded-lg border border-blue-400/10 bg-blue-400/[0.02] overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <CopyIcon size={10} className="text-blue-400/40 shrink-0" />
                      <span className="text-white/50 truncate flex-1" style={{ fontSize: "10px", fontFamily: "monospace" }}>
                        {dup.url.slice(-60)}
                      </span>
                      <span className="text-blue-400/40" style={{ fontSize: "9px" }}>
                        {dup.fibers.length}× used
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 pb-2">
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-white/[0.04] shrink-0">
                        <img src={dup.url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {dup.fibers.map((f) => (
                          <button
                            key={`${f.fiberId}-${f.index}`}
                            onClick={() => handleEditFiber(f.fiberId)}
                            className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 cursor-pointer"
                            style={{ fontSize: "9px" }}
                          >
                            {f.fiberName} #{f.index + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── URL Patterns tab ── */}
        {tab === "patterns" && (
          <div className="p-4 space-y-3">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
              <span className="text-white/40 uppercase tracking-wider block" style={{ fontSize: "10px", fontWeight: 600 }}>
                URL Distribution
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-white/50" style={{ fontSize: "11px" }}>
                    <Globe size={10} className="text-blue-400/40" /> Total images
                  </span>
                  <span className="text-white/60" style={{ fontSize: "11px" }}>{urlStats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-white/50" style={{ fontSize: "11px" }}>
                    <ImageIcon size={10} className="text-emerald-400/40" /> Cloudinary URLs
                  </span>
                  <span className="text-emerald-400/50" style={{ fontSize: "11px" }}>{urlStats.cloudinary}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-white/50" style={{ fontSize: "11px" }}>
                    <Layers size={10} className="text-blue-400/40" /> Other URLs
                  </span>
                  <span className="text-blue-400/50" style={{ fontSize: "11px" }}>{urlStats.other}</span>
                </div>
                {urlStats.missing > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-white/50" style={{ fontSize: "11px" }}>
                      <XCircle size={10} className="text-red-400/40" /> Missing URLs
                    </span>
                    <span className="text-red-400/50" style={{ fontSize: "11px" }}>{urlStats.missing}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-white/50" style={{ fontSize: "11px" }}>
                    <RefreshCw size={10} className="text-purple-400/40" /> No orientation set
                  </span>
                  <span className="text-purple-400/50" style={{ fontSize: "11px" }}>{urlStats.noOrientation}</span>
                </div>
              </div>
            </div>

            {/* Cloudinary coverage bar */}
            {urlStats.total > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white/30" style={{ fontSize: "10px" }}>Cloudinary coverage</span>
                  <span className="text-white/40" style={{ fontSize: "10px" }}>
                    {Math.round((urlStats.cloudinary / urlStats.total) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(urlStats.cloudinary / urlStats.total) * 100}%`,
                      backgroundColor: "rgba(52,211,153,0.5)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Orientation coverage */}
            {urlStats.total > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white/30" style={{ fontSize: "10px" }}>Orientation metadata</span>
                  <span className="text-white/40" style={{ fontSize: "10px" }}>
                    {Math.round(((urlStats.total - urlStats.noOrientation) / urlStats.total) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${((urlStats.total - urlStats.noOrientation) / urlStats.total) * 100}%`,
                      backgroundColor: "rgba(168,85,247,0.5)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
