/**
 * Status bar, always visible: at left the workbook weight (weightBadge) and the calc mode when not automatic (calcBadge), at right the chosen figures
 * (Moyenne / Nb / Nb numérique / Min / Max / Somme) of a multi-cell selection.
 */
import type { Value } from "../../engine/types";
import { STAT_LABELS, statItems } from "./stats";
import { createCalcBadge } from "./calcBadge";
import { createWeightBadge } from "./weightBadge";

export interface StatusBar { el: HTMLElement; update(cells: number, values: Value[]): void; weigh(raws: Iterable<string>): void }

const KEY = "dk-table.statusbar";

/** Entries chosen by the user (localStorage); all of them by default. */
function load(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(v)) return STAT_LABELS.filter((l) => v.includes(l));
  } catch { /* ignore */ }
  return [...STAT_LABELS];
}

/** Create the bar (always shown; stats only for a selection of 2+ cells); the "Stats" button opens a checkbox menu. */
export function createStatusBar(): StatusBar {
  const el = document.createElement("div");
  el.className = "dk-status";
  el.setAttribute("role", "status");
  const weight = createWeightBadge();
  const calc = createCalcBadge();
  let enabled = load();
  let last: [number, Value[]] = [0, []];
  let open = false;
  const render = () => {
    const items = statItems(last[0], last[1], enabled);
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
    const nodes: Node[] = [weight.el, calc.el, ...spans, btn];
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
  el.addEventListener("contextmenu", (e) => { e.preventDefault(); open = true; render(); }); // right-click = entries menu
  render();
  return {
    el,
    update(cells, values) { last = [cells, values]; render(); },
    weigh(raws) { weight.update(raws); },
  };
}
