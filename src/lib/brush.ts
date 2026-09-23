import type { Brush, Point } from "../types";

// ---------------------------------------------------------------------------
// Deterministic PRNG — textured brushes need stable "random" grain: the same
// stroke must render identically on every repaint (we redraw the whole scene
// on every interaction), or the texture would visibly shimmer.
// ---------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Path helpers: turn any element's geometry into a plain point list, then
// resample it at a fixed spacing so grain density stays independent of how
// many raw points a freehand stroke happens to have.
// ---------------------------------------------------------------------------

export function rectPolygon(x: number, y: number, w: number, h: number): Point[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
    { x, y },
  ];
}

export function ellipsePolygon(cx: number, cy: number, rx: number, ry: number, segments = 72): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return pts;
}

/** Resample a polyline to roughly-even spacing (world units) along its length. */
export function resamplePath(points: Point[], spacing: number): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [points[0]];
  const out: Point[] = [points[0]];
  let carry = spacing;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (segLen === 0) continue;
    let dist = carry;
    while (dist < segLen) {
      const t = dist / segLen;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      dist += spacing;
    }
    carry = dist - segLen;
  }
  out.push(points[points.length - 1]);
  return out;
}

// ---------------------------------------------------------------------------
// Textured brushes (pencil / crayon): a scatter of small, semi-transparent
// "grain" dabs around the path, plus a faint core line for pencil so the
// stroke stays legible. Pure data so canvas + SVG export render identically.
// ---------------------------------------------------------------------------

export interface Dab {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

export interface TexturedStroke {
  core: Point[] | null; // faint center line, pencil only
  coreWidth: number;
  coreAlpha: number;
  dabs: Dab[];
}

export function computeTexturedStroke(rawPoints: Point[], strokeWidth: number, brush: "pencil" | "crayon", seed: number): TexturedStroke {
  const rand = mulberry32(seed);
  const isCrayon = brush === "crayon";
  const spacing = Math.max(strokeWidth * 0.3, 1.6);
  const path = resamplePath(rawPoints, spacing);

  const baseR = Math.max(strokeWidth * (isCrayon ? 0.5 : 0.32), 0.6);
  const jitter = strokeWidth * (isCrayon ? 0.6 : 0.38);
  const dabsPerPoint = isCrayon ? 3 : 2;
  const baseAlpha = isCrayon ? 0.5 : 0.42;

  const dabs: Dab[] = [];
  for (const p of path) {
    for (let i = 0; i < dabsPerPoint; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * jitter;
      dabs.push({
        x: p.x + Math.cos(angle) * dist,
        y: p.y + Math.sin(angle) * dist,
        r: baseR * (0.5 + rand() * 0.9),
        alpha: baseAlpha * (0.35 + rand() * 0.85),
      });
    }
  }

  return {
    core: isCrayon ? null : rawPoints,
    coreWidth: Math.max(strokeWidth * 0.5, 0.5),
    coreAlpha: 0.55,
    dabs,
  };
}

// ---------------------------------------------------------------------------
// Smooth brushes (pen / marker / highlighter): same stroked-path rendering,
// just different width/opacity/blend/cap so each reads as a different tool.
// ---------------------------------------------------------------------------

export interface SmoothBrushParams {
  widthScale: number;
  opacityScale: number;
  maxOpacity: number;
  multiply: boolean;
  cap: CanvasLineCap;
  join: CanvasLineJoin;
}

export function getSmoothBrushParams(brush: Brush | undefined): SmoothBrushParams {
  switch (brush) {
    case "marker":
      return { widthScale: 1.35, opacityScale: 1, maxOpacity: 1, multiply: true, cap: "round", join: "round" };
    case "highlighter":
      return { widthScale: 2.6, opacityScale: 0.45, maxOpacity: 0.5, multiply: true, cap: "butt", join: "bevel" };
    default:
      return { widthScale: 1, opacityScale: 1, maxOpacity: 1, multiply: false, cap: "round", join: "round" };
  }
}

export function isTexturedBrush(brush: Brush | undefined): brush is "pencil" | "crayon" {
  return brush === "pencil" || brush === "crayon";
}
