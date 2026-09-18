export type Unit = "px" | "mm" | "in";

export interface PageConfig {
  width: number;
  height: number;
  unit: Unit;
}

export type Tool = "pen" | "eraser" | "line" | "rectangle" | "ellipse";

export type StrokeStyle = "solid" | "dashed" | "dotted";

export type DownloadFormat = "png" | "jpeg" | "webp";

export interface DrawStyle {
  color: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  opacity: number;
}

export interface Point {
  x: number;
  y: number;
}
