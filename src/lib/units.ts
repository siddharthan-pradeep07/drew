import type { Unit } from "../types";

// Reference pixel used throughout: 96px = 1in (the standard CSS/screen pixel).
const PX_PER_IN = 96;
const PX_PER_MM = PX_PER_IN / 25.4;

/** Convert a value in the given unit to whole screen pixels. */
export function toPixels(value: number, unit: Unit): number {
  if (!value || value <= 0) return 0;
  switch (unit) {
    case "mm":
      return Math.round(value * PX_PER_MM);
    case "in":
      return Math.round(value * PX_PER_IN);
    default:
      return Math.round(value);
  }
}

/** Clamp a page dimension to something the browser can happily paint. */
export function clampPageSize(px: number): number {
  return Math.min(Math.max(px, 32), 6000);
}
