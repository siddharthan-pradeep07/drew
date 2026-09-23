import type { Bounds, Camera, DrewElement, Point, ResizeHandle, StrokeStyle } from "../types";
import { getHandlePositions, screenToWorld } from "./geometry";
import { computeTexturedStroke, ellipsePolygon, getSmoothBrushParams, isTexturedBrush, rectPolygon } from "./brush";

// ---------------------------------------------------------------------------
// Image cache (data-URL keyed) so <img> loads happen once per source.
// ---------------------------------------------------------------------------

interface ImageCacheEntry {
  img: HTMLImageElement;
  loaded: boolean;
  listeners: Set<() => void>;
}

const imageCache = new Map<string, ImageCacheEntry>();

export function getCachedImage(src: string, onReady: () => void): HTMLImageElement | null {
  let entry = imageCache.get(src);
  if (!entry) {
    const img = new Image();
    entry = { img, loaded: false, listeners: new Set() };
    imageCache.set(src, entry);
    img.onload = () => {
      entry!.loaded = true;
      entry!.listeners.forEach((fn) => fn());
      entry!.listeners.clear();
    };
    img.src = src;
  }
  if (entry.loaded) return entry.img;
  entry.listeners.add(onReady);
  return null;
}

// ---------------------------------------------------------------------------
// Paint helpers
// ---------------------------------------------------------------------------

export function dashArrayFor(style: StrokeStyle, strokeWidth: number): number[] {
  switch (style) {
    case "dashed":
      return [strokeWidth * 3, strokeWidth * 2];
    case "dotted":
      return [1, strokeWidth * 2.2];
    default:
      return [];
  }
}

/** Configure the context for a "smooth" brush stroke (pen / marker / highlighter) and
 *  return the effective line width, so callers can reuse it for e.g. arrowhead sizing. */
function applySmoothStrokePaint(ctx: CanvasRenderingContext2D, el: DrewElement): number {
  const params = getSmoothBrushParams(el.brush);
  const width = el.strokeWidth * params.widthScale;
  ctx.globalCompositeOperation = params.multiply ? "multiply" : "source-over";
  ctx.globalAlpha = Math.min(el.opacity * params.opacityScale, params.maxOpacity);
  ctx.strokeStyle = el.strokeColor;
  ctx.fillStyle = el.strokeColor;
  ctx.lineWidth = width;
  ctx.lineCap = params.cap;
  ctx.lineJoin = params.join;
  ctx.setLineDash(dashArrayFor(el.strokeStyle, width));
  return width;
}

/** Draw a textured (pencil/crayon) stroke along a raw point path. Pure grain data comes
 *  from lib/brush so canvas + SVG export stay visually identical. */
