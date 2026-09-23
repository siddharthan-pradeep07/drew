import type { DrewElement } from "../types";
import { dashArrayFor } from "./render";

interface PixelPage {
  width: number;
  height: number;
  background: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function polylinePath(points: { x: number; y: number }[]): string {
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

function paintAttrs(el: DrewElement): string {
  const dash = dashArrayFor(el.strokeStyle, el.strokeWidth);
  const dashAttr = dash.length ? ` stroke-dasharray="${dash.join(",")}"` : "";
  return `stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${el.opacity}"${dashAttr}`;
}

function elementToSvg(el: DrewElement): string {
  switch (el.type) {
    case "freehand":
      return `<path d="${polylinePath(el.points)}" fill="none" ${paintAttrs(el)} />`;
    case "line":
      return `<line x1="${el.points[0].x}" y1="${el.points[0].y}" x2="${el.points[1].x}" y2="${el.points[1].y}" ${paintAttrs(el)} />`;
    case "arrow": {
      const [a, b] = el.points;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const len = Math.min(Math.max(el.strokeWidth * 3.2, 10), 26);
      const spread = Math.PI / 7;
      const base1 = { x: b.x - len * Math.cos(angle - spread), y: b.y - len * Math.sin(angle - spread) };
      const base2 = { x: b.x - len * Math.cos(angle + spread), y: b.y - len * Math.sin(angle + spread) };
      return (
        `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${paintAttrs(el)} />` +
        `<polygon points="${b.x},${b.y} ${base1.x},${base1.y} ${base2.x},${base2.y}" fill="${el.strokeColor}" opacity="${el.opacity}" />`
      );
    }
    case "rectangle":
      return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.cornerRadius}" fill="${el.fill}" ${paintAttrs(el)} />`;
    case "ellipse":
      return `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${el.width / 2}" ry="${el.height / 2}" fill="${el.fill}" ${paintAttrs(el)} />`;
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
