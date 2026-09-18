import type { DownloadFormat } from "../types";

const MIME: Record<DownloadFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/** Export a canvas to a file and trigger a browser download for it. */
export function downloadCanvas(canvas: HTMLCanvasElement, format: DownloadFormat, fileName = "drawing") {
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.${format === "jpeg" ? "jpg" : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    MIME[format],
    format === "png" ? undefined : 0.92,
  );
}

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

export function isSupportedImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type) || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
}
