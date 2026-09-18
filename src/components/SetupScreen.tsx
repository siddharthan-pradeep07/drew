import { useMemo, useState } from "react";
import type { PageConfig, Unit } from "../types";
import "./SetupScreen.css";

const PRESET_SIZES: PageConfig[] = [
  { width: 1920, height: 1080, unit: "px" },
  { width: 1080, height: 1080, unit: "px" },
  { width: 1080, height: 1920, unit: "px" },
  { width: 210, height: 297, unit: "mm" },
  { width: 297, height: 210, unit: "mm" },
  { width: 8.5, height: 11, unit: "in" },
];

const PRESET_LABELS = ["Desktop (16:9)", "Square", "Story / Reel", "A4 Portrait", "A4 Landscape", "US Letter"];

const PREVIEW_BASE = 120;

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
  onStart: (config: PageConfig) => void;
}

export default function SetupScreen({ onStart }: SetupScreenProps) {
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [unit, setUnit] = useState<Unit>("px");

  const mainPreview = useMemo(() => previewSize(width || 1, height || 1), [width, height]);

  return (
    <div className="setup-screen">
      <header className="setup-header">
        <h1>drew</h1>
        <p className="setup-subtitle">
          A clean, fast canvas for sketching, marking up ideas and quick visual notes — start from a template
          size or set your own.
        </p>
      </header>

      <section className="custom-size">
        <h2>Custom size</h2>
        <div className="size-inputs">
          <label>
            Width
            <input
              type="number"
              min={1}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value) || 0)}
            />
          </label>

          <label>
            Height
            <input
              type="number"
              min={1}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value) || 0)}
            />
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
          <div
            className="preview-box main"
            style={{ width: `${mainPreview.w}px`, height: `${mainPreview.h}px` }}
          />
          <div className="preview-label">
            {width}
            {unit} × {height}
            {unit}
          </div>
        </div>

        <button
          className="start-btn"
          disabled={!width || !height}
          onClick={() => onStart({ width, height, unit })}
        >
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
                onClick={() => onStart(s)}
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
