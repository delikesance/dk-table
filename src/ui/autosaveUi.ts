/** Autosave wiring: connects `io/autosave` to the app (same write path as Ctrl+S, status in the title). */
import { createAutosave } from "../io/autosave";
import { writeDoc } from "./fileops";
import { renderTitle, setTitle, type Ctx } from "./appState";

/** Disposer of the previous setup (listeners), so a remount does not stack them. */
let disposePrev: (() => void) | undefined;

/**
 * Enable autosave on `c`: every modification (see `setTitle`) schedules a save 1s later,
 * only when the document already has a path and is dirty. An edit made during the write
 * keeps the document dirty (and triggers another pass). Flushes on close/hide (best effort).
 * Returns a disposer.
 */
export function setupAutosave(c: Ctx): () => void {
  disposePrev?.();
  const auto = createAutosave({
    isEligible: () => !!c.app.path && !!c.app.dirty,
    save: async () => {
      const v = c.version;
      await writeDoc(c.app, false, () => { if (c.version === v) setTitle(c, false); });
    },
    // 'pending' is repainted by setTitle itself; avoid a second title write per edit.
    onState: (s) => {
      const prev = c.autosaveState;
      c.autosaveState = s;
      if (s !== "pending" && (s !== "idle" || (prev && prev !== "pending" && prev !== "idle"))) renderTitle(c);
    },
  });
  c.autosave = auto;
  const flush = (): void => { void auto.flush(); };
  const onHide = (): void => { if (document.visibilityState === "hidden") flush(); };
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", onHide);
  disposePrev = () => {
    auto.cancel();
    window.removeEventListener("beforeunload", flush);
    document.removeEventListener("visibilitychange", onHide);
    if (c.autosave === auto) c.autosave = undefined;
  };
  return disposePrev;
}
