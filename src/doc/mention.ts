/** `@` mention: while "@words" is typed, lists matching cells (by names or address); Enter inserts a live reference. */
import { Plugin, PluginKey, type EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { searchRefs, type RefBook, type RefHit } from "./refs";
import { docSchema } from "./schema";

/** Open mention: the text range "@query" and its candidates. */
interface Open { from: number; to: number; hits: RefHit[]; sel: number }

const key = new PluginKey<{ sel: number; closed: number }>("mention");
const AT = /@([^@\n]{1,40})$/;

/** The open mention at the cursor, if any hit matches. */
function find(state: EditorState, book: RefBook): Open | null {
  const { $from, empty } = state.selection;
  if (!empty || !$from.parent.isTextblock) return null;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
  const m = AT.exec(before);
  if (!m) return null;
  const hits = searchRefs(book, m[1]);
  if (!hits.length) return null;
  const to = $from.pos;
  const from = to - m[0].length;
  if (key.getState(state)?.closed === from) return null;
  return { from, to, hits, sel: Math.min(key.getState(state)?.sel ?? 0, hits.length - 1) };
}

/** Plugin: popup list + key handling (arrows, Enter/Tab insert, Escape closes the list only). */
export function mentionPlugin(book: RefBook): Plugin {
  let pop: HTMLElement | null = null;
  const close = (): void => { pop?.remove(); pop = null; };
  const choose = (view: EditorView, o: Open, i: number): void => {
    const h = o.hits[i];
    const node = docSchema.nodes.cellRef.create({ sheet: h.target.sheet, ref: h.target.ref });
    view.dispatch(view.state.tr.replaceWith(o.from, o.to, node).scrollIntoView());
    view.focus();
  };
  return new Plugin({
    key,
    state: {
      init: () => ({ sel: 0, closed: -1 }),
      apply(tr, v) {
        const m = tr.getMeta(key) as Partial<{ sel: number; closed: number }> | undefined;
        return m ? { ...v, ...m } : tr.docChanged ? { sel: 0, closed: v.closed } : v;
      },
    },
    props: {
      handleKeyDown(view, e) {
        const o = find(view.state, book);
        if (!o) return false;
        const set = (m: object): boolean => { view.dispatch(view.state.tr.setMeta(key, m)); return true; };
        if (e.key === "ArrowDown") return set({ sel: (o.sel + 1) % o.hits.length });
        if (e.key === "ArrowUp") return set({ sel: (o.sel + o.hits.length - 1) % o.hits.length });
        if (e.key === "Escape") return set({ closed: o.from });
        if (e.key === "Enter" || e.key === "Tab") { choose(view, o, o.sel); return true; }
        return false;
      },
    },
    view: () => ({
      update(view) {
        const o = find(view.state, book);
        if (!o) { close(); return; }
        if (!pop) { pop = document.createElement("div"); pop.className = "dk-mention"; pop.setAttribute("role", "listbox"); document.body.append(pop); }
        const ul = document.createElement("ul");
        o.hits.forEach((h, i) => {
          const li = document.createElement("li");
          li.className = i === o.sel ? "dk-mention__item dk-mention__item--on" : "dk-mention__item";
          li.setAttribute("role", "option");
          const a = document.createElement("span"); a.textContent = h.label;
          const b = document.createElement("small"); b.textContent = `${h.address} · ${h.text}`;
          li.append(a, b);
          li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(view, o, i); });
          ul.append(li);
        });
        pop.replaceChildren(ul);
        try {
          const c = view.coordsAtPos(o.to);
          pop.style.left = `${c.left}px`;
          pop.style.top = `${c.bottom + 4}px`;
        } catch { /* layout unavailable (tests) */ }
      },
      destroy: close,
    }),
  });
}
