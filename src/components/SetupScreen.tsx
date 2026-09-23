import { useMemo, useState } from "react";
import type { DrewElement, PageConfig, Unit } from "../types";
import type { SavedDocument } from "../lib/storage";
import "./SetupScreen.css";

const PRESET_SIZES: Omit<PageConfig, "background">[] = [
  { width: 1920, height: 1080, unit: "px" },
  { width: 1080, height: 1080, unit: "px" },
  { width: 1080, height: 1920, unit: "px" },
  { width: 210, height: 297, unit: "mm" },
  { width: 297, height: 210, unit: "mm" },
  { width: 8.5, height: 11, unit: "in" },
];

const PRESET_LABELS = ["Desktop (16:9)", "Square", "Story / Reel", "A4 Portrait", "A4 Landscape", "US Letter"];

const PREVIEW_BASE = 108;

function previewSize(width: number, height: number) {
  const ratio = width / height || 1;
  let w = PREVIEW_BASE;
  let h = w / ratio;
  if (h > PREVIEW_BASE) {
    h = PREVIEW_BASE;
    w = h * ratio;
  }
  return { w, h };
}

interface SetupScreenProps {
  onStart: (config: PageConfig, elements?: DrewElement[]) => void;
  savedDocument: SavedDocument | null;
  onDiscardSaved: () => void;
}

export default function SetupScreen({ onStart, savedDocument, onDiscardSaved }: SetupScreenProps) {
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [unit, setUnit] = useState<Unit>("px");

  const mainPreview = useMemo(() => previewSize(width || 1, height || 1), [width, height]);

  return (
    <div className="setup-screen">
      <header className="setup-header">
        <h1>drew</h1>
        <p className="setup-subtitle">
          A precise, fast canvas for sketching, diagramming and marking up ideas — shapes, text, layers and
          full undo history, built for keyboard and mouse alike.
        </p>
      </header>

      {savedDocument && (
        <section className="resume-card">
          <div className="resume-info">
            <div className="resume-title">Continue where you left off</div>
            <div className="resume-meta">
              {savedDocument.elements.length} object{savedDocument.elements.length === 1 ? "" : "s"} · saved{" "}
              {new Date(savedDocument.savedAt).toLocaleString()}
            </div>
          </div>
          <div className="resume-actions">
            <button className="ghost-btn" onClick={onDiscardSaved}>
              Discard
            </button>
            <button className="start-btn compact" onClick={() => onStart(savedDocument.pageConfig, savedDocument.elements)}>
              Resume
            </button>
          </div>
        </section>
      )}

      <section className="custom-size">
        <h2>Custom size</h2>
        <div className="size-inputs">
          <label>
            Width
            <input type="number" min={1} value={width} onChange={(e) => setWidth(Number(e.target.value) || 0)} />
          </label>

          <label>
            Height
            <input type="number" min={1} value={height} onChange={(e) => setHeight(Number(e.target.value) || 0)} />
          </label>

          <label>
            Unit
            <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              <option value="px">px</option>
              <option value="mm">mm</option>
              <option value="in">in</option>
            </select>
          </label>
        </div>

        <div className="main-preview">
          <div className="preview-box main" style={{ width: `${mainPreview.w}px`, height: `${mainPreview.h}px` }} />
          <div className="preview-label">
            {width}
            {unit} × {height}
            {unit}
          </div>
        </div>

        <button className="start-btn" disabled={!width || !height} onClick={() => onStart({ width, height, unit, background: "#ffffff" })}>
          Start drawing
        </button>
      </section>

      <section className="samples">
        <h2>Or pick a template size</h2>
        <p className="samples-intro">Tap a size to jump straight into the canvas.</p>

        <div className="sample-grid">
          {PRESET_SIZES.map((s, i) => {
            const p = previewSize(s.width, s.height);
            return (
              <button
                key={PRESET_LABELS[i]}
                className="sample-card"
                onClick={() => onStart({ ...s, background: "#ffffff" })}
                title={`${s.width} ${s.unit} × ${s.height} ${s.unit}`}
              >
                <div className="preview-box" style={{ width: `${p.w}px`, height: `${p.h}px` }} />
                <div className="sample-label">{PRESET_LABELS[i]}</div>
                <div className="sample-dims">
                  {s.width} {s.unit} × {s.height} {s.unit}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
