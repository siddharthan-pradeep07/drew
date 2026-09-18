import { useCallback, useEffect, useRef, useState } from "react";
import type { DownloadFormat, DrawStyle, PageConfig, Tool } from "../types";
import { clampPageSize, toPixels } from "../lib/units";
import { downloadCanvas, isSupportedImageFile } from "../lib/download";
import DrawingCanvas, { type DrawingCanvasHandle } from "./DrawingCanvas";
import Toolbar from "./Toolbar";
import { MinusIcon, PlusIcon } from "./Icons";
import "./CanvasScreen.css";

const PAGE_BACKGROUND = "#ffffff";
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;

interface CanvasScreenProps {
  pageConfig: PageConfig;
  onBack: () => void;
}

export default function CanvasScreen({ pageConfig, onBack }: CanvasScreenProps) {
  const pageWidth = clampPageSize(toPixels(pageConfig.width, pageConfig.unit));
  const pageHeight = clampPageSize(toPixels(pageConfig.height, pageConfig.unit));

  const [tool, setTool] = useState<Tool>("pen");
  const [style, setStyle] = useState<DrawStyle>({
    color: "#08060d",
    strokeWidth: 6,
    strokeStyle: "solid",
    opacity: 1,
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);

  const canvasHandleRef = useRef<DrawingCanvasHandle>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasContentRef = useRef(false);
  hasContentRef.current = canUndo;

  const fitZoom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const padding = 48;
    const availW = viewport.clientWidth - padding;
    const availH = viewport.clientHeight - padding;
    const next = Math.min(1, availW / pageWidth, availH / pageHeight);
    setZoom(Math.max(MIN_ZOOM, Number(next.toFixed(2))));
  }, [pageWidth, pageHeight]);

  // Fit the page to the viewport on first mount and whenever the page size changes.
  useEffect(() => {
    fitZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageWidth, pageHeight]);

  const handleStyleChange = useCallback((patch: Partial<DrawStyle>) => {
    setStyle((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleUndo = useCallback(() => canvasHandleRef.current?.undo(), []);
  const handleRedo = useCallback(() => canvasHandleRef.current?.redo(), []);

  const handleClear = useCallback(() => {
    if (hasContentRef.current && !window.confirm("Clear the whole canvas? This can't be undone once you leave the page.")) {
      return;
    }
    canvasHandleRef.current?.clear();
  }, []);

  const handleBack = useCallback(() => {
    if (hasContentRef.current && !window.confirm("Leave this drawing? Unsaved changes will be lost.")) {
      return;
    }
    onBack();
  }, [onBack]);

  const handleInsertFile = useCallback((file: File) => {
    if (!isSupportedImageFile(file)) {
      window.alert("That file type isn't supported. Try PNG, JPEG, WebP, GIF or SVG.");
      return;
    }
    canvasHandleRef.current?.insertImageFile(file);
  }, []);

  const handleDownload = useCallback((format: DownloadFormat) => {
    const canvas = canvasHandleRef.current?.getCanvas();
    if (canvas) downloadCanvas(canvas, format);
  }, []);

  // Drag-and-drop image insertion.
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = Array.from(e.dataTransfer.files).find(isSupportedImageFile);
      if (file) handleInsertFile(file);
    },
    [handleInsertFile],
  );

  // Paste image from clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.items ?? [])
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .find((f): f is File => !!f && isSupportedImageFile(f));
      if (file) canvasHandleRef.current?.insertImageFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (mod) return;

      switch (e.key.toLowerCase()) {
        case "p":
          setTool("pen");
          break;
        case "e":
          setTool("eraser");
          break;
        case "l":
          setTool("line");
          break;
        case "r":
          setTool("rectangle");
          break;
        case "o":
          setTool("ellipse");
          break;
        case "[":
          setStyle((prev) => ({ ...prev, strokeWidth: Math.max(1, prev.strokeWidth - 2) }));
          break;
        case "]":
          setStyle((prev) => ({ ...prev, strokeWidth: Math.min(64, prev.strokeWidth + 2) }));
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo, handleRedo]);

  const pageLabel = `${pageConfig.width}${pageConfig.unit} × ${pageConfig.height}${pageConfig.unit}`;

  return (
    <div className="canvas-screen">
      <Toolbar
        pageLabel={pageLabel}
        tool={tool}
        onToolChange={setTool}
        style={style}
        onStyleChange={handleStyleChange}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onInsertFile={handleInsertFile}
        onDownload={handleDownload}
        onBack={handleBack}
      />

      <div
        className="canvas-viewport"
        ref={viewportRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <DrawingCanvas
          ref={canvasHandleRef}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          zoom={zoom}
          tool={tool}
          style={style}
          pageBackground={PAGE_BACKGROUND}
          onHistoryChange={(undo, redo) => {
            setCanUndo(undo);
            setCanRedo(redo);
          }}
        />

        <div className="zoom-control">
          <button
            className="zoom-btn"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Number((z - 0.1).toFixed(2))))}
            aria-label="Zoom out"
          >
            <MinusIcon size={14} />
          </button>
          <button className="zoom-value" onClick={fitZoom} title="Fit to screen">
            {Math.round(zoom * 100)}%
          </button>
          <button
            className="zoom-btn"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Number((z + 0.1).toFixed(2))))}
            aria-label="Zoom in"
          >
            <PlusIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
