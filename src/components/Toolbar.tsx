import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { DownloadFormat, DrawStyle, StrokeStyle, Tool } from "../types";
import {
  ArrowLeftIcon,
  CloseIcon,
  DownloadIcon,
  EllipseIcon,
  EraserIcon,
  ImagePlusIcon,
  LineToolIcon,
  PenIcon,
  RectangleIcon,
  RedoIcon,
  SlidersIcon,
  TrashIcon,
  UndoIcon,
} from "./Icons";
import "./Toolbar.css";

const TOOLS: { id: Tool; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: "pen", label: "Pen", icon: PenIcon },
  { id: "line", label: "Line", icon: LineToolIcon },
  { id: "rectangle", label: "Rectangle", icon: RectangleIcon },
  { id: "ellipse", label: "Ellipse", icon: EllipseIcon },
  { id: "eraser", label: "Eraser", icon: EraserIcon },
];

const PRESET_COLORS = [
  "#08060d",
  "#ffffff",
  "#e03131",
  "#f08c00",
  "#ffd43b",
  "#2f9e44",
  "#1971c2",
  "#7048e8",
  "#aa3bff",
  "#e64980",
];

const STROKE_STYLES: { id: StrokeStyle; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "dashed", label: "Dashed" },
  { id: "dotted", label: "Dotted" },
];

interface ToolbarProps {
  pageLabel: string;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  style: DrawStyle;
  onStyleChange: (patch: Partial<DrawStyle>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onInsertFile: (file: File) => void;
  onDownload: (format: DownloadFormat) => void;
  onBack: () => void;
}

export default function Toolbar({
  pageLabel,
  tool,
  onToolChange,
  style,
  onStyleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onInsertFile,
  onDownload,
  onBack,
}: ToolbarProps) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!downloadOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [downloadOpen]);

  const isEraser = tool === "eraser";

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Back to page setup" title="Back">
          <ArrowLeftIcon />
        </button>
        <span className="page-label">{pageLabel}</span>
        <div className="topbar-spacer" />

        <div className="topbar-group">
          <button className="icon-btn" disabled={!canUndo} onClick={onUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
            <UndoIcon />
          </button>
          <button className="icon-btn" disabled={!canRedo} onClick={onRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
            <RedoIcon />
          </button>
        </div>

        <div className="topbar-group">
          <button className="icon-btn" onClick={() => fileInputRef.current?.click()} aria-label="Insert image" title="Insert image">
            <ImagePlusIcon />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onInsertFile(file);
              e.target.value = "";
            }}
          />

          <div className="dropdown" ref={downloadRef}>
            <button
              className="icon-btn"
              onClick={() => setDownloadOpen((o) => !o)}
              aria-label="Download drawing"
              title="Download"
            >
              <DownloadIcon />
            </button>
            {downloadOpen && (
              <div className="dropdown-menu" role="menu">
                {(["png", "jpeg", "webp"] as DownloadFormat[]).map((format) => (
                  <button
                    key={format}
                    role="menuitem"
                    onClick={() => {
                      onDownload(format);
                      setDownloadOpen(false);
                    }}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="icon-btn danger" onClick={onClear} aria-label="Clear canvas" title="Clear canvas">
            <TrashIcon />
          </button>
        </div>

        <button
          className="icon-btn style-toggle"
          onClick={() => setStyleOpen((o) => !o)}
          aria-label="Toggle style options"
          aria-expanded={styleOpen}
          title="Style options"
        >
          <SlidersIcon />
        </button>
      </header>

      <nav className="tool-rail">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`tool-btn ${tool === id ? "active" : ""}`}
            onClick={() => onToolChange(id)}
            aria-label={label}
            aria-pressed={tool === id}
            title={label}
          >
            <Icon size={20} />
            <span className="tool-label">{label}</span>
          </button>
        ))}
      </nav>

      {styleOpen && <div className="style-backdrop" onClick={() => setStyleOpen(false)} />}

      <aside className={`style-panel ${styleOpen ? "open" : ""}`}>
        <div className="style-panel-header">
          <span>Style</span>
          <button className="icon-btn small" onClick={() => setStyleOpen(false)} aria-label="Close style panel">
            <CloseIcon size={16} />
          </button>
        </div>

        <div className={`style-section ${isEraser ? "disabled" : ""}`}>
          <div className="style-section-label">Color</div>
          <div className="swatch-grid">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className={`swatch ${style.color === c ? "active" : ""}`}
                style={{ background: c }}
                disabled={isEraser}
                onClick={() => onStyleChange({ color: c })}
                aria-label={`Colour ${c}`}
              />
            ))}
            <input
              className="swatch-custom"
              type="color"
              value={style.color}
              disabled={isEraser}
              onChange={(e) => onStyleChange({ color: e.target.value })}
              aria-label="Custom colour"
            />
          </div>
        </div>

        <div className="style-section">
          <div className="style-section-label">
            Stroke width <span className="style-value">{style.strokeWidth}px</span>
          </div>
          <input
            type="range"
            min={1}
            max={64}
            value={style.strokeWidth}
            onChange={(e) => onStyleChange({ strokeWidth: Number(e.target.value) })}
          />
        </div>

        <div className={`style-section ${isEraser ? "disabled" : ""}`}>
          <div className="style-section-label">Stroke style</div>
          <div className="segmented">
            {STROKE_STYLES.map((s) => (
              <button
                key={s.id}
                className={style.strokeStyle === s.id ? "active" : ""}
                disabled={isEraser}
                onClick={() => onStyleChange({ strokeStyle: s.id })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`style-section ${isEraser ? "disabled" : ""}`}>
          <div className="style-section-label">
            Opacity <span className="style-value">{Math.round(style.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            value={Math.round(style.opacity * 100)}
            disabled={isEraser}
            onChange={(e) => onStyleChange({ opacity: Number(e.target.value) / 100 })}
          />
        </div>
      </aside>
    </>
  );
}
