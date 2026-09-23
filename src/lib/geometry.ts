import type { Bounds, Camera, DrewElement, Point, ResizeHandle } from "../types";

export function worldToScreen(p: Point, camera: Camera): Point {
  return { x: p.x * camera.zoom + camera.offsetX, y: p.y * camera.zoom + camera.offsetY };
}

export function screenToWorld(p: Point, camera: Camera): Point {
  return { x: (p.x - camera.offsetX) / camera.zoom, y: (p.y - camera.offsetY) / camera.zoom };
}

export function normalizeBox(x0: number, y0: number, x1: number, y1: number): Bounds {
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0) };
}

export function getElementBounds(el: DrewElement): Bounds {
  if (el.type === "freehand") {
    if (el.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of el.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  if (el.type === "line" || el.type === "arrow") {
    return normalizeBox(el.points[0].x, el.points[0].y, el.points[1].x, el.points[1].y);
  }
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

export function unionBounds(list: Bounds[]): Bounds {
  if (list.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of list) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function pointInBounds(p: Point, b: Bounds, pad = 0): boolean {
  return p.x >= b.x - pad && p.x <= b.x + b.width + pad && p.y >= b.y - pad && p.y <= b.y + b.height + pad;
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Translate an element by a world-space delta. */
export function translateElement(el: DrewElement, dx: number, dy: number): DrewElement {
  if (el.type === "freehand") {
    return { ...el, points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
  }
  if (el.type === "line" || el.type === "arrow") {
    return { ...el, points: [{ x: el.points[0].x + dx, y: el.points[0].y + dy }, { x: el.points[1].x + dx, y: el.points[1].y + dy }] };
  }
  return { ...el, x: el.x + dx, y: el.y + dy };
}

/** Rebuild an element's geometry to fit `newBounds`, scaling from `originalBounds`. Always
 *  derived from the untouched original element so repeated drags never drift/compound. */
export function resizeElementTo(original: DrewElement, originalBounds: Bounds, newBounds: Bounds): DrewElement {
  const scaleX = originalBounds.width === 0 ? 1 : newBounds.width / originalBounds.width;
  const scaleY = originalBounds.height === 0 ? 1 : newBounds.height / originalBounds.height;

  if (original.type === "freehand") {
    return {
      ...original,
      points: original.points.map((p) => ({
        x: newBounds.x + (p.x - originalBounds.x) * scaleX,
        y: newBounds.y + (p.y - originalBounds.y) * scaleY,
      })),
    };
  }
  if (original.type === "line" || original.type === "arrow") {
    const [a, b] = original.points;
    return {
      ...original,
      points: [
        { x: newBounds.x + (a.x - originalBounds.x) * scaleX, y: newBounds.y + (a.y - originalBounds.y) * scaleY },
        { x: newBounds.x + (b.x - originalBounds.x) * scaleX, y: newBounds.y + (b.y - originalBounds.y) * scaleY },
      ],
    };
  }
  return { ...original, x: newBounds.x, y: newBounds.y, width: newBounds.width, height: newBounds.height };
}

const MIN_SIZE = 4;

/** Given a fixed original bounds and which handle is being dragged, compute the new bounds
 *  for the current world pointer position. */
export function computeResizedBounds(
  original: Bounds,
  handle: ResizeHandle,
  worldPoint: Point,
  keepAspect: boolean,
): Bounds {
  let x = original.x;
  let y = original.y;
  let width = original.width;
  let height = original.height;

  const right = original.x + original.width;
  const bottom = original.y + original.height;

  const affectsLeft = handle === "nw" || handle === "w" || handle === "sw";
  const affectsRight = handle === "ne" || handle === "e" || handle === "se";
  const affectsTop = handle === "nw" || handle === "n" || handle === "ne";
  const affectsBottom = handle === "sw" || handle === "s" || handle === "se";

  if (affectsLeft) {
    width = Math.max(MIN_SIZE, right - worldPoint.x);
    x = right - width;
  } else if (affectsRight) {
    width = Math.max(MIN_SIZE, worldPoint.x - original.x);
    x = original.x;
  }

  if (affectsTop) {
    height = Math.max(MIN_SIZE, bottom - worldPoint.y);
    y = bottom - height;
  } else if (affectsBottom) {
    height = Math.max(MIN_SIZE, worldPoint.y - original.y);
    y = original.y;
  }

  const isCorner = affectsLeft !== affectsRight && affectsTop !== affectsBottom;
  if (keepAspect && isCorner && original.width > 0 && original.height > 0) {
    const scale = Math.max(width / original.width, height / original.height);
    width = original.width * scale;
    height = original.height * scale;
    x = affectsLeft ? right - width : original.x;
    y = affectsTop ? bottom - height : original.y;
  }

  return { x, y, width, height };
}

export function getHandlePositions(b: Bounds): { handle: ResizeHandle; point: Point }[] {
  const midX = b.x + b.width / 2;
  const midY = b.y + b.height / 2;
  return [
    { handle: "nw", point: { x: b.x, y: b.y } },
    { handle: "n", point: { x: midX, y: b.y } },
    { handle: "ne", point: { x: b.x + b.width, y: b.y } },
    { handle: "e", point: { x: b.x + b.width, y: midY } },
    { handle: "se", point: { x: b.x + b.width, y: b.y + b.height } },
    { handle: "s", point: { x: midX, y: b.y + b.height } },
    { handle: "sw", point: { x: b.x, y: b.y + b.height } },
    { handle: "w", point: { x: b.x, y: midY } },
  ];
}

export const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

function ellipseHitValue(el: { x: number; y: number; width: number; height: number }, p: Point): number {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rx = Math.max(el.width / 2, 0.01);
  const ry = Math.max(el.height / 2, 0.01);
  return ((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2;
}

/** Does a click at `p` (world space) land on this element? `tolerance` is world units. */
export function hitTestElement(el: DrewElement, p: Point, tolerance: number): boolean {
  const strokeTol = Math.max(el.strokeWidth / 2, tolerance);

  if (el.type === "freehand") {
    for (let i = 0; i < el.points.length - 1; i++) {
      if (distanceToSegment(p, el.points[i], el.points[i + 1]) <= strokeTol) return true;
    }
    return el.points.length === 1 && Math.hypot(p.x - el.points[0].x, p.y - el.points[0].y) <= strokeTol;
  }
  if (el.type === "line" || el.type === "arrow") {
    return distanceToSegment(p, el.points[0], el.points[1]) <= strokeTol;
  }
  if (el.type === "text" || el.type === "image") {
    return pointInBounds(p, { x: el.x, y: el.y, width: el.width, height: el.height }, tolerance);
  }
  if (el.type === "rectangle") {
    const b = { x: el.x, y: el.y, width: el.width, height: el.height };
    if (el.fill !== "transparent") return pointInBounds(p, b);
    if (!pointInBounds(p, b, strokeTol)) return false;
    const nearLeft = Math.abs(p.x - el.x) <= strokeTol && p.y >= el.y - strokeTol && p.y <= el.y + el.height + strokeTol;
    const nearRight = Math.abs(p.x - (el.x + el.width)) <= strokeTol && p.y >= el.y - strokeTol && p.y <= el.y + el.height + strokeTol;
    const nearTop = Math.abs(p.y - el.y) <= strokeTol && p.x >= el.x - strokeTol && p.x <= el.x + el.width + strokeTol;
    const nearBottom = Math.abs(p.y - (el.y + el.height)) <= strokeTol && p.x >= el.x - strokeTol && p.x <= el.x + el.width + strokeTol;
    return nearLeft || nearRight || nearTop || nearBottom;
  }
  if (el.type === "ellipse") {
    const v = ellipseHitValue(el, p);
    if (el.fill !== "transparent") return v <= 1;
    const minR = Math.max(Math.min(el.width, el.height) / 2, 0.01);
    const approxDist = Math.abs(Math.sqrt(v) - 1) * minR;
    return approxDist <= strokeTol;
  }
  return false;
}

export function snapValue(value: number, grid: number): number {
  return grid > 0 ? Math.round(value / grid) * grid : value;
}

/** Shift-to-constrain while dragging out a new line/arrow (45deg) or box shape (square). */
export function constrainDragPoint(
  kind: "line" | "box",
  start: Point,
  current: Point,
  shiftKey: boolean,
): Point {
  if (!shiftKey) return current;

  if (kind === "line") {
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return current;
    const step = Math.PI / 4;
    const snapped = Math.round(Math.atan2(dy, dx) / step) * step;
    return { x: start.x + Math.cos(snapped) * dist, y: start.y + Math.sin(snapped) * dist };
  }

  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const side = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: start.x + Math.sign(dx || 1) * side, y: start.y + Math.sign(dy || 1) * side };
}
