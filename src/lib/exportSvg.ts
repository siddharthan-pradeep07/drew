import type { DrewElement, Point } from "../types";
import { dashArrayFor } from "./render";
import { computeTexturedStroke, ellipsePolygon, getSmoothBrushParams, isTexturedBrush, rectPolygon } from "./brush";

interface PixelPage {
  width: number;
  height: number;
  background: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function midpoint(a: Point, b: Point) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function polylinePath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mid = midpoint(points[i], points[i + 1]);
    d += ` Q ${points[i].x} ${points[i].y} ${mid.x} ${mid.y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/** Stroke presentation attrs for a "smooth" brush (pen/marker/highlighter), matching the
 *  canvas renderer's width/opacity/blend scaling. Returns both the attrs and the effective
 *  width (needed for arrowhead sizing). */
function smoothStrokeAttrs(el: DrewElement): { attrs: string; width: number } {
  const params = getSmoothBrushParams(el.brush);
  const width = el.strokeWidth * params.widthScale;
  const opacity = Math.min(el.opacity * params.opacityScale, params.maxOpacity);
  const dash = dashArrayFor(el.strokeStyle, width);
  const dashAttr = dash.length ? ` stroke-dasharray="${dash.join(",")}"` : "";
  const blendAttr = params.multiply ? ` style="mix-blend-mode:multiply"` : "";
  return {
    width,
    attrs: `stroke="${el.strokeColor}" stroke-width="${width}" stroke-linecap="${params.cap}" stroke-linejoin="${params.join}" opacity="${opacity}"${dashAttr}${blendAttr}`,
  };
}

/** Textured (pencil/crayon) stroke as a faint core path plus scattered grain dabs — the
 *  same pure data the canvas renderer uses, so PNG/SVG exports match what's on screen. */
function texturedStrokeSvg(rawPoints: Point[], el: DrewElement): string {
  if (!isTexturedBrush(el.brush) || rawPoints.length === 0) return "";
  const stroke = computeTexturedStroke(rawPoints, el.strokeWidth, el.brush, el.seed);
  let out = "";
  if (stroke.core) {
    out += `<path d="${polylinePath(stroke.core)}" fill="none" stroke="${el.strokeColor}" stroke-width="${stroke.coreWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${el.opacity * stroke.coreAlpha}" style="mix-blend-mode:multiply" />\n  `;
  }
  for (const d of stroke.dabs) {
    out += `<circle cx="${d.x.toFixed(2)}" cy="${d.y.toFixed(2)}" r="${d.r.toFixed(2)}" fill="${el.strokeColor}" opacity="${(el.opacity * d.alpha).toFixed(3)}" style="mix-blend-mode:multiply" />\n  `;
  }
  return out;
}

function arrowheadSvg(a: Point, b: Point, strokeWidth: number, color: string, opacity: number): string {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const len = Math.min(Math.max(strokeWidth * 3.2, 10), 26);
  const spread = Math.PI / 7;
  const base1 = { x: b.x - len * Math.cos(angle - spread), y: b.y - len * Math.sin(angle - spread) };
  const base2 = { x: b.x - len * Math.cos(angle + spread), y: b.y - len * Math.sin(angle + spread) };
  return `<polygon points="${b.x},${b.y} ${base1.x},${base1.y} ${base2.x},${base2.y}" fill="${color}" opacity="${opacity}" />`;
}

function elementToSvg(el: DrewElement): string {
  const textured = isTexturedBrush(el.brush);

  switch (el.type) {
    case "freehand": {
      if (textured) return texturedStrokeSvg(el.points, el);
      const { attrs } = smoothStrokeAttrs(el);
      return `<path d="${polylinePath(el.points)}" fill="none" ${attrs} />`;
    }
    case "line": {
      if (textured) return texturedStrokeSvg(el.points, el);
      const { attrs } = smoothStrokeAttrs(el);
      return `<line x1="${el.points[0].x}" y1="${el.points[0].y}" x2="${el.points[1].x}" y2="${el.points[1].y}" ${attrs} />`;
    }
    case "arrow": {
      const [a, b] = el.points;
      if (textured) {
        return texturedStrokeSvg(el.points, el) + arrowheadSvg(a, b, el.strokeWidth, el.strokeColor, el.opacity);
      }
      const { attrs, width } = smoothStrokeAttrs(el);
      return (
        `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${attrs} />` +
        arrowheadSvg(a, b, width, el.strokeColor, el.opacity)
      );
    }
    case "rectangle": {
      let out = "";
      if (el.fill !== "transparent") {
        out += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.cornerRadius}" fill="${el.fill}" opacity="${el.opacity}" />\n  `;
      }
      if (el.strokeWidth > 0) {
        if (textured) {
          out += texturedStrokeSvg(rectPolygon(el.x, el.y, el.width, el.height), el);
        } else {
          const { attrs } = smoothStrokeAttrs(el);
          out += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.cornerRadius}" fill="none" ${attrs} />`;
        }
      }
      return out;
    }
    case "ellipse": {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rx = el.width / 2;
      const ry = el.height / 2;
      let out = "";
      if (el.fill !== "transparent") {
        out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${el.fill}" opacity="${el.opacity}" />\n  `;
      }
      if (el.strokeWidth > 0) {
        if (textured) {
          out += texturedStrokeSvg(ellipsePolygon(cx, cy, rx, ry), el);
        } else {
          const { attrs } = smoothStrokeAttrs(el);
          out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" ${attrs} />`;
        }
      }
      return out;
    }
    case "text": {
      const lineHeight = el.fontSize * 1.3;
      const anchor = el.align === "left" ? "start" : el.align === "right" ? "end" : "middle";
      const anchorX = el.align === "left" ? el.x : el.align === "right" ? el.x + el.width : el.x + el.width / 2;
      const fontFamily = el.fontFamily === "mono" ? "ui-monospace, Consolas, monospace" : "system-ui, sans-serif";
      const lines = (el.text.length ? el.text.split("\n") : [""]).map(
        (line, i) =>
          `<tspan x="${anchorX}" y="${el.y + i * lineHeight + el.fontSize * 0.9}">${esc(line)}</tspan>`,
      );
      return `<text font-size="${el.fontSize}" font-family="${fontFamily}" fill="${el.strokeColor}" opacity="${el.opacity}" text-anchor="${anchor}">${lines.join("")}</text>`;
    }
    case "image":
      return `<image href="${el.src}" x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" opacity="${el.opacity}" preserveAspectRatio="none" />`;
    default:
      return "";
  }
}

export function elementsToSvg(elements: DrewElement[], page: PixelPage): string {
  const body = elements.map(elementToSvg).join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}">
  <rect x="0" y="0" width="${page.width}" height="${page.height}" fill="${page.background}" />
  ${body}
</svg>
`;
}
