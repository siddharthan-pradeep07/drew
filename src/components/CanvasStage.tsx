import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { Bounds, Camera, DrewElement, ElementStyle, Point, ResizeHandle, Tool } from "../types";
import { makeId } from "../lib/id";
import {
  boundsIntersect,
  computeResizedBounds,
  constrainDragPoint,
  getElementBounds,
  HANDLE_CURSORS,
  hitTestElement,
  normalizeBox,
  resizeElementTo,
  screenToWorld,
  snapValue,
  translateElement,
  unionBounds,
} from "../lib/geometry";
import { drawElement, drawGrid, drawMarquee, drawPageFrame, drawSelectionOutline, hitHandle } from "../lib/render";
import "./CanvasStage.css";

const GRID_SIZE = 8;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;
const HIT_TOLERANCE_PX = 8;

interface CanvasStageProps {
  pageWidth: number;
  pageHeight: number;
  pageBackground: string;
  elements: DrewElement[];
  setElements: (updater: (prev: DrewElement[]) => DrewElement[]) => void;
  commit: () => void;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  defaultStyle: ElementStyle;
  snapToGrid: boolean;
  showGrid: boolean;
  editingTextId: string | null;
  onStartTextEdit: (id: string) => void;
  onCameraChange: (camera: Camera) => void;
}

export interface CanvasStageHandle {
  zoomBy: (factor: number) => void;
  zoomTo: (zoom: number) => void;
  fitToScreen: () => void;
  getCamera: () => Camera;
}

type Interaction =
  | { mode: "pan"; lastScreen: Point }
  | { mode: "pinch"; startDist: number; startMid: Point; startCamera: Camera }
  | { mode: "marquee"; startWorld: Point }
  | { mode: "move"; startWorld: Point; originals: Map<string, DrewElement> }
  | { mode: "resize"; handle: ResizeHandle; id: string; original: DrewElement; originalBounds: Bounds }
  | { mode: "draw-freehand" }
  | { mode: "draw-shape"; startWorld: Point }
  | { mode: "erase" };

