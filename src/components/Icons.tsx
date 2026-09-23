// Small hand-rolled line icons (24x24, stroke = currentColor) so the app has no
// external icon-font/SVG-sprite dependency.

export interface IconProps {
  size?: number;
  className?: string;
}

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function PenIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function EraserIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l9.6-9.6a1 1 0 0 1 1.4 0l6.6 6.6a1 1 0 0 1 0 1.4L13 21" />
      <path d="M6 13 12.5 19.5" />
      <path d="M7 21h13" />
    </svg>
  );
}

export function LineToolIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="5" cy="19" r="1.6" />
      <circle cx="19" cy="5" r="1.6" />
      <path d="m6.4 17.6 11.2-11.2" />
    </svg>
  );
}

export function RectangleIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="4" y="6" width="16" height="12" rx="1.5" />
    </svg>
  );
}

export function EllipseIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <ellipse cx="12" cy="12" rx="8" ry="6" />
    </svg>
  );
}

export function UndoIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

export function RedoIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </svg>
  );
}

export function TrashIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function ImagePlusIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <circle cx="8" cy="8" r="1.4" />
      <path d="m4 15 3.5-3.5a1.5 1.5 0 0 1 2.1 0L14 15" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}

export function DownloadIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 19.5h16" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function SlidersIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="7" cy="12" r="2" />
      <circle cx="15" cy="18" r="2" />
    </svg>
  );
}

export function CloseIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function PlusIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MinusIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function CursorIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M5 3 19 10.5 12.5 12.5 10.5 19Z" />
    </svg>
  );
}

export function HandIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M8 11.5V5a1.5 1.5 0 0 1 3 0v5.5" />
      <path d="M11 10V4a1.5 1.5 0 0 1 3 0v6.5" />
      <path d="M14 10.5V5a1.5 1.5 0 0 1 3 0v8" />
      <path d="M8 11.5 6.4 10a1.4 1.4 0 0 0-2 2l3.2 5.2A5 5 0 0 0 11.8 20H14a5 5 0 0 0 5-5v-4.5" />
    </svg>
  );
}

export function TextToolIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M5 5h14M12 5v14" />
    </svg>
  );
}

export function ArrowToolIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M5 19 19 5" />
      <path d="M9 5h10v10" />
    </svg>
  );
}

export function LayersIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="m12 3 8 4.5-8 4.5-8-4.5Z" />
      <path d="m4 12 8 4.5 8-4.5" />
      <path d="m4 16.5 8 4.5 8-4.5" />
    </svg>
  );
}

export function DuplicateIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="8" y="8" width="12" height="12" rx="1.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </svg>
  );
}

export function BringFrontIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="7" y="7" width="12" height="12" rx="1.5" />
      <path d="M5 14.5H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

export function SendBackIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="5" y="5" width="12" height="12" rx="1.5" />
      <path d="M19 9.5h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-1" />
    </svg>
  );
}

export function GridIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 9h16M4 15h16M9 4v16M15 4v16" />
    </svg>
  );
}

export function HelpIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.2a2.4 2.4 0 1 1 3.4 2.2c-.9.5-1.4.9-1.4 2" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AlignLeftIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 5h16M4 10h10M4 15h14M4 20h8" />
    </svg>
  );
}

export function AlignCenterIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 5h16M7 10h10M5 15h14M8 20h8" />
    </svg>
  );
}

export function AlignRightIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 5h16M10 10h10M6 15h14M12 20h8" />
    </svg>
  );
}

export function ChevronUpIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

export function LockIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="5" y="10" width="14" height="10" rx="1.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function SaveIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M5 4h11l3 3v13H5Z" />
      <path d="M8 4v5h8V4M8 14h8v6H8Z" />
    </svg>
  );
}
