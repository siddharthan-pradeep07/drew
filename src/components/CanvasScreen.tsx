import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Camera, DownloadFormat, DrewElement, ElementStyle, PageConfig, Tool, Unit } from "../types";
import { clampPageSize, toPixels } from "../lib/units";
import { downloadDrawing, isSupportedImageFile } from "../lib/download";
import { translateElement } from "../lib/geometry";
import { makeId } from "../lib/id";
import { debounce, saveDocument } from "../lib/storage";
import CanvasStage, { type CanvasStageHandle } from "./CanvasStage";
import Toolbar from "./Toolbar";
import Inspector from "./Inspector";
import LayersPanel from "./LayersPanel";
import ShortcutsHelp from "./ShortcutsHelp";
import TextEditorOverlay from "./TextEditorOverlay";
import { MinusIcon, PlusIcon } from "./Icons";
import "./CanvasScreen.css";

const MAX_HISTORY = 80;
const NUDGE = 1;
const NUDGE_BIG = 10;

const TOOL_KEYS: Record<string, Tool> = {
  v: "select",
  h: "pan",
  p: "pen",
  l: "line",
  a: "arrow",
  r: "rectangle",
  o: "ellipse",
  t: "text",
  e: "eraser",
};

interface CanvasScreenProps {
  pageConfig: PageConfig;
  initialElements: DrewElement[];
  onBack: () => void;
}

