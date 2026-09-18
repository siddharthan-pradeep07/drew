import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { DrawStyle, Point, Tool } from "../types";
import {
  applyStrokeStyle,
  constrainShapePoint,
  drawShape,
  getLogicalPoint,
  midpoint,
  setupCanvas,
} from "../lib/drawing";
import "./DrawingCanvas.css";

export interface DrawingCanvasHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  insertImageFile: (file: File) => void;
  getCanvas: () => HTMLCanvasElement | null;
}

interface DrawingCanvasProps {
  pageWidth: number;
  pageHeight: number;
  zoom: number;
  tool: Tool;
  style: DrawStyle;
  pageBackground: string;
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
}

const MAX_HISTORY = 40;

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(function DrawingCanvas(
  { pageWidth, pageHeight, zoom, tool, style, pageBackground, onHistoryChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const overlayCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const restoringRef = useRef(false);

  // Freehand stroke tracking.
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const lastMidRef = useRef<Point | null>(null);
  const hasPaintedRef = useRef(false);

  // Shape tool tracking.
  const shapeStartRef = useRef<Point | null>(null);
  const lastShapeEndRef = useRef<Point | null>(null);

  const toolRef = useRef(tool);
  const styleRef = useRef(style);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    styleRef.current = style;
  }, [style]);

  const notifyHistory = useCallback(() => {
    onHistoryChange(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1);
  }, [onHistoryChange]);

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || restoringRef.current) return;
    const dataUrl = canvas.toDataURL();
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(dataUrl);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
    notifyHistory();
  }, [notifyHistory]);

  const restoreFromHistory = useCallback((dataUrl: string) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    restoringRef.current = true;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, pageWidth, pageHeight);
      ctx.drawImage(img, 0, 0, pageWidth, pageHeight);
      restoringRef.current = false;
    };
    img.src = dataUrl;
  }, [pageWidth, pageHeight]);

  // (Re)initialise the canvas whenever the logical page size changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const ctx = setupCanvas(canvas, pageWidth, pageHeight);
    const overlayCtx = setupCanvas(overlay, pageWidth, pageHeight);
    ctxRef.current = ctx;
    overlayCtxRef.current = overlayCtx;

    ctx.fillStyle = pageBackground;
    ctx.fillRect(0, 0, pageWidth, pageHeight);

    historyRef.current = [canvas.toDataURL()];
    historyIndexRef.current = 0;
    notifyHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageWidth, pageHeight]);

  const pointFromEvent = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      return getLogicalPoint(canvas, pageWidth, pageHeight, e.clientX, e.clientY);
    },
    [pageWidth, pageHeight],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const point = pointFromEvent(e);
      const currentTool = toolRef.current;

      applyStrokeStyle(ctx, currentTool, styleRef.current, pageBackground);

      if (currentTool === "pen" || currentTool === "eraser") {
        isDrawingRef.current = true;
        hasPaintedRef.current = false;
        lastPointRef.current = point;
        lastMidRef.current = point;
      } else {
        shapeStartRef.current = point;
        lastShapeEndRef.current = point;
      }
    },
    [pageBackground, pointFromEvent],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const currentTool = toolRef.current;
      const point = pointFromEvent(e);

      if ((currentTool === "pen" || currentTool === "eraser") && isDrawingRef.current) {
        const ctx = ctxRef.current;
        const last = lastPointRef.current;
        const lastMid = lastMidRef.current;
        if (!ctx || !last || !lastMid) return;
        const newMid = midpoint(last, point);
        ctx.beginPath();
        ctx.moveTo(lastMid.x, lastMid.y);
        ctx.quadraticCurveTo(last.x, last.y, newMid.x, newMid.y);
        ctx.stroke();
        hasPaintedRef.current = true;
        lastPointRef.current = point;
        lastMidRef.current = newMid;
        return;
      }

      if (shapeStartRef.current) {
        const overlayCtx = overlayCtxRef.current;
        if (!overlayCtx) return;
        const end = constrainShapePoint(currentTool, shapeStartRef.current, point, e.shiftKey);
        lastShapeEndRef.current = end;
        overlayCtx.clearRect(0, 0, pageWidth, pageHeight);
        applyStrokeStyle(overlayCtx, currentTool, styleRef.current, pageBackground);
        drawShape(overlayCtx, currentTool, shapeStartRef.current, end);
      }
    },
    [pageBackground, pageWidth, pageHeight, pointFromEvent],
  );

  const finishStroke = useCallback(() => {
    const currentTool = toolRef.current;

    if (currentTool === "pen" || currentTool === "eraser") {
      if (isDrawingRef.current) {
        const ctx = ctxRef.current;
        if (ctx && !hasPaintedRef.current && lastPointRef.current) {
          // A tap with no movement: paint a single dot.
          const p = lastPointRef.current;
          const r = Math.max(styleRef.current.strokeWidth / 2, 0.75);
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        isDrawingRef.current = false;
        lastPointRef.current = null;
        lastMidRef.current = null;
        pushHistory();
      }
      return;
    }

    if (shapeStartRef.current) {
      const ctx = ctxRef.current;
      const overlayCtx = overlayCtxRef.current;
      const end = lastShapeEndRef.current ?? shapeStartRef.current;
      if (ctx) {
        applyStrokeStyle(ctx, currentTool, styleRef.current, pageBackground);
        drawShape(ctx, currentTool, shapeStartRef.current, end);
      }
      overlayCtx?.clearRect(0, 0, pageWidth, pageHeight);
      shapeStartRef.current = null;
      lastShapeEndRef.current = null;
      pushHistory();
    }
  }, [pageBackground, pageWidth, pageHeight, pushHistory]);

  const handlePointerUp = useCallback(() => {
    finishStroke();
  }, [finishStroke]);

  useImperativeHandle(
    ref,
    () => ({
      undo: () => {
        if (historyIndexRef.current <= 0) return;
        historyIndexRef.current -= 1;
        restoreFromHistory(historyRef.current[historyIndexRef.current]);
        notifyHistory();
      },
      redo: () => {
        if (historyIndexRef.current >= historyRef.current.length - 1) return;
        historyIndexRef.current += 1;
        restoreFromHistory(historyRef.current[historyIndexRef.current]);
        notifyHistory();
      },
      clear: () => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        ctx.fillStyle = pageBackground;
        ctx.fillRect(0, 0, pageWidth, pageHeight);
        pushHistory();
      },
      insertImageFile: (file: File) => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const maxW = pageWidth * 0.8;
          const maxH = pageHeight * 0.8;
          const scale = Math.min(1, maxW / img.width, maxH / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
          ctx.setLineDash([]);
          ctx.drawImage(img, (pageWidth - w) / 2, (pageHeight - h) / 2, w, h);
          pushHistory();
          URL.revokeObjectURL(url);
        };
        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;
      },
      getCanvas: () => canvasRef.current,
    }),
    [pageBackground, pageWidth, pageHeight, pushHistory, restoreFromHistory, notifyHistory],
  );

  const displayWidth = pageWidth * zoom;
  const displayHeight = pageHeight * zoom;

  return (
    <div
      className="drawing-canvas-wrap"
      style={{ width: displayWidth, height: displayHeight }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <canvas ref={canvasRef} className="drawing-canvas" />
      <canvas ref={overlayRef} className="drawing-canvas drawing-canvas-overlay" />
    </div>
  );
});

export default DrawingCanvas;
