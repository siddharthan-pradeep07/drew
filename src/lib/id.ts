let counter = 0;

/** Short, collision-safe id — no external dependency needed. */
export function makeId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
