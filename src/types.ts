export type Unit = "px" | "mm" | "in";

export interface PageConfig {
  width: number;
  height: number;
  unit: Unit;
  background: string;
}

export type Tool =
  | "select"
  | "pan"
  | "pen"
  | "line"
  | "arrow"
  | "rectangle"
  | "ellipse"
  | "text"
  | "eraser";

export type StrokeStyle = "solid" | "dashed" | "dotted";

export type DownloadFormat = "png" | "jpeg" | "webp" | "svg";

export interface Point {
  x: number;
  y: number;
}

export type ElementType = "freehand" | "line" | "arrow" | "rectangle" | "ellipse" | "text" | "image";

interface ElementBase {
  id: string;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fill: string; // css color, or "transparent"
  opacity: number; // 0..1
}

export interface FreehandElement extends ElementBase {
  type: "freehand";
  points: Point[];
}

export interface LineElement extends ElementBase {
  type: "line";
  points: [Point, Point];
}

export interface ArrowElement extends ElementBase {
  type: "arrow";
  points: [Point, Point];
}

export interface RectangleElement extends ElementBase {
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}

export interface EllipseElement extends ElementBase {
  type: "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextElement extends ElementBase {
  type: "text";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: "sans" | "mono";
  align: "left" | "center" | "right";
}

export interface ImageElement extends ElementBase {
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
}

export type DrewElement =
  | FreehandElement
  | LineElement
  | ArrowElement
  | RectangleElement
  | EllipseElement
  | TextElement
  | ImageElement;

export interface ElementStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fill: string;
  opacity: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Camera {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
