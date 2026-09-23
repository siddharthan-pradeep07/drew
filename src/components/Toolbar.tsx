import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { DownloadFormat, Tool } from "../types";
import {
  ArrowLeftIcon,
  ArrowToolIcon,
  CursorIcon,
  DownloadIcon,
  EllipseIcon,
  EraserIcon,
  HandIcon,
  HelpIcon,
  ImagePlusIcon,
  LayersIcon,
  LineToolIcon,
  PenIcon,
  RectangleIcon,
  RedoIcon,
  SlidersIcon,
  TextToolIcon,
  UndoIcon,
} from "./Icons";
import "./Toolbar.css";

const TOOLS: { id: Tool; label: string; shortcut: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: "select", label: "Select", shortcut: "V", icon: CursorIcon },
  { id: "pan", label: "Pan", shortcut: "H", icon: HandIcon },
  { id: "pen", label: "Pen", shortcut: "P", icon: PenIcon },
  { id: "line", label: "Line", shortcut: "L", icon: LineToolIcon },
  { id: "arrow", label: "Arrow", shortcut: "A", icon: ArrowToolIcon },
  { id: "rectangle", label: "Rectangle", shortcut: "R", icon: RectangleIcon },
  { id: "ellipse", label: "Ellipse", shortcut: "O", icon: EllipseIcon },
  { id: "text", label: "Text", shortcut: "T", icon: TextToolIcon },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: EraserIcon },
];

interface ToolbarProps {
  pageLabel: string;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onInsertFile: (file: File) => void;
  onDownload: (format: DownloadFormat) => void;
  onBack: () => void;
  layersOpen: boolean;
  onToggleLayers: () => void;
  onToggleInspector: () => void;
  onShowHelp: () => void;
  saveLabel: string;
}

export default function Toolbar({
  pageLabel,
  tool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onInsertFile,
  onDownload,
  onBack,
  layersOpen,
  onToggleLayers,
  onToggleInspector,
  onShowHelp,
  saveLabel,
}: ToolbarProps) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!downloadOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) setDownloadOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [downloadOpen]);

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Back to page setup" title="Back">
          <ArrowLeftIcon />
        </button>
        <button className={`icon-btn ${layersOpen ? "active" : ""}`} onClick={onToggleLayers} aria-label="Toggle layers" title="Layers">
          <LayersIcon />
        </button>
        <span className="page-label">{pageLabel}</span>
        <span className="save-label">{saveLabel}</span>
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
            <button className="icon-btn" onClick={() => setDownloadOpen((o) => !o)} aria-label="Download drawing" title="Download">
              <DownloadIcon />
            </button>
            {downloadOpen && (
              <div className="dropdown-menu" role="menu">
                {(["png", "jpeg", "webp", "svg"] as DownloadFormat[]).map((format) => (
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

          <button className="icon-btn" onClick={onShowHelp} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
            <HelpIcon />
          </button>
        </div>

        <button className="icon-btn style-toggle mobile-only" onClick={onToggleInspector} aria-label="Toggle style panel" title="Style">
          <SlidersIcon />
        </button>
      </header>

      <nav className="tool-rail">
        {TOOLS.map(({ id, label, shortcut, icon: Icon }) => (
          <button
            key={id}
            className={`tool-btn ${tool === id ? "active" : ""}`}
            onClick={() => onToolChange(id)}
            aria-label={label}
            aria-pressed={tool === id}
            title={`${label} (${shortcut})`}
          >
            <Icon size={19} />
            <span className="tool-label">{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
