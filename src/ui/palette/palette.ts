/** Command palette (Ctrl+K): fuzzy search over registered commands. */
import { fuzzyScore } from "./fuzzy";
import { defaultRegistry, type Command, type Registry } from "./registry";
import "./palette.css";

/** Options for `createPalette`. */
export interface PaletteOptions {
  /** Command source; defaults to the shared registry. */
  registry?: Registry;
  /** Where the overlay is mounted; defaults to document.body. */
  host?: HTMLElement;
  /** Bind Ctrl/Cmd+K on document (default true). */
  hotkey?: boolean;
  placeholder?: string;
}

/** Handle returned by `createPalette`. */
export interface Palette {
  open(): void;
  close(): void;
  isOpen(): boolean;
  /** Closes and removes the Ctrl+K listener. */
  destroy(): void;
}

/** Commands matching `query`: recent first when empty, best score then recency otherwise. */
export function rankCommands(query: string, reg: Registry): Command[] {
  const all = reg.list();
  const rank = (c: Command) => {
    const r = reg.recentRank(c.id);
    return r < 0 ? Infinity : r;
  };
  if (!query.trim()) return all.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
  const scored: { c: Command; s: number }[] = [];
  for (const c of all) {
    const s = fuzzyScore(query, [c.label, ...(c.keywords ?? [])].join(" "));
    // Label match outranks keyword-only match.
    const l = fuzzyScore(query, c.label);
    if (s !== null) scored.push({ c, s: l !== null ? l + 10 : s });
  }
  return scored.sort((a, b) => b.s - a.s || rank(a.c) - rank(b.c)).map((x) => x.c);
}

/** Creates the palette controller and (by default) binds Ctrl/Cmd+K. */
export function createPalette(opts: PaletteOptions = {}): Palette {
  const reg = opts.registry ?? defaultRegistry;
  const host = opts.host ?? document.body;
  let scrim: HTMLElement | null = null;
  let previousFocus: Element | null = null;

  const close = () => {
    scrim?.remove();
    scrim = null;
    (previousFocus as HTMLElement | null)?.focus?.();
  };

  const open = () => {
    if (scrim) return;
    previousFocus = document.activeElement;
    scrim = document.createElement("div");
    scrim.className = "dk-scrim dk-palette-scrim";
    const box = document.createElement("div");
    box.className = "dk-palette";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Command palette");
    const input = document.createElement("input");
    input.className = "dk-palette__input";
    input.placeholder = opts.placeholder ?? "Type a command…";
    input.setAttribute("role", "combobox");
    const list = document.createElement("ul");
    list.className = "dk-palette__list";
    list.setAttribute("role", "listbox");
    box.append(input, list);
    scrim.append(box);
    host.append(scrim);

    let results: Command[] = [];
    let sel = 0;
    const run = (c: Command) => {
      reg.markUsed(c.id);
      close();
      c.run();
    };
    const render = () => {
      list.replaceChildren();
      results.forEach((c, i) => {
        const li = document.createElement("li");
        li.className = "dk-palette__item" + (i === sel ? " dk-palette__item--selected" : "");
        li.setAttribute("role", "option");
        const label = document.createElement("span");
        label.textContent = c.label;
        li.append(label);
        if (c.shortcut) {
          const k = document.createElement("kbd");
          k.className = "dk-kbd";
          k.textContent = c.shortcut;
          li.append(k);
        }
        li.addEventListener("mousemove", () => { if (sel !== i) { sel = i; render(); } });
        li.addEventListener("click", () => run(c));
        list.append(li);
      });
      list.children[sel]?.scrollIntoView?.({ block: "nearest" });
    };
    const refresh = () => { results = rankCommands(input.value, reg); sel = 0; render(); };

    input.addEventListener("input", refresh);
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = results.length;
        if (n) { sel = (sel + (e.key === "ArrowDown" ? 1 : n - 1)) % n; render(); }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[sel]) run(results[sel]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    });
    scrim.addEventListener("mousedown", (e) => { if (e.target === scrim) close(); });
    refresh();
    input.focus();
  };

  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (scrim) close(); else open();
    } else if (e.key === "Escape" && scrim) {
      close();
    }
  };
  if (opts.hotkey !== false) document.addEventListener("keydown", onKey);

  return {
    open,
    close,
    isOpen: () => scrim !== null,
    destroy() {
      close();
      document.removeEventListener("keydown", onKey);
    },
  };
}
