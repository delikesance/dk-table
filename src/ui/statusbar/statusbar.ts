/** Status bar: shows the chosen figures (Moyenne / Nb / Nb numérique / Min / Max / Somme) of a multi-cell selection. */
import type { Value } from "../../engine/types";
import { STAT_LABELS, statItems } from "./stats";

export interface StatusBar { el: HTMLElement; update(cells: number, values: Value[]): void }

const KEY = "dk-table.statusbar";

/** Entries chosen by the user (localStorage); all of them by default. */
function load(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(v)) return STAT_LABELS.filter((l) => v.includes(l));
  } catch { /* ignore */ }
  return [...STAT_LABELS];
}

/** Create the bar (hidden until `update` gets a selection of 2+ cells); the "Stats" button opens a checkbox menu. */
export function createStatusBar(): StatusBar {
  const el = document.createElement("div");
  el.className = "dk-status";
  el.setAttribute("role", "status");
  el.hidden = true;
  let enabled = load();
  let last: [number, Value[]] = [0, []];
  let open = false;
  const render = () => {
    const items = statItems(last[0], last[1], enabled);
    el.hidden = !statItems(last[0], last[1]).length;
    const spans = items.map((i) => {
      const s = document.createElement("span");
      s.dataset.stat = i.label;
      s.textContent = `${i.label} : ${i.value}`;
      return s;
    });
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dk-status__btn";
    btn.textContent = "Stats ▾";
    btn.title = "Choisir les statistiques affichées";
    btn.onclick = () => { open = !open; render(); };
    const nodes: Node[] = [...spans, btn];
    if (open) {
      const menu = document.createElement("div");
      menu.className = "dk-status__menu";
      for (const l of STAT_LABELS) {
        const lab = document.createElement("label");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = enabled.includes(l);
        cb.dataset.statOpt = l;
        cb.onclick = () => {
          enabled = STAT_LABELS.filter((x) => (x === l ? cb.checked : enabled.includes(x)));
          localStorage.setItem(KEY, JSON.stringify(enabled));
          render();
        };
        lab.append(cb, ` ${l}`);
        menu.append(lab);
      }
      nodes.push(menu);
    }
    el.replaceChildren(...nodes);
  };
  return { el, update(cells, values) { last = [cells, values]; render(); } };
}
