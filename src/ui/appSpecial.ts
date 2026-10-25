/**
 * Atteindre spécial côté app : cherche les cibles dans la feuille active (moteur `engine/special.ts`),
 * sélectionne la première (curseur) et marque les autres `dkg-special`. La marque tombe à la prochaine sélection.
 */
import "./special.css";
import { specialKeys, type SpecialKind, type SpecialType } from "../engine/special";
import { getDisplay } from "../engine/sheet";
import { makeKey } from "../engine/address";
import { formatValue } from "./numfmt";
import { visibleRows } from "./grid/filterView";
import { viewOf } from "./appGrid";
import type { Ctx } from "./appState";

/** Choix de la boîte « Atteindre spécial » ; `types` absent = tous les types de résultat. */
export interface SpecialChoice { kind: SpecialKind; types?: SpecialType[]; visibleOnly?: boolean }

/** Sélectionne les cellules trouvées ; renvoie leur nombre (0 : la sélection ne bouge pas). */
export function goSpecial(c: Ctx, o: SpecialChoice): number {
  const keys = specialKeys(c.cur.sheet, { kind: o.kind, types: o.types, visible: o.visibleOnly ? visibleOf(c) : null });
  if (!keys.length) return 0;
  c.grid.select(keys[0]); // the selection change clears the previous marks (see clearSpecial)
  c.special = new Set(keys);
  markSpecial(c);
  return keys.length;
}

/** Lignes (0-based) visibles selon les filtres de la feuille active ; null = toutes. */
function visibleOf(c: Ctx): number[] | null {
  const sheet = c.cur.sheet;
  const shown = (col: number, row: number) => {
    const k = makeKey(col + 1, row + 1);
    return formatValue(getDisplay(sheet, k), c.cur.styles[k]?.format);
  };
  return visibleRows(viewOf(c.cur).filters, sheet.rows, shown);
}

/** Pose `dkg-special` sur les cellules rendues de la sélection spéciale, retire-le des autres. */
export function markSpecial(c: Ctx): void {
  c.gridHost.querySelectorAll(".dkg-special").forEach((e) => e.classList.remove("dkg-special"));
  c.gridHost.querySelectorAll<HTMLElement>(".dkg-cell[data-key]").forEach((el) => {
    if (c.special?.has(el.dataset.key!)) el.classList.add("dkg-special");
  });
}

/** Efface la sélection spéciale et sa marque (appelé à chaque changement de sélection). */
export function clearSpecial(c: Ctx): void {
  if (!c.special) return;
  c.special = undefined;
  markSpecial(c);
}
