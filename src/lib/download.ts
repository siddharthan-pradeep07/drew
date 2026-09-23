import type { DownloadFormat, DrewElement } from "../types";
import { drawElement } from "./render";
import { elementsToSvg } from "./exportSvg";

const MIME: Record<Exclude<DownloadFormat, "svg">, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Render just the page (elements clipped to its bounds) to an offscreen canvas at 2x for crisp export. */
function renderPageToCanvas(elements: DrewElement[], pageWidth: number, pageHeight: number, background: string): HTMLCanvasElement {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(pageWidth * scale));
  canvas.height = Math.max(1, Math.round(pageHeight * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, pageWidth, pageHeight);
  const noop = () => {};
  for (const el of elements) drawElement(ctx, el, noop);
  return canvas;
}

export function downloadDrawing(
  elements: DrewElement[],
  pageWidth: number,
  pageHeight: number,
  background: string,
  format: DownloadFormat,
  fileName = "drawing",
) {
  if (format === "svg") {
    const svg = elementsToSvg(elements, { width: pageWidth, height: pageHeight, background });
    triggerBlobDownload(new Blob([svg], { type: "image/svg+xml" }), `${fileName}.svg`);
    return;
  }

  const canvas = renderPageToCanvas(elements, pageWidth, pageHeight, background);
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      triggerBlobDownload(blob, `${fileName}.${format === "jpeg" ? "jpg" : format}`);
    },
    MIME[format],
    format === "png" ? undefined : 0.92,
  );
}

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

export function isSupportedImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type) || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
}
