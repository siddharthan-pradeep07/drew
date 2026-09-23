import type { DrewElement, PageConfig } from "../types";

const KEY = "drew:document:v1";

export interface SavedDocument {
  pageConfig: PageConfig;
  elements: DrewElement[];
  savedAt: number;
}

export function loadDocument(): SavedDocument | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedDocument;
  } catch {
    return null;
  }
}

export function saveDocument(pageConfig: PageConfig, elements: DrewElement[]) {
  try {
    const doc: SavedDocument = { pageConfig, elements, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(doc));
  } catch {
    // Storage full/unavailable (private browsing etc.) — silently skip autosave.
  }
}

export function clearDocument() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, ms: number): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
