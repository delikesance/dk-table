/** Status bar: shows Moyenne / Nb / Nb numérique / Min / Max / Somme of a multi-cell selection. */
import type { Value } from "../../engine/types";
import { statItems } from "./stats";

export interface StatusBar { el: HTMLElement; update(cells: number, values: Value[]): void }

/** Create the bar (hidden until `update` gets a selection of 2+ cells). */
export function createStatusBar(): StatusBar {
  const el = document.createElement("div");
  el.className = "dk-status";
  el.setAttribute("role", "status");
  el.hidden = true;
  return {
    el,
    update(cells, values) {
      const items = statItems(cells, values);
      el.hidden = !items.length;
      el.replaceChildren(...items.map((i) => {
        const s = document.createElement("span");
        s.dataset.stat = i.label;
        s.textContent = `${i.label} : ${i.value}`;
        return s;
      }));
    },
  };
}
