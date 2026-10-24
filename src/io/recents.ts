/** Persistent recent-files list backed by an injectable key/value store (localStorage). */

/** Minimal subset of the Web Storage API. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = "dk-table.recents";

/** Recents manager: `list()` newest first, `add(path)` dedupes, caps at `max`. Null store = memory only. */
export function createRecents(store: KeyValueStore | null, max = 10) {
  /** Reads the stored list, tolerating missing/corrupt data. */
  const load = (): string[] => {
    try {
      const v = JSON.parse(store?.getItem(KEY) ?? "[]");
      return Array.isArray(v) ? v.filter((p): p is string => typeof p === "string").slice(0, max) : [];
    } catch { return []; }
  };
  let items = load();
  return {
    /** Current paths, most recent first. */
    list: (): string[] => [...items],
    /** Records a path as most recent and persists. */
    add: (path: string): void => {
      items = [path, ...items.filter((p) => p !== path)].slice(0, max);
      try { store?.setItem(KEY, JSON.stringify(items)); } catch { /* quota/unavailable: stay in memory */ }
    },
  };
}
