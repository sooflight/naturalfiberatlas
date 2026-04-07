import type { SVGProps } from "react";

/** When changing geometry, update `public/favicon.svg` to match. */

const VB = 24;
const CX = VB / 2;
const CY = VB / 2;
/** Distance from logo center to each cluster meeting point */
const RING_R = 6.45;
/** Offset from cluster origin along each lobe axis */
const LOBE_HALF = 2.0;
/** Ellipse major/minor (elongated teardrop-like lobes) */
const RX = 2.35;
const RY = 0.92;

function rotateVec(vx: number, vy: number, deg: number) {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: c * vx - s * vy, y: s * vx + c * vy };
}

/**
 * Five-fold trilobe mark (Natural Fiber Atlas): each cluster has three rounded lobes
 * at 120°, with one lobe aligned radially toward the center void.
 */
export function NfaMark(props: SVGProps<SVGSVGElement>) {
  const ellipses: { cx: number; cy: number; angle: number; key: string }[] = [];

  for (let k = 0; k < 5; k++) {
    const alpha = Math.PI / 2 + (k * 2 * Math.PI) / 5;
    const px = CX + RING_R * Math.cos(alpha);
    const py = CY + RING_R * Math.sin(alpha);
    const inwardX = -Math.cos(alpha);
    const inwardY = -Math.sin(alpha);
    const d0 = { x: inwardX, y: inwardY };
    const d1 = rotateVec(inwardX, inwardY, 120);
    const d2 = rotateVec(inwardX, inwardY, 240);

    for (const [i, d] of [d0, d1, d2].entries()) {
      const ecx = px + d.x * LOBE_HALF;
      const ecy = py + d.y * LOBE_HALF;
      const angle = (Math.atan2(d.y, d.x) * 180) / Math.PI;
      ellipses.push({ cx: ecx, cy: ecy, angle, key: `${k}-${i}` });
    }
  }

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      {ellipses.map(({ cx, cy, angle, key }) => (
        <ellipse key={key} cx={cx} cy={cy} rx={RX} ry={RY} transform={`rotate(${angle}, ${cx}, ${cy})`} />
      ))}
    </svg>
  );
}
