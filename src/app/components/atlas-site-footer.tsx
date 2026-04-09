/**
 * atlas-site-footer.tsx — Site footer after the grid: panel height ≈ 1.32× one profile card (3:4 cell).
 * GridView uses a flex spacer above the footer so short pages still pin the footer to the viewport bottom
 * without shrinking the grid’s <main> (which would paint cards under this panel).
 */

import { ATLAS_GRID_5COL_MAX_WIDTH_CLASS } from "../hooks/use-column-count";
import { NfaMark } from "./nfa-mark";
import {
  ATLAS_GRID_SUBHEAD_MUTED_STYLE,
  NAV_FONT_STYLE,
  NAV_FONT_STYLE_MOBILE,
} from "./atlas-shared";

/** Single grid cell height (3:4) — exported for layout math elsewhere. */
export function atlasOneGridCardHeightCss(cols: number, columnGap: string): string {
  if (cols < 1) return "min(40vw, 280px)";
  return `calc((100% - (${cols} - 1) * ${columnGap}) / ${cols} * 4 / 3)`;
}

/** Footer panel is taller than one card so content + padding can breathe. */
function atlasSiteFooterHeightCss(cols: number, columnGap: string): string {
  if (cols < 1) return "calc(min(40vw, 280px) * 1.32)";
  return `calc((100% - (${cols} - 1) * ${columnGap}) / ${cols} * 4 / 3 * 1.32)`;
}

export interface AtlasSiteFooterProps {
  cols: number;
  /** Must match the atlas grid column gap (e.g. 0.75rem or 0.875rem on mobile). */
  columnGap: string;
  className?: string;
}

export function AtlasSiteFooter({ cols, columnGap, className }: AtlasSiteFooterProps) {
  const compact = cols <= 2;
  const heightExpr = atlasSiteFooterHeightCss(cols, columnGap);
  const navStyle = compact ? NAV_FONT_STYLE_MOBILE : NAV_FONT_STYLE;

  return (
    <footer
      data-testid="atlas-site-footer"
      className={className ? `w-full shrink-0 ${className}` : "w-full shrink-0"}
    >
      <div
        className={`mx-auto w-full ${cols === 5 ? ATLAS_GRID_5COL_MAX_WIDTH_CLASS : ""}`}
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className="w-full"
          style={{
            height: heightExpr,
          }}
        >
          <div
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0a0a]/85 backdrop-blur-md"
            style={{
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <div
              className={`grid min-h-0 flex-1 gap-5 overflow-y-auto overscroll-y-contain px-5 py-5 sm:gap-6 sm:px-8 sm:py-7 ${
                compact
                  ? "grid-cols-1"
                  : "sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1.55fr)]"
              }`}
            >
              {/* Brand — vertically centered; © lives in right column */}
              <div className="flex h-full min-h-0 flex-col justify-center py-1">
                <div className="grid w-full max-w-full grid-cols-[auto_minmax(0,1fr)] gap-x-4">
                  <NfaMark
                    className={`col-start-1 row-start-1 shrink-0 self-center text-[#e8e0d0] ${compact ? "h-24 w-24" : "h-[6.25rem] w-[6.25rem] sm:h-[6.5rem] sm:w-[6.5rem]"}`}
                    aria-hidden
                  />
                  <div className="col-start-2 min-w-0 self-center">
                    <p
                      className="text-[#e8e0d0] leading-tight"
                      style={{
                        ...navStyle,
                        ...ATLAS_GRID_SUBHEAD_MUTED_STYLE,
                        fontSize: compact ? "clamp(12px, 3.2cqi, 14px)" : "clamp(13px, 1.15vw, 15px)",
                        fontWeight: 500,
                        letterSpacing: compact ? "0.14em" : "0.18em",
                      }}
                    >
                      Natural Fiber Atlas
                    </p>
                    <p className="mt-1.5 text-white/25" style={{ fontSize: "11px", letterSpacing: "0.1em" }}>
                      Material Culture Reference
                    </p>
                  </div>
                </div>
              </div>

              {/* Description + copyright at column bottom */}
              <div className="flex h-full min-h-0 flex-col justify-between gap-4 border-white/[0.06] py-1 sm:border-l sm:pl-6">
                <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto">
                  <p
                    className="text-white/60"
                    style={{
                      fontSize: compact ? "12px" : "clamp(14px, 1vw, 16px)",
                      lineHeight: 1.6,
                    }}
                  >
                    A public image & knowledge resource studying material cultures of the earth. It covers profiles on natural plant fibers, animal fibers, rayons, textile techniques, and natural dye. Built as an offering for designers, textile professionals, students, educators, and researchers seeking an artful learning experience.
                    <br /><br />
                    Designed, developed and researched by <a href="https://sooflight.studio" target="_blank" rel="noopener noreferrer" className="text-white/90 transition-colors hover:text-white/30">sooflight.studio</a>
                  </p>
                </div>
                <p className="shrink-0 text-white/25" style={{ fontSize: "11px", lineHeight: 1.55 }}>
                  © {new Date().getFullYear()} Natural Fiber Atlas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