export default function CanvasScreen({ pageConfig: initialPageConfig, initialElements, onBack }: CanvasScreenProps) {
  const [pageConfig, setPageConfig] = useState<PageConfig>(initialPageConfig);
  const [elements, setElementsRaw] = useState<DrewElement[]>(initialElements);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<Tool>("pen");
  const [defaultStyle, setDefaultStyle] = useState<ElementStyle>({
    strokeColor: "#000000",
    strokeWidth: 4,
    strokeStyle: "solid",
    fill: "transparent",
    opacity: 1,
  });
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const [inspectorMobileOpen, setInspectorMobileOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera>({ offsetX: 0, offsetY: 0, zoom: 1 });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");

  const stageRef = useRef<CanvasStageHandle>(null);
  const elementsRef = useRef(elements);
  const selectedIdsRef = useRef(selectedIds);
  const pageConfigRef = useRef(pageConfig);
  useEffect(() => {
    elementsRef.current = elements;
    selectedIdsRef.current = selectedIds;
    pageConfigRef.current = pageConfig;
  }, [elements, selectedIds, pageConfig]);

  const historyRef = useRef<DrewElement[][]>([elements]);
  const historyIndexRef = useRef(0);
  const clipboardRef = useRef<DrewElement[]>([]);

  // Wraps setElements so elementsRef is updated *synchronously* (inside the state updater,
  // which React invokes immediately even though the re-render is deferred). Several call
  // sites call commit() right after this in the same tick, and commit() reads elementsRef —
  // without this, it would capture the previous, stale array.
  const setElementsState = useCallback((update: DrewElement[] | ((prev: DrewElement[]) => DrewElement[])) => {
    setElementsRaw((prev) => {
      const next = typeof update === "function" ? (update as (p: DrewElement[]) => DrewElement[])(prev) : update;
      elementsRef.current = next;
      return next;
    });
  }, []);

  const pageWidth = clampPageSize(toPixels(pageConfig.width, pageConfig.unit));
  const pageHeight = clampPageSize(toPixels(pageConfig.height, pageConfig.unit));

  // ---------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------

  const commit = useCallback(() => {
    const next = historyRef.current.slice(0, historyIndexRef.current + 1);
    next.push(elementsRef.current);
    while (next.length > MAX_HISTORY) next.shift();
    historyRef.current = next;
    historyIndexRef.current = next.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    setElementsState(historyRef.current[historyIndexRef.current]);
    setSelectedIds(new Set());
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [setElementsState]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    setElementsState(historyRef.current[historyIndexRef.current]);
    setSelectedIds(new Set());
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [setElementsState]);

  const setElements = useCallback(
    (updater: (prev: DrewElement[]) => DrewElement[]) => {
      setElementsState((prev) => updater(prev));
    },
    [setElementsState],
  );

  // ---------------------------------------------------------------------
  // Autosave
  // ---------------------------------------------------------------------

  const debouncedSave = useMemo(
    () =>
      debounce((cfg: PageConfig, els: DrewElement[]) => {
        saveDocument(cfg, els);
        setSaveLabel("Saved");
      }, 900),
    [],
  );

  useEffect(() => {
    setSaveLabel(elements.length || historyIndexRef.current > 0 ? "Saving…" : "");
    debouncedSave(pageConfig, elements);
  }, [pageConfig, elements, debouncedSave]);

  // ---------------------------------------------------------------------
  // Selection-aware element mutation helpers
  // ---------------------------------------------------------------------

  const selectedElements = useMemo(() => elements.filter((el) => selectedIds.has(el.id)), [elements, selectedIds]);

  const handleStyleChange = useCallback(
    (patch: Partial<ElementStyle>) => {
      if (selectedIdsRef.current.size === 0) {
        setDefaultStyle((prev) => ({ ...prev, ...patch }));
        return;
      }
      setElementsState((prev) => prev.map((el) => (selectedIdsRef.current.has(el.id) ? { ...el, ...patch } : el)));
      commit();
    },
    [commit, setElementsState],
  );

  const handleCornerRadiusChange = useCallback(
    (value: number) => {
      setElementsState((prev) =>
        prev.map((el) => (selectedIdsRef.current.has(el.id) && el.type === "rectangle" ? { ...el, cornerRadius: value } : el)),
      );
      commit();
    },
    [commit, setElementsState],
  );

  const handleFontSizeChange = useCallback(
    (value: number) => {
      setElementsState((prev) =>
        prev.map((el) => (selectedIdsRef.current.has(el.id) && el.type === "text" ? { ...el, fontSize: value } : el)),
      );
      commit();
    },
    [commit, setElementsState],
  );

  const handleFontFamilyChange = useCallback(
    (value: "sans" | "mono") => {
      setElementsState((prev) =>
        prev.map((el) => (selectedIdsRef.current.has(el.id) && el.type === "text" ? { ...el, fontFamily: value } : el)),
      );
      commit();
    },
    [commit, setElementsState],
  );

  const handleAlignChange = useCallback(
    (value: "left" | "center" | "right") => {
      setElementsState((prev) =>
        prev.map((el) => (selectedIdsRef.current.has(el.id) && el.type === "text" ? { ...el, align: value } : el)),
      );
      commit();
    },
    [commit, setElementsState],
  );

  const handleGeometryChange = useCallback(
    (id: string, patch: { x?: number; y?: number; width?: number; height?: number }) => {
      setElementsState((prev) =>
        prev.map((el) => {
          if (el.id !== id) return el;
          if (el.type === "freehand" || el.type === "line" || el.type === "arrow") return el;
          return {
            ...el,
            x: patch.x ?? el.x,
            y: patch.y ?? el.y,
            width: Math.max(1, patch.width ?? el.width),
            height: Math.max(1, patch.height ?? el.height),
          };
        }),
      );
      commit();
    },
    [commit, setElementsState],
  );

  const handleDuplicate = useCallback(() => {
    if (selectedIdsRef.current.size === 0) return;
    const toDupe = elementsRef.current.filter((el) => selectedIdsRef.current.has(el.id));
    const clones = toDupe.map((el) => translateElement({ ...el, id: makeId() }, 16, 16));
    setElementsState((prev) => [...prev, ...clones]);
    setSelectedIds(new Set(clones.map((c) => c.id)));
    commit();
  }, [commit, setElementsState]);

  const handleDelete = useCallback(() => {
    if (selectedIdsRef.current.size === 0) return;
    setElementsState((prev) => prev.filter((el) => !selectedIdsRef.current.has(el.id)));
    setSelectedIds(new Set());
    commit();
  }, [commit, setElementsState]);

  const deleteSingle = useCallback(
    (id: string) => {
      setElementsState((prev) => prev.filter((el) => el.id !== id));
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      commit();
    },
    [commit, setElementsState],
  );

  const handleReorder = useCallback(
    (dir: "front" | "back" | "forward" | "backward") => {
      const ids = selectedIdsRef.current;
      if (ids.size === 0) return;
      setElementsState((prev) => {
        if (dir === "front" || dir === "back") {
          const selected = prev.filter((el) => ids.has(el.id));
          const rest = prev.filter((el) => !ids.has(el.id));
          return dir === "front" ? [...rest, ...selected] : [...selected, ...rest];
        }
        if (ids.size !== 1) return prev;
        const id = [...ids][0];
        const index = prev.findIndex((el) => el.id === id);
        if (index === -1) return prev;
        const swapWith = dir === "forward" ? index + 1 : index - 1;
        if (swapWith < 0 || swapWith >= prev.length) return prev;
        const next = [...prev];
        [next[index], next[swapWith]] = [next[swapWith], next[index]];
        return next;
      });
      commit();
    },
    [commit, setElementsState],
  );

  const moveLayer = useCallback(
    (id: string, dir: "forward" | "backward") => {
      setSelectedIds(new Set([id]));
      setElementsState((prev) => {
        const index = prev.findIndex((el) => el.id === id);
        if (index === -1) return prev;
        const swapWith = dir === "forward" ? index + 1 : index - 1;
        if (swapWith < 0 || swapWith >= prev.length) return prev;
        const next = [...prev];
        [next[index], next[swapWith]] = [next[swapWith], next[index]];
        return next;
      });
      commit();
    },
    [commit, setElementsState],
  );

  const selectLayer = useCallback((id: string, additive: boolean) => {
    setSelectedIds((prev) => {
      if (!additive) return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------
  // Page / canvas settings
  // ---------------------------------------------------------------------

  const handlePageResize = useCallback((width: number, height: number, unit: Unit) => {
    setPageConfig((prev) => ({ ...prev, width, height, unit }));
  }, []);

  const handleBackgroundChange = useCallback((color: string) => {
    setPageConfig((prev) => ({ ...prev, background: color }));
  }, []);

  // ---------------------------------------------------------------------
  // Insert / download
  // ---------------------------------------------------------------------

  const handleInsertFile = useCallback(
    (file: File) => {
      if (!isSupportedImageFile(file)) {
        window.alert("That file type isn't supported. Try PNG, JPEG, WebP, GIF or SVG.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const pw = pageConfigRef.current;
          const pageW = clampPageSize(toPixels(pw.width, pw.unit));
          const pageH = clampPageSize(toPixels(pw.height, pw.unit));
          const maxW = pageW * 0.7;
          const maxH = pageH * 0.7;
          const scale = Math.min(1, maxW / img.width, maxH / img.height);
          const width = Math.max(1, img.width * scale);
          const height = Math.max(1, img.height * scale);
          const id = makeId();
          const el: DrewElement = {
            id,
            type: "image",
            x: (pageW - width) / 2,
            y: (pageH - height) / 2,
            width,
            height,
            src,
            strokeColor: "#000000",
            strokeWidth: 0,
            strokeStyle: "solid",
            fill: "transparent",
            opacity: 1,
          };
          setElementsState((prev) => [...prev, el]);
          setSelectedIds(new Set([id]));
          commit();
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    [commit, setElementsState],
  );

  const handleDownload = useCallback(
    (format: DownloadFormat) => {
      downloadDrawing(elementsRef.current, pageWidth, pageHeight, pageConfigRef.current.background, format);
    },
    [pageWidth, pageHeight],
  );

  // ---------------------------------------------------------------------
  // Text editing
  // ---------------------------------------------------------------------

  const editingElement = editingTextId ? elements.find((el) => el.id === editingTextId) : undefined;
  const editingTextElement = editingElement?.type === "text" ? editingElement : undefined;

  const handleTextChange = useCallback(
    (text: string) => {
      setElementsState((prev) => prev.map((el) => (el.id === editingTextId && el.type === "text" ? { ...el, text } : el)));
    },
    [editingTextId, setElementsState],
  );

  const handleTextHeight = useCallback(
    (worldHeight: number) => {
      setElementsState((prev) => prev.map((el) => (el.id === editingTextId && el.type === "text" ? { ...el, height: worldHeight } : el)));
    },
    [editingTextId, setElementsState],
  );

  const commitTextEdit = useCallback(() => {
    const id = editingTextId;
    if (!id) return;
    setEditingTextId(null);
    setElementsState((prev) => {
      const el = prev.find((x) => x.id === id);
      if (el && el.type === "text" && el.text.trim() === "") {
        return prev.filter((x) => x.id !== id);
      }
      return prev;
    });
    commit();
  }, [editingTextId, commit, setElementsState]);

  // ---------------------------------------------------------------------
  // Back / clear
  // ---------------------------------------------------------------------

  const handleBack = useCallback(() => {
    if (elementsRef.current.length > 0 && !window.confirm("Leave this drawing? Your work is autosaved, but starting a new page replaces it.")) {
      return;
    }
    onBack();
  }, [onBack]);

  // ---------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;

      if (typing) return;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDuplicate();
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedIds(new Set(elementsRef.current.map((el) => el.id)));
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        if (selectedIdsRef.current.size > 0) {
          clipboardRef.current = elementsRef.current.filter((el) => selectedIdsRef.current.has(el.id));
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        if (clipboardRef.current.length > 0) {
          const clones = clipboardRef.current.map((el) => translateElement({ ...el, id: makeId() }, 16, 16));
          clipboardRef.current = clones;
          setElementsState((prev) => [...prev, ...clones]);
          setSelectedIds(new Set(clones.map((c) => c.id)));
          commit();
        }
        return;
      }
      if (mod && e.key === "]") {
        e.preventDefault();
        handleReorder(e.shiftKey ? "front" : "forward");
        return;
      }
      if (mod && e.key === "[") {
        e.preventDefault();
        handleReorder(e.shiftKey ? "back" : "backward");
        return;
      }
      if (mod && e.key === "0") {
        e.preventDefault();
        stageRef.current?.zoomTo(1);
        return;
      }
      if (mod) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIdsRef.current.size > 0) {
          e.preventDefault();
          handleDelete();
        }
        return;
      }
      if (e.key === "Escape") {
        setSelectedIds(new Set());
        setShowHelp(false);
        return;
      }
      if (e.key === "?") {
        setShowHelp((v) => !v);
        return;
      }
      if (e.key === "[") {
        setDefaultStyle((prev) => ({ ...prev, strokeWidth: Math.max(1, prev.strokeWidth - 2) }));
        return;
      }
      if (e.key === "]") {
        setDefaultStyle((prev) => ({ ...prev, strokeWidth: Math.min(64, prev.strokeWidth + 2) }));
        return;
      }
      if (e.key === "!" && e.shiftKey) {
        stageRef.current?.fitToScreen();
        return;
      }
      if (e.key.startsWith("Arrow") && selectedIdsRef.current.size > 0) {
        e.preventDefault();
        const step = e.shiftKey ? NUDGE_BIG : NUDGE;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        setElementsState((prev) => prev.map((el) => (selectedIdsRef.current.has(el.id) ? translateElement(el, dx, dy) : el)));
        commit();
        return;
      }

      const lower = e.key.toLowerCase();
      if (lower in TOOL_KEYS) {
        setTool(TOOL_KEYS[lower]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, handleDuplicate, handleDelete, handleReorder, commit, setElementsState]);

  // ---------------------------------------------------------------------
  // Drag & drop / paste image
  // ---------------------------------------------------------------------

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = Array.from(e.dataTransfer.files).find(isSupportedImageFile);
      if (file) handleInsertFile(file);
    },
    [handleInsertFile],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
      const file = Array.from(e.clipboardData?.items ?? [])
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .find((f): f is File => !!f && isSupportedImageFile(f));
      if (file) handleInsertFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleInsertFile]);

  const pageLabel = `${pageConfig.width}${pageConfig.unit} × ${pageConfig.height}${pageConfig.unit}`;

  return (
    <div className={`canvas-screen ${layersOpen ? "layers-open" : ""}`}>
      <Toolbar
        pageLabel={pageLabel}
        tool={tool}
        onToolChange={setTool}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onInsertFile={handleInsertFile}
        onDownload={handleDownload}
        onBack={handleBack}
        layersOpen={layersOpen}
        onToggleLayers={() => setLayersOpen((v) => !v)}
        onToggleInspector={() => setInspectorMobileOpen((v) => !v)}
        onShowHelp={() => setShowHelp(true)}
        saveLabel={saveLabel}
      />

      {layersOpen && (
        <LayersPanel
          elements={elements}
          selectedIds={selectedIds}
          onSelect={selectLayer}
          onDelete={deleteSingle}
          onMove={moveLayer}
          onClose={() => setLayersOpen(false)}
        />
      )}

      <div className="canvas-viewport" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
        <CanvasStage
          ref={stageRef}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          pageBackground={pageConfig.background}
          elements={elements}
          setElements={setElements}
          commit={commit}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          tool={tool}
          onToolChange={setTool}
          defaultStyle={defaultStyle}
          snapToGrid={snapToGrid}
          showGrid={showGrid}
          editingTextId={editingTextId}
          onStartTextEdit={setEditingTextId}
          onCameraChange={setCamera}
        />

        {editingTextElement && (
          <TextEditorOverlay
            element={editingTextElement}
            camera={camera}
            onChange={handleTextChange}
            onHeightChange={handleTextHeight}
            onCommit={commitTextEdit}
          />
        )}

        <div className="zoom-control">
          <button className="zoom-btn" onClick={() => stageRef.current?.zoomBy(1 / 1.2)} aria-label="Zoom out">
            <MinusIcon size={14} />
          </button>
          <button className="zoom-value" onClick={() => stageRef.current?.fitToScreen()} title="Fit to screen">
            {Math.round(camera.zoom * 100)}%
          </button>
          <button className="zoom-btn" onClick={() => stageRef.current?.zoomBy(1.2)} aria-label="Zoom in">
            <PlusIcon size={14} />
          </button>
        </div>
      </div>

      <Inspector
        pageConfig={pageConfig}
        onPageResize={handlePageResize}
        onBackgroundChange={handleBackgroundChange}
        showGrid={showGrid}
        onShowGridChange={setShowGrid}
        snapToGrid={snapToGrid}
        onSnapToGridChange={setSnapToGrid}
        style={selectedElements.length > 0 ? elementStyleOf(selectedElements[0]) : defaultStyle}
        onStyleChange={handleStyleChange}
        selectedElements={selectedElements}
        onCornerRadiusChange={handleCornerRadiusChange}
        onFontSizeChange={handleFontSizeChange}
        onFontFamilyChange={handleFontFamilyChange}
        onAlignChange={handleAlignChange}
        onGeometryChange={handleGeometryChange}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onReorder={handleReorder}
        mobileOpen={inspectorMobileOpen}
        onCloseMobile={() => setInspectorMobileOpen(false)}
      />

      {inspectorMobileOpen && <div className="mobile-backdrop" onClick={() => setInspectorMobileOpen(false)} />}
      {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
}

function elementStyleOf(el: DrewElement): ElementStyle {
  return { strokeColor: el.strokeColor, strokeWidth: el.strokeWidth, strokeStyle: el.strokeStyle, fill: el.fill, opacity: el.opacity };
}