function paintTexturedStroke(ctx: CanvasRenderingContext2D, rawPoints: Point[], el: DrewElement) {
  if (!isTexturedBrush(el.brush) || rawPoints.length === 0) return;
  const stroke = computeTexturedStroke(rawPoints, el.strokeWidth, el.brush, el.seed);

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.setLineDash([]);

  if (stroke.core) {
    ctx.globalAlpha = el.opacity * stroke.coreAlpha;
    ctx.strokeStyle = el.strokeColor;
    ctx.lineWidth = stroke.coreWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    tracePolyline(ctx, stroke.core);
    ctx.stroke();
  }

  ctx.fillStyle = el.strokeColor;
  for (const dab of stroke.dabs) {
    ctx.globalAlpha = el.opacity * dab.alpha;
    ctx.beginPath();
    ctx.arc(dab.x, dab.y, dab.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function tracePolyline(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length === 0) return;
  if (points.length === 1) {
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[0].x, points[0].y);
    return;
  }
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const mid = midpoint(points[i], points[i + 1]);
    ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
}

function drawArrowhead(ctx: CanvasRenderingContext2D, from: Point, to: Point, strokeWidth: number, color: string, opacity: number) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const len = Math.min(Math.max(strokeWidth * 3.2, 10), 26);
  const spread = Math.PI / 7;
  const base1 = { x: to.x - len * Math.cos(angle - spread), y: to.y - len * Math.sin(angle - spread) };
  const base2 = { x: to.x - len * Math.cos(angle + spread), y: to.y - len * Math.sin(angle + spread) };
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(base1.x, base1.y);
  ctx.lineTo(base2.x, base2.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  if (radius <= 0 || typeof ctx.roundRect !== "function") {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.roundRect(x, y, w, h, radius);
}

/** Draw a single element into world-space (caller must have applied the camera transform). */
export function drawElement(ctx: CanvasRenderingContext2D, el: DrewElement, requestRender: () => void) {
  const textured = isTexturedBrush(el.brush);

  switch (el.type) {
    case "freehand": {
      if (textured) {
        paintTexturedStroke(ctx, el.points, el);
      } else {
        applySmoothStrokePaint(ctx, el);
        ctx.beginPath();
        tracePolyline(ctx, el.points);
        ctx.stroke();
      }
      break;
    }
    case "line": {
      if (textured) {
        paintTexturedStroke(ctx, el.points, el);
      } else {
        applySmoothStrokePaint(ctx, el);
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        ctx.lineTo(el.points[1].x, el.points[1].y);
        ctx.stroke();
      }
      break;
    }
    case "arrow": {
      let headWidth = el.strokeWidth;
      if (textured) {
        paintTexturedStroke(ctx, el.points, el);
      } else {
        headWidth = applySmoothStrokePaint(ctx, el);
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        ctx.lineTo(el.points[1].x, el.points[1].y);
        ctx.stroke();
      }
      drawArrowhead(ctx, el.points[0], el.points[1], headWidth, el.strokeColor, el.opacity);
      break;
    }
    case "rectangle": {
      if (el.fill !== "transparent") {
        ctx.save();
        ctx.globalAlpha = el.opacity;
        ctx.globalCompositeOperation = "source-over";
        ctx.beginPath();
        roundRectPath(ctx, el.x, el.y, el.width, el.height, el.cornerRadius);
        ctx.fillStyle = el.fill;
        ctx.fill();
        ctx.restore();
      }
      if (el.strokeWidth > 0) {
        if (textured) {
          paintTexturedStroke(ctx, rectPolygon(el.x, el.y, el.width, el.height), el);
        } else {
          applySmoothStrokePaint(ctx, el);
          ctx.beginPath();
          roundRectPath(ctx, el.x, el.y, el.width, el.height, el.cornerRadius);
          ctx.stroke();
        }
      }
      break;
    }
    case "ellipse": {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rx = Math.max(el.width / 2, 0.01);
      const ry = Math.max(el.height / 2, 0.01);
      if (el.fill !== "transparent") {
        ctx.save();
        ctx.globalAlpha = el.opacity;
        ctx.globalCompositeOperation = "source-over";
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = el.fill;
        ctx.fill();
        ctx.restore();
      }
      if (el.strokeWidth > 0) {
        if (textured) {
          paintTexturedStroke(ctx, ellipsePolygon(cx, cy, rx, ry), el);
        } else {
          applySmoothStrokePaint(ctx, el);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      break;
    }
    case "text": {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = el.opacity;
      ctx.setLineDash([]);
      ctx.fillStyle = el.strokeColor;
      ctx.font = `${el.fontSize}px ${el.fontFamily === "mono" ? "ui-monospace, Consolas, monospace" : "system-ui, sans-serif"}`;
      ctx.textBaseline = "top";
      ctx.textAlign = el.align;
      const lines = el.text.length ? el.text.split("\n") : [""];
      const lineHeight = el.fontSize * 1.3;
      const anchorX = el.align === "left" ? el.x : el.align === "right" ? el.x + el.width : el.x + el.width / 2;
      lines.forEach((line, i) => ctx.fillText(line, anchorX, el.y + i * lineHeight));
      ctx.restore();
      break;
    }
    case "image": {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      const img = getCachedImage(el.src, requestRender);
      if (img) {
        ctx.drawImage(img, el.x, el.y, el.width, el.height);
        if (el.strokeWidth > 0) {
          ctx.strokeStyle = el.strokeColor;
          ctx.lineWidth = el.strokeWidth;
          ctx.setLineDash(dashArrayFor(el.strokeStyle, el.strokeWidth));
          ctx.strokeRect(el.x, el.y, el.width, el.height);
        }
      } else {
        ctx.strokeStyle = "#999999";
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(el.x, el.y, el.width, el.height);
      }
      ctx.restore();
      break;
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

// ---------------------------------------------------------------------------
// Board chrome: grid, page frame, selection UI
// ---------------------------------------------------------------------------

export function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera, viewportW: number, viewportH: number, color: string) {
  const gridSize = 24;
  const screenSpacing = gridSize * camera.zoom;
  if (screenSpacing < 8) return;
  const topLeft = screenToWorld({ x: 0, y: 0 }, camera);
  const bottomRight = screenToWorld({ x: viewportW, y: viewportH }, camera);
  const startX = Math.floor(topLeft.x / gridSize) * gridSize;
  const startY = Math.floor(topLeft.y / gridSize) * gridSize;
  const r = 1 / camera.zoom;
  ctx.fillStyle = color;
  for (let x = startX; x <= bottomRight.x; x += gridSize) {
    for (let y = startY; y <= bottomRight.y; y += gridSize) {
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
}

export function drawPageFrame(ctx: CanvasRenderingContext2D, width: number, height: number, background: string) {
  // No border stroke — the page reads against the board purely by the contrast between
  // the two background colors (white page on grey board, or whatever the user picked).
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
}

export function drawMarquee(ctx: CanvasRenderingContext2D, b: Bounds, zoom: number, strokeColor: string, fillColor: string) {
  ctx.save();
  ctx.setLineDash([4 / zoom, 3 / zoom]);
  ctx.lineWidth = 1 / zoom;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.fillRect(b.x, b.y, b.width, b.height);
  ctx.strokeRect(b.x, b.y, b.width, b.height);
  ctx.restore();
}

export const HANDLE_SCREEN_SIZE = 8;

export function drawSelectionOutline(ctx: CanvasRenderingContext2D, b: Bounds, zoom: number, color: string, showHandles: boolean) {
  ctx.save();
  ctx.setLineDash([]);
  ctx.lineWidth = 1.5 / zoom;
  ctx.strokeStyle = color;
  ctx.strokeRect(b.x, b.y, b.width, b.height);

  if (showHandles) {
    const size = HANDLE_SCREEN_SIZE / zoom;
    ctx.fillStyle = "#ffffff";
    for (const { point } of getHandlePositions(b)) {
      ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
      ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
    }
  }
  ctx.restore();
}

export function hitHandle(b: Bounds, worldPoint: Point, zoom: number): ResizeHandle | null {
  const tol = (HANDLE_SCREEN_SIZE / 2 + 3) / zoom;
  for (const { handle, point } of getHandlePositions(b)) {
    if (Math.abs(worldPoint.x - point.x) <= tol && Math.abs(worldPoint.y - point.y) <= tol) {
      return handle;
    }
  }
  return null;
}
