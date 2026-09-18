import type { DrawStyle, Point, StrokeStyle, Tool } from "../types";

/** Resize a canvas to a logical (CSS-pixel) size, scaled for device pixel ratio, and
 *  return a context whose coordinate space matches the logical size 1:1. */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(logicalWidth * dpr));
  canvas.height = Math.max(1, Math.round(logicalHeight * dpr));
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** Translate a pointer event's client coordinates into the canvas's logical
 *  (un-zoomed, un-scaled) drawing coordinate space. */
export function getLogicalPoint(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
  clientX: number,
  clientY: number,
): Point {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * logicalWidth;
  const y = ((clientY - rect.top) / rect.height) * logicalHeight;
  return { x, y };
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

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

/** Apply color/width/dash/opacity for a freehand or shape stroke. Eraser always
 *  paints solid, since it is really "the page colour" rather than a style choice. */
export function applyStrokeStyle(
  ctx: CanvasRenderingContext2D,
  tool: Tool,
  style: DrawStyle,
  pageBackground: string,
) {
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = style.strokeWidth;
  ctx.globalAlpha = tool === "eraser" ? 1 : style.opacity;
  ctx.strokeStyle = tool === "eraser" ? pageBackground : style.color;
  ctx.fillStyle = tool === "eraser" ? pageBackground : style.color;
  ctx.setLineDash(tool === "eraser" ? [] : dashArrayFor(style.strokeStyle, style.strokeWidth));
}

/** Given a drag start/end, apply shift-to-constrain behaviour for each shape tool. */
export function constrainShapePoint(tool: Tool, start: Point, current: Point, shiftKey: boolean): Point {
  if (!shiftKey) return current;

  if (tool === "line") {
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return current;
    const angle = Math.atan2(dy, dx);
    const step = Math.PI / 4;
    const snapped = Math.round(angle / step) * step;
    return { x: start.x + Math.cos(snapped) * dist, y: start.y + Math.sin(snapped) * dist };
  }

  if (tool === "rectangle" || tool === "ellipse") {
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    return {
      x: start.x + Math.sign(dx || 1) * side,
      y: start.y + Math.sign(dy || 1) * side,
    };
  }

  return current;
}

/** Draw a shape (line/rectangle/ellipse) from start to end onto the given context. */
export function drawShape(ctx: CanvasRenderingContext2D, tool: Tool, start: Point, end: Point) {
  ctx.beginPath();
  if (tool === "line") {
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
  } else if (tool === "rectangle") {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    ctx.rect(x, y, w, h);
  } else if (tool === "ellipse") {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;
    ctx.ellipse(cx, cy, Math.max(rx, 0.01), Math.max(ry, 0.01), 0, 0, Math.PI * 2);
  }
  ctx.stroke();
}
