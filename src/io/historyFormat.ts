/** Validation du champ optionnel `history` d'un fichier `.dktable` (journal + instantanés nommés). */
import { DktParseError, isObj } from "./parseError";
import type { History } from "./types";

const str = (v: unknown, at: string): string => {
  if (typeof v !== "string") throw new DktParseError(`${at} must be a string`);
  return v;
};
const num = (v: unknown, at: string): number => {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new DktParseError(`${at} must be a number`);
  return v;
};

/** Valide l'historique en levant une DktParseError localisée. */
export function checkHistory(v: unknown): History {
  if (!isObj(v) || !Array.isArray(v.log) || !Array.isArray(v.snaps)) throw new DktParseError("history must be {log, snaps}");
  const log = v.log.map((e: unknown, i: number) => {
    const at = `history.log[${i}]`;
    if (!isObj(e)) throw new DktParseError(`${at} must be an object`);
    return { t: num(e.t, `${at}.t`), sheet: str(e.sheet, `${at}.sheet`), key: str(e.key, `${at}.key`), from: str(e.from, `${at}.from`), to: str(e.to, `${at}.to`) };
  });
  const snaps = v.snaps.map((s: unknown, i: number) => {
    const at = `history.snaps[${i}]`;
    if (!isObj(s) || !Array.isArray(s.sheets)) throw new DktParseError(`${at} must be {id, name, t, sheets}`);
    const sheets = s.sheets.map((x: unknown, j: number) => {
      if (!isObj(x) || !isObj(x.cells)) throw new DktParseError(`${at}.sheets[${j}] must be {id, name, cells}`);
      return { id: str(x.id, `${at}.sheets[${j}].id`), name: str(x.name, `${at}.sheets[${j}].name`),
        cells: Object.fromEntries(Object.entries(x.cells).map(([k, raw]) => [k, str(raw, `${at}.sheets[${j}].cells.${k}`)])) };
    });
    return { id: str(s.id, `${at}.id`), name: str(s.name, `${at}.name`), t: num(s.t, `${at}.t`), sheets };
  });
  return { log, snaps };
}
