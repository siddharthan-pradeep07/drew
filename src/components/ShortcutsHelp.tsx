import { CloseIcon } from "./Icons";
import "./ShortcutsHelp.css";

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Tools",
    rows: [
      ["V", "Select"],
      ["H / Space-drag", "Pan"],
      ["P", "Pen"],
      ["L", "Line"],
      ["A", "Arrow"],
      ["R", "Rectangle"],
      ["O", "Ellipse"],
      ["T", "Text"],
      ["E", "Eraser"],
    ],
  },
  {
    title: "Editing",
    rows: [
      ["Ctrl / Cmd + Z", "Undo"],
      ["Ctrl / Cmd + Shift + Z", "Redo"],
      ["Ctrl / Cmd + D", "Duplicate selection"],
      ["Ctrl / Cmd + A", "Select all"],
      ["Ctrl / Cmd + C / V", "Copy / paste"],
      ["Delete / Backspace", "Delete selection"],
      ["Arrow keys", "Nudge selection (Shift = 10px)"],
      ["Shift while dragging", "Constrain line angle / square / circle"],
      ["[ / ]", "Decrease / increase stroke width"],
      ["Escape", "Deselect / cancel"],
    ],
  },
  {
    title: "Layers & view",
    rows: [
      ["Ctrl / Cmd + ] / [", "Bring forward / send backward"],
      ["Ctrl / Cmd + Shift + ] / [", "Bring to front / send to back"],
      ["Ctrl / Cmd + Scroll", "Zoom"],
      ["Ctrl / Cmd + 0", "Zoom to 100%"],
      ["Shift + 1", "Zoom to fit"],
    ],
  },
];

export default function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="shortcuts-backdrop" onClick={onClose}>
      <div className="shortcuts-panel" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <span>Keyboard shortcuts</span>
          <button className="icon-btn small" onClick={onClose} aria-label="Close">
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="shortcuts-body">
          {GROUPS.map((g) => (
            <div key={g.title} className="shortcuts-group">
              <div className="shortcuts-group-title">{g.title}</div>
              {g.rows.map(([key, desc]) => (
                <div key={desc} className="shortcuts-row">
                  <kbd>{key}</kbd>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