const CanvasStage = forwardRef<CanvasStageHandle, CanvasStageProps>(function CanvasStage(props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera>({ offsetX: 0, offsetY: 0, zoom: 1 });
  const hasFitRef = useRef(false);

  const interactionRef = useRef<Interaction | null>(null);
  const draftListRef = useRef<DrewElement[] | null>(null); // working copy of elements[] during move/resize/erase
  const newDraftRef = useRef<DrewElement | null>(null); // in-progress new element, not yet committed
  const marqueeRef = useRef<Bounds | null>(null);
  const erasedIdsRef = useRef<Set<string>>(new Set());
  const lastErasePointRef = useRef<Point | null>(null);
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const spaceHeldRef = useRef(false);

  // Mirror the latest props into refs so imperative handlers (and render()) always see
  // current values without needing to be re-created every render.
  const elementsRef = useRef(props.elements);
  const selectedIdsRef = useRef(props.selectedIds);
  const toolRef = useRef(props.tool);
  const defaultStyleRef = useRef(props.defaultStyle);
  const snapRef = useRef(props.snapToGrid);
  const showGridRef = useRef(props.showGrid);
  const editingTextIdRef = useRef(props.editingTextId);
  const pageRef = useRef({ width: props.pageWidth, height: props.pageHeight, background: props.pageBackground });
  elementsRef.current = props.elements;
  selectedIdsRef.current = props.selectedIds;
  toolRef.current = props.tool;
  defaultStyleRef.current = props.defaultStyle;
  snapRef.current = props.snapToGrid;
  showGridRef.current = props.showGrid;
  editingTextIdRef.current = props.editingTextId;
  pageRef.current = { width: props.pageWidth, height: props.pageHeight, background: props.pageBackground };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = container.clientWidth;
    const cssH = container.clientHeight;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
    }

    const camera = cameraRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--board-bg-color").trim() || "#e9e9ea";
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.setTransform(dpr * camera.zoom, 0, 0, dpr * camera.zoom, dpr * camera.offsetX, dpr * camera.offsetY);

    if (showGridRef.current) {
      drawGrid(ctx, camera, cssW, cssH, "rgba(0,0,0,0.16)");
    }

    const page = pageRef.current;
    drawPageFrame(ctx, page.width, page.height, page.background, "#000000", camera.zoom);

    const list = draftListRef.current ?? elementsRef.current;
    for (const el of list) {
      if (el.id === editingTextIdRef.current) continue;
      drawElement(ctx, el, render);
    }
    if (newDraftRef.current) drawElement(ctx, newDraftRef.current, render);

    const selected = selectedIdsRef.current;
    if (selected.size > 0) {
      const bounds = list.filter((el) => selected.has(el.id)).map(getElementBounds);
      if (bounds.length === 1) {
        drawSelectionOutline(ctx, bounds[0], camera.zoom, "#000000", true);
      } else if (bounds.length > 1) {
        for (const b of bounds) drawSelectionOutline(ctx, b, camera.zoom, "#000000", false);
        drawSelectionOutline(ctx, unionBounds(bounds), camera.zoom, "#666666", false);
      }
    }

    if (marqueeRef.current) {
      drawMarquee(ctx, marqueeRef.current, camera.zoom, "#000000", "rgba(0,0,0,0.06)");
    }
  }, []);

  const emitCamera = useCallback(() => {
    props.onCameraChange({ ...cameraRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const padding = 64;
    const availW = container.clientWidth - padding;
    const availH = container.clientHeight - padding;
    const zoom = Math.min(2, Math.max(MIN_ZOOM, Math.min(availW / pageRef.current.width, availH / pageRef.current.height)));
    const offsetX = (container.clientWidth - pageRef.current.width * zoom) / 2;
    const offsetY = (container.clientHeight - pageRef.current.height * zoom) / 2;
    cameraRef.current = { offsetX, offsetY, zoom };
    render();
    emitCamera();
  }, [render, emitCamera]);

  const zoomAround = useCallback(
    (screenPoint: Point, newZoomRaw: number) => {
      const camera = cameraRef.current;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoomRaw));
      const worldPoint = screenToWorld(screenPoint, camera);
      const offsetX = screenPoint.x - worldPoint.x * newZoom;
      const offsetY = screenPoint.y - worldPoint.y * newZoom;
      cameraRef.current = { offsetX, offsetY, zoom: newZoom };
      render();
      emitCamera();
    },
    [render, emitCamera],
  );

  useImperativeHandle(
    ref,
    () => ({
      zoomBy: (factor) => {
        const container = containerRef.current;
        const center = container ? { x: container.clientWidth / 2, y: container.clientHeight / 2 } : { x: 0, y: 0 };
        zoomAround(center, cameraRef.current.zoom * factor);
      },
      zoomTo: (zoom) => {
        const container = containerRef.current;
        const center = container ? { x: container.clientWidth / 2, y: container.clientHeight / 2 } : { x: 0, y: 0 };
        zoomAround(center, zoom);
      },
      fitToScreen,
      getCamera: () => ({ ...cameraRef.current }),
    }),
    [zoomAround, fitToScreen],
  );

  // Keep the canvas backing-store sized to its container; fit-to-screen once on first size.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (!hasFitRef.current && container.clientWidth > 0) {
        hasFitRef.current = true;
        fitToScreen();
      } else {
        render();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [fitToScreen, render]);

  // Re-render whenever the "settled" (post-gesture) props change.
  useEffect(() => {
    render();
  }, [
    render,
    props.elements,
    props.selectedIds,
    props.tool,
    props.defaultStyle,
    props.snapToGrid,
    props.showGrid,
    props.editingTextId,
    props.pageWidth,
    props.pageHeight,
    props.pageBackground,
  ]);

  // Space bar = temporary pan tool, like Figma/Photoshop.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spaceHeldRef.current) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        spaceHeldRef.current = true;
        if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
        if (canvasRef.current) canvasRef.current.style.cursor = "";
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Non-passive wheel listener so we can preventDefault (trackpad pinch arrives as ctrl+wheel).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (e.ctrlKey || e.metaKey) {
        zoomAround(screenPoint, cameraRef.current.zoom * Math.exp(-e.deltaY * 0.01));
      } else {
        cameraRef.current = {
          ...cameraRef.current,
          offsetX: cameraRef.current.offsetX - e.deltaX,
          offsetY: cameraRef.current.offsetY - e.deltaY,
        };
        render();
        emitCamera();
      }
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [render, zoomAround, emitCamera]);

  const getScreenPoint = useCallback((e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const getWorldPoint = useCallback(
    (e: React.PointerEvent): Point => screenToWorld(getScreenPoint(e), cameraRef.current),
    [getScreenPoint],
  );

  const snapPoint = useCallback((p: Point): Point => {
    if (!snapRef.current) return p;
    return { x: snapValue(p.x, GRID_SIZE), y: snapValue(p.y, GRID_SIZE) };
  }, []);

  const finishGesture = useCallback(
    (commitChange: boolean) => {
      if (commitChange && draftListRef.current) {
        const finalList = draftListRef.current;
        props.setElements(() => finalList);
        props.commit();
      }
      interactionRef.current = null;
      draftListRef.current = null;
      newDraftRef.current = null;
      marqueeRef.current = null;
      erasedIdsRef.current = new Set();
      lastErasePointRef.current = null;
      render();
    },
    [render, props],
  );

  const finishNewElement = useCallback(
    (discard: boolean) => {
      const draft = newDraftRef.current;
      newDraftRef.current = null;
      interactionRef.current = null;
      if (draft && !discard) {
        props.setElements((prev) => [...prev, draft]);
        props.commit();
        props.setSelectedIds(new Set([draft.id]));
        if (toolRef.current !== "pen") props.onToolChange("select");
      }
      render();
    },
    [render, props],
  );

  const beginPan = useCallback((screenPoint: Point) => {
    interactionRef.current = { mode: "pan", lastScreen: screenPoint };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Prevent the browser's native mousedown focus-stealing: without this, focusing the
      // text-edit textarea from React state (mounted moments later) gets blurred right back
      // out by the browser's default focus handling for the non-focusable canvas.
      e.preventDefault();
      canvasRef.current?.setPointerCapture(e.pointerId);
      const screenPoint = getScreenPoint(e);
      pointersRef.current.set(e.pointerId, screenPoint);

      if (pointersRef.current.size === 2) {
        interactionRef.current = null;
        newDraftRef.current = null;
        draftListRef.current = null;
        const pts = Array.from(pointersRef.current.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        interactionRef.current = { mode: "pinch", startDist: dist, startMid: mid, startCamera: { ...cameraRef.current } };
        return;
      }
      if (pointersRef.current.size > 2) return;

      const tool = toolRef.current;
      const wp = getWorldPoint(e);

      if (spaceHeldRef.current || tool === "pan" || e.button === 1) {
        beginPan(screenPoint);
        if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
        return;
      }
      if (e.button !== 0 && e.pointerType === "mouse") return;

      if (tool === "select") {
        const selected = selectedIdsRef.current;
        if (selected.size === 1) {
          const el = elementsRef.current.find((x) => selected.has(x.id));
          if (el) {
            const b = getElementBounds(el);
            const handle = hitHandle(b, wp, cameraRef.current.zoom);
            if (handle) {
              interactionRef.current = { mode: "resize", handle, id: el.id, original: el, originalBounds: b };
              draftListRef.current = [...elementsRef.current];
              return;
            }
          }
        }

        const tolerance = HIT_TOLERANCE_PX / cameraRef.current.zoom;
        let hit: DrewElement | null = null;
        for (let i = elementsRef.current.length - 1; i >= 0; i--) {
          if (hitTestElement(elementsRef.current[i], wp, tolerance)) {
            hit = elementsRef.current[i];
            break;
          }
        }

        if (hit) {
          const nextSelected = new Set(selected);
          if (e.shiftKey) {
            if (nextSelected.has(hit.id)) nextSelected.delete(hit.id);
            else nextSelected.add(hit.id);
            props.setSelectedIds(nextSelected);
            return;
          }
          if (!nextSelected.has(hit.id)) {
            nextSelected.clear();
            nextSelected.add(hit.id);
            props.setSelectedIds(nextSelected);
          }
          const originals = new Map<string, DrewElement>();
          for (const el of elementsRef.current) if (nextSelected.has(el.id)) originals.set(el.id, el);
          interactionRef.current = { mode: "move", startWorld: wp, originals };
          draftListRef.current = [...elementsRef.current];
          return;
        }

        if (!e.shiftKey) props.setSelectedIds(new Set());
        interactionRef.current = { mode: "marquee", startWorld: wp };
        marqueeRef.current = { x: wp.x, y: wp.y, width: 0, height: 0 };
        render();
        return;
      }

      if (tool === "eraser") {
        interactionRef.current = { mode: "erase" };
        erasedIdsRef.current = new Set();
        lastErasePointRef.current = wp;
        const tolerance = HIT_TOLERANCE_PX / cameraRef.current.zoom;
        const hits = elementsRef.current.filter((el) => hitTestElement(el, wp, tolerance));
        if (hits.length > 0) {
          for (const el of hits) erasedIdsRef.current.add(el.id);
          draftListRef.current = elementsRef.current.filter((el) => !erasedIdsRef.current.has(el.id));
          render();
        } else {
          draftListRef.current = [...elementsRef.current];
        }
        return;
      }

      if (tool === "text") {
        const id = makeId();
        const style = defaultStyleRef.current;
        const el: DrewElement = {
          id,
          type: "text",
          x: wp.x,
          y: wp.y,
          width: 220,
          height: 28,
          text: "",
          fontSize: 20,
          fontFamily: "sans",
          align: "left",
          strokeColor: style.strokeColor,
          strokeWidth: 0,
          strokeStyle: "solid",
          fill: "transparent",
          opacity: style.opacity,
        };
        props.setElements((prev) => [...prev, el]);
        props.commit();
        props.setSelectedIds(new Set([id]));
        props.onStartTextEdit(id);
        props.onToolChange("select");
        return;
      }

      const style = defaultStyleRef.current;
      if (tool === "pen") {
        interactionRef.current = { mode: "draw-freehand" };
        newDraftRef.current = {
          id: makeId(),
          type: "freehand",
          points: [wp],
          strokeColor: style.strokeColor,
          strokeWidth: style.strokeWidth,
          strokeStyle: style.strokeStyle,
          fill: "transparent",
          opacity: style.opacity,
        };
        render();
        return;
      }

      if (tool === "line" || tool === "arrow") {
        interactionRef.current = { mode: "draw-shape", startWorld: wp };
        newDraftRef.current = {
          id: makeId(),
          type: tool,
          points: [wp, wp],
          strokeColor: style.strokeColor,
          strokeWidth: style.strokeWidth,
          strokeStyle: style.strokeStyle,
          fill: "transparent",
          opacity: style.opacity,
        };
        render();
        return;
      }

      if (tool === "rectangle" || tool === "ellipse") {
        interactionRef.current = { mode: "draw-shape", startWorld: wp };
        const base = {
          id: makeId(),
          x: wp.x,
          y: wp.y,
          width: 0,
          height: 0,
          strokeColor: style.strokeColor,
          strokeWidth: style.strokeWidth,
          strokeStyle: style.strokeStyle,
          fill: style.fill,
          opacity: style.opacity,
        };
        newDraftRef.current =
          tool === "rectangle" ? { ...base, type: "rectangle", cornerRadius: 0 } : { ...base, type: "ellipse" };
        render();
        return;
      }
    },
    [getScreenPoint, getWorldPoint, beginPan, render, props],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const screenPoint = getScreenPoint(e);
      if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, screenPoint);
      const interaction = interactionRef.current;
      if (!interaction) {
        // Idle hover: show resize-handle cursor when applicable.
        if (toolRef.current === "select" && selectedIdsRef.current.size === 1 && canvasRef.current) {
          const wp = getWorldPoint(e);
          const el = elementsRef.current.find((x) => selectedIdsRef.current.has(x.id));
          if (el) {
            const handle = hitHandle(getElementBounds(el), wp, cameraRef.current.zoom);
            canvasRef.current.style.cursor = handle ? HANDLE_CURSORS[handle] : "";
          }
        }
        return;
      }

      if (interaction.mode === "pinch") {
        if (pointersRef.current.size < 2) return;
        const pts = Array.from(pointersRef.current.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        const ratio = dist / Math.max(interaction.startDist, 1);
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, interaction.startCamera.zoom * ratio));
        const worldAtStart = screenToWorld(interaction.startMid, interaction.startCamera);
        cameraRef.current = {
          zoom: newZoom,
          offsetX: mid.x - worldAtStart.x * newZoom,
          offsetY: mid.y - worldAtStart.y * newZoom,
        };
        render();
        emitCamera();
        return;
      }

      if (interaction.mode === "pan") {
        const dx = screenPoint.x - interaction.lastScreen.x;
        const dy = screenPoint.y - interaction.lastScreen.y;
        cameraRef.current = { ...cameraRef.current, offsetX: cameraRef.current.offsetX + dx, offsetY: cameraRef.current.offsetY + dy };
        interactionRef.current = { mode: "pan", lastScreen: screenPoint };
        render();
        emitCamera();
        return;
      }

      const wp = getWorldPoint(e);

      if (interaction.mode === "marquee") {
        marqueeRef.current = normalizeBox(interaction.startWorld.x, interaction.startWorld.y, wp.x, wp.y);
        render();
        return;
      }

      if (interaction.mode === "move") {
        const snapped = snapPoint(wp);
        const startSnapped = snapPoint(interaction.startWorld);
        const dx = snapped.x - startSnapped.x;
        const dy = snapped.y - startSnapped.y;
        draftListRef.current = elementsRef.current.map((el) => {
          const original = interaction.originals.get(el.id);
          return original ? translateElement(original, dx, dy) : el;
        });
        render();
        return;
      }

      if (interaction.mode === "resize") {
        const target = snapPoint(wp);
        const newBounds = computeResizedBounds(interaction.originalBounds, interaction.handle, target, e.shiftKey);
        const newEl = resizeElementTo(interaction.original, interaction.originalBounds, newBounds);
        draftListRef.current = elementsRef.current.map((el) => (el.id === interaction.id ? newEl : el));
        render();
        return;
      }

      if (interaction.mode === "erase") {
        const tolerance = HIT_TOLERANCE_PX / cameraRef.current.zoom;
        const current = draftListRef.current ?? elementsRef.current;
        const from = lastErasePointRef.current ?? wp;
        lastErasePointRef.current = wp;
        // Sample along the movement segment too, so a fast drag can't skip over a thin
        // target that never lands exactly on a sampled pointermove position.
        const dist = Math.hypot(wp.x - from.x, wp.y - from.y);
        const steps = Math.min(24, Math.max(1, Math.ceil(dist / Math.max(tolerance, 1))));
        const hitIds = new Set<string>();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const p = { x: from.x + (wp.x - from.x) * t, y: from.y + (wp.y - from.y) * t };
          for (const el of current) {
            if (!hitIds.has(el.id) && hitTestElement(el, p, tolerance)) hitIds.add(el.id);
          }
        }
        if (hitIds.size > 0) {
          for (const id of hitIds) erasedIdsRef.current.add(id);
          draftListRef.current = current.filter((el) => !hitIds.has(el.id));
          render();
        }
        return;
      }

      if (interaction.mode === "draw-freehand" && newDraftRef.current?.type === "freehand") {
        newDraftRef.current = { ...newDraftRef.current, points: [...newDraftRef.current.points, wp] };
        render();
        return;
      }

      if (interaction.mode === "draw-shape" && newDraftRef.current) {
        const draft = newDraftRef.current;
        if (draft.type === "line" || draft.type === "arrow") {
          const end = constrainDragPoint("line", interaction.startWorld, snapPoint(wp), e.shiftKey);
          newDraftRef.current = { ...draft, points: [interaction.startWorld, end] };
        } else if (draft.type === "rectangle" || draft.type === "ellipse") {
          const end = constrainDragPoint("box", interaction.startWorld, snapPoint(wp), e.shiftKey);
          const b = normalizeBox(interaction.startWorld.x, interaction.startWorld.y, end.x, end.y);
          newDraftRef.current = { ...draft, ...b };
        }
        render();
      }
    },
    [getScreenPoint, getWorldPoint, snapPoint, render, emitCamera],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      const interaction = interactionRef.current;
      if (!interaction) return;

      if (interaction.mode === "pinch" || (interaction.mode === "pan" && pointersRef.current.size > 0)) {
        if (pointersRef.current.size < 2) interactionRef.current = null;
        return;
      }
      if (interaction.mode === "pan") {
        interactionRef.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = spaceHeldRef.current ? "grab" : "";
        return;
      }

      if (interaction.mode === "marquee") {
        const box = marqueeRef.current;
        interactionRef.current = null;
        marqueeRef.current = null;
        if (box && (box.width > 2 || box.height > 2)) {
          const hits = elementsRef.current.filter((el) => boundsIntersect(getElementBounds(el), box));
          if (hits.length > 0) {
            const next = e.shiftKey ? new Set(selectedIdsRef.current) : new Set<string>();
            for (const el of hits) next.add(el.id);
            props.setSelectedIds(next);
          }
        }
        render();
        return;
      }

      if (interaction.mode === "move" || interaction.mode === "resize") {
        finishGesture(true);
        return;
      }

      if (interaction.mode === "erase") {
        finishGesture(erasedIdsRef.current.size > 0);
        return;
      }

      if (interaction.mode === "draw-freehand") {
        finishNewElement(false);
        return;
      }

      if (interaction.mode === "draw-shape") {
        const draft = newDraftRef.current;
        let discard = false;
        if (draft && (draft.type === "line" || draft.type === "arrow")) {
          const [a, b] = draft.points;
          discard = Math.hypot(b.x - a.x, b.y - a.y) < 2 / cameraRef.current.zoom;
        } else if (draft && (draft.type === "rectangle" || draft.type === "ellipse")) {
          discard = draft.width < 2 / cameraRef.current.zoom || draft.height < 2 / cameraRef.current.zoom;
        }
        finishNewElement(discard);
      }
    },
    [render, finishGesture, finishNewElement, props],
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      if (pointersRef.current.size < 2) {
        finishGesture(false);
        if (canvasRef.current) canvasRef.current.style.cursor = spaceHeldRef.current ? "grab" : "";
      }
    },
    [finishGesture],
  );

  return (
    <div ref={containerRef} className="canvas-stage" data-tool={props.tool}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerCancel}
        onPointerCancel={handlePointerCancel}
      />
    </div>
  );
});

export default CanvasStage;
