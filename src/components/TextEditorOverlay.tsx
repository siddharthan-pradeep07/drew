import { useEffect, useRef } from "react";
import type { Camera, TextElement } from "../types";
import { worldToScreen } from "../lib/geometry";
import "./TextEditorOverlay.css";

interface TextEditorOverlayProps {
  element: TextElement;
  camera: Camera;
  onChange: (text: string) => void;
  onHeightChange: (worldHeight: number) => void;
  onCommit: () => void;
}

export default function TextEditorOverlay({ element, camera, onChange, onHeightChange, onCommit }: TextEditorOverlayProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    onHeightChange(el.scrollHeight / camera.zoom);
  };

  useEffect(resize, [element.text, camera.zoom, onHeightChange]);

  const screenPos = worldToScreen({ x: element.x, y: element.y }, camera);

  return (
    <textarea
      ref={ref}
      className="text-editor-overlay"
      value={element.text}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          onCommit();
        }
      }}
      style={{
        left: screenPos.x,
        top: screenPos.y,
        width: element.width * camera.zoom,
        fontSize: element.fontSize * camera.zoom,
        lineHeight: 1.3,
        color: element.strokeColor,
        textAlign: element.align,
        fontFamily: element.fontFamily === "mono" ? "var(--mono)" : "var(--sans)",
        opacity: element.opacity,
      }}
    />
  );
}
