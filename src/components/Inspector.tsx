import type { DrewElement, ElementStyle, PageConfig, StrokeStyle, Unit } from "../types";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BringFrontIcon,
  CloseIcon,
  DuplicateIcon,
  SendBackIcon,
  TrashIcon,
} from "./Icons";
import "./Inspector.css";

const PRESET_COLORS = ["#000000", "#ffffff", "#e0312f", "#e8590c", "#f2b705", "#1a7f37", "#0969da", "#6741d9"];
const FILL_PRESETS = ["transparent", "#000000", "#ffffff", "#f5c6c6", "#ffd8a8", "#fff3bf", "#b2f2bb", "#a5d8ff", "#d0bfff"];

const STROKE_STYLES: { id: StrokeStyle; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "dashed", label: "Dashed" },
  { id: "dotted", label: "Dotted" },
];

interface InspectorProps {
  pageConfig: PageConfig;
  onPageResize: (width: number, height: number, unit: Unit) => void;
  onBackgroundChange: (color: string) => void;
  showGrid: boolean;
  onShowGridChange: (v: boolean) => void;
  snapToGrid: boolean;
  onSnapToGridChange: (v: boolean) => void;
  style: ElementStyle;
  onStyleChange: (patch: Partial<ElementStyle>) => void;
  selectedElements: DrewElement[];
  onCornerRadiusChange: (value: number) => void;
  onFontSizeChange: (value: number) => void;
  onFontFamilyChange: (value: "sans" | "mono") => void;
  onAlignChange: (value: "left" | "center" | "right") => void;
  onGeometryChange: (id: string, patch: { x?: number; y?: number; width?: number; height?: number }) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: (dir: "front" | "back" | "forward" | "backward") => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Inspector({
  pageConfig,
  onPageResize,
  onBackgroundChange,
  showGrid,
  onShowGridChange,
  snapToGrid,
  onSnapToGridChange,
  style,
  onStyleChange,
  selectedElements,
  onCornerRadiusChange,
  onFontSizeChange,
  onFontFamilyChange,
  onAlignChange,
  onGeometryChange,
  onDuplicate,
  onDelete,
  onReorder,
  mobileOpen,
  onCloseMobile,
}: InspectorProps) {
  const hasSelection = selectedElements.length > 0;
  const single = selectedElements.length === 1 ? selectedElements[0] : null;
  const fillApplicable = !hasSelection || selectedElements.some((el) => el.type === "rectangle" || el.type === "ellipse");
  const rectSelected = selectedElements.some((el) => el.type === "rectangle");
  const textSelected = selectedElements.some((el) => el.type === "text");
  const textEl = selectedElements.find((el): el is Extract<DrewElement, { type: "text" }> => el.type === "text");
  const geometryEl = single && (single.type === "rectangle" || single.type === "ellipse" || single.type === "text" || single.type === "image") ? single : null;

  return (
    <aside className={`inspector ${mobileOpen ? "open" : ""}`}>
      <div className="inspector-mobile-header mobile-only">
        <span>{hasSelection ? "Style" : "Canvas"}</span>
        <button className="icon-btn small" onClick={onCloseMobile} aria-label="Close">
          <CloseIcon size={15} />
        </button>
      </div>
      {!hasSelection && (
        <>
          <div className="inspector-section">
            <div className="inspector-title">Page</div>
            <div className="inspector-row">
              <label className="field">
                <span>Width</span>
                <input
                  type="number"
                  min={1}
                  value={pageConfig.width}
                  onChange={(e) => onPageResize(Number(e.target.value) || pageConfig.width, pageConfig.height, pageConfig.unit)}
                />
              </label>
              <label className="field">
                <span>Height</span>
                <input
                  type="number"
                  min={1}
                  value={pageConfig.height}
                  onChange={(e) => onPageResize(pageConfig.width, Number(e.target.value) || pageConfig.height, pageConfig.unit)}
                />
              </label>
              <label className="field">
                <span>Unit</span>
                <select value={pageConfig.unit} onChange={(e) => onPageResize(pageConfig.width, pageConfig.height, e.target.value as Unit)}>
                  <option value="px">px</option>
                  <option value="mm">mm</option>
                  <option value="in">in</option>
                </select>
              </label>
            </div>

            <div className="inspector-label-row">Background</div>
            <ColorRow value={pageConfig.background} onChange={onBackgroundChange} presets={["#ffffff", "#000000", "#f1f0f0", "#0e0f14"]} allowTransparent={false} />

            <label className="toggle-row">
              <span>Show grid</span>
              <input type="checkbox" checked={showGrid} onChange={(e) => onShowGridChange(e.target.checked)} />
            </label>
            <label className="toggle-row">
              <span>Snap to grid</span>
              <input type="checkbox" checked={snapToGrid} onChange={(e) => onSnapToGridChange(e.target.checked)} />
            </label>
          </div>
          <div className="inspector-divider" />
        </>
      )}

      <div className="inspector-section">
        <div className="inspector-title">{hasSelection ? "Style" : "Default style"}</div>

        <div className="inspector-label-row">Stroke</div>
        <ColorRow value={style.strokeColor} onChange={(c) => onStyleChange({ strokeColor: c })} presets={PRESET_COLORS} allowTransparent={false} />

        <div className="inspector-label-row">
          Stroke width <span className="value">{style.strokeWidth}px</span>
        </div>
        <input
          type="range"
          min={1}
          max={40}
          value={style.strokeWidth}
          onChange={(e) => onStyleChange({ strokeWidth: Number(e.target.value) })}
        />

        <div className="inspector-label-row">Stroke style</div>
        <div className="segmented">
          {STROKE_STYLES.map((s) => (
            <button key={s.id} className={style.strokeStyle === s.id ? "active" : ""} onClick={() => onStyleChange({ strokeStyle: s.id })}>
              {s.label}
            </button>
          ))}
        </div>

        {fillApplicable && (
          <>
            <div className="inspector-label-row">Fill</div>
            <ColorRow value={style.fill} onChange={(c) => onStyleChange({ fill: c })} presets={FILL_PRESETS} allowTransparent />
          </>
        )}

        {rectSelected && (
          <>
            <div className="inspector-label-row">
              Corner radius <span className="value">{Math.round(single?.type === "rectangle" ? single.cornerRadius : 0)}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={80}
              value={single?.type === "rectangle" ? single.cornerRadius : 0}
              onChange={(e) => onCornerRadiusChange(Number(e.target.value))}
            />
          </>
        )}

        <div className="inspector-label-row">
          Opacity <span className="value">{Math.round(style.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={5}
          max={100}
          value={Math.round(style.opacity * 100)}
          onChange={(e) => onStyleChange({ opacity: Number(e.target.value) / 100 })}
        />
      </div>

      {textSelected && textEl && (
        <>
          <div className="inspector-divider" />
          <div className="inspector-section">
            <div className="inspector-title">Text</div>
            <div className="inspector-row">
              <label className="field">
                <span>Size</span>
                <input type="number" min={8} max={200} value={textEl.fontSize} onChange={(e) => onFontSizeChange(Number(e.target.value) || textEl.fontSize)} />
              </label>
              <label className="field">
                <span>Font</span>
                <select value={textEl.fontFamily} onChange={(e) => onFontFamilyChange(e.target.value as "sans" | "mono")}>
                  <option value="sans">Sans</option>
                  <option value="mono">Mono</option>
                </select>
              </label>
            </div>
            <div className="inspector-label-row">Align</div>
            <div className="segmented icon-segmented">
              <button className={textEl.align === "left" ? "active" : ""} onClick={() => onAlignChange("left")} aria-label="Align left">
                <AlignLeftIcon size={15} />
              </button>
              <button className={textEl.align === "center" ? "active" : ""} onClick={() => onAlignChange("center")} aria-label="Align center">
                <AlignCenterIcon size={15} />
              </button>
              <button className={textEl.align === "right" ? "active" : ""} onClick={() => onAlignChange("right")} aria-label="Align right">
                <AlignRightIcon size={15} />
              </button>
            </div>
          </div>
        </>
      )}

      {geometryEl && (
        <>
          <div className="inspector-divider" />
          <div className="inspector-section">
            <div className="inspector-title">Position &amp; size</div>
            <div className="inspector-row">
              <label className="field">
                <span>X</span>
                <input type="number" value={Math.round(geometryEl.x)} onChange={(e) => onGeometryChange(geometryEl.id, { x: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span>Y</span>
                <input type="number" value={Math.round(geometryEl.y)} onChange={(e) => onGeometryChange(geometryEl.id, { y: Number(e.target.value) })} />
              </label>
            </div>
            <div className="inspector-row">
              <label className="field">
                <span>W</span>
                <input type="number" min={1} value={Math.round(geometryEl.width)} onChange={(e) => onGeometryChange(geometryEl.id, { width: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span>H</span>
                <input type="number" min={1} value={Math.round(geometryEl.height)} onChange={(e) => onGeometryChange(geometryEl.id, { height: Number(e.target.value) })} />
              </label>
            </div>
          </div>
        </>
      )}

      {hasSelection && (
        <>
          <div className="inspector-divider" />
          <div className="inspector-section">
            <div className="inspector-title">Arrange</div>
            <div className="action-grid">
              <button onClick={onDuplicate} title="Duplicate (Ctrl+D)">
                <DuplicateIcon size={17} />
                <span>Duplicate</span>
              </button>
              <button onClick={() => onReorder("front")} title="Bring to front">
                <BringFrontIcon size={17} />
                <span>To front</span>
              </button>
              <button onClick={() => onReorder("back")} title="Send to back">
                <SendBackIcon size={17} />
                <span>To back</span>
              </button>
              <button className="danger" onClick={onDelete} title="Delete (Del)">
                <TrashIcon size={17} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

function ColorRow({
  value,
  onChange,
  presets,
  allowTransparent,
}: {
  value: string;
  onChange: (color: string) => void;
  presets: string[];
  allowTransparent: boolean;
}) {
  return (
    <div className="swatch-grid">
      {allowTransparent && (
        <button
          className={`swatch swatch-transparent ${value === "transparent" ? "active" : ""}`}
          onClick={() => onChange("transparent")}
          aria-label="Transparent"
        />
      )}
      {presets.map((c) => (
        <button key={c} className={`swatch ${value === c ? "active" : ""}`} style={{ background: c }} onClick={() => onChange(c)} aria-label={`Colour ${c}`} />
      ))}
      <input className="swatch-custom" type="color" value={value === "transparent" ? "#000000" : value} onChange={(e) => onChange(e.target.value)} aria-label="Custom colour" />
    </div>
  );
}
