import type { ComponentType } from "react";
import type { DrewElement } from "../types";
import {
  ArrowToolIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  EllipseIcon,
  ImagePlusIcon,
  LineToolIcon,
  PenIcon,
  RectangleIcon,
  TextToolIcon,
  TrashIcon,
} from "./Icons";
import "./LayersPanel.css";

const TYPE_ICON: Record<DrewElement["type"], ComponentType<{ size?: number }>> = {
  freehand: PenIcon,
  line: LineToolIcon,
  arrow: ArrowToolIcon,
  rectangle: RectangleIcon,
  ellipse: EllipseIcon,
  text: TextToolIcon,
  image: ImagePlusIcon,
};

function labelFor(el: DrewElement, index: number): string {
  if (el.type === "text") return el.text.trim() ? el.text.trim().slice(0, 22) : "Text";
  const names: Record<DrewElement["type"], string> = {
    freehand: "Drawing",
    line: "Line",
    arrow: "Arrow",
    rectangle: "Rectangle",
    ellipse: "Ellipse",
    text: "Text",
    image: "Image",
  };
  return `${names[el.type]} ${index}`;
}

interface LayersPanelProps {
  elements: DrewElement[];
  selectedIds: Set<string>;
  onSelect: (id: string, additive: boolean) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: "forward" | "backward") => void;
  onClose: () => void;
}

export default function LayersPanel({ elements, selectedIds, onSelect, onDelete, onMove, onClose }: LayersPanelProps) {
  const frontToBack = [...elements].reverse();

  return (
    <div className="layers-panel">
      <div className="layers-header">
        <span>Layers</span>
        <button className="icon-btn small mobile-only" onClick={onClose} aria-label="Close layers">
          <CloseIcon size={15} />
        </button>
      </div>
      <div className="layers-list">
        {frontToBack.length === 0 && <div className="layers-empty">Nothing on the page yet</div>}
        {frontToBack.map((el, i) => {
          const Icon = TYPE_ICON[el.type];
          const selected = selectedIds.has(el.id);
          const originalIndex = elements.length - i;
          return (
            <div key={el.id} className={`layer-row ${selected ? "selected" : ""}`} onClick={(e) => onSelect(el.id, e.shiftKey)}>
              <Icon size={14} />
              <span className="layer-label">{labelFor(el, originalIndex)}</span>
              <div className="layer-actions">
                <button
                  aria-label="Move forward"
                  title="Move forward"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(el.id, "forward");
                  }}
                >
                  <ChevronUpIcon size={13} />
                </button>
                <button
                  aria-label="Move backward"
                  title="Move backward"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(el.id, "backward");
                  }}
                >
                  <ChevronDownIcon size={13} />
                </button>
                <button
                  aria-label="Delete layer"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(el.id);
                  }}
                >
                  <TrashIcon size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
