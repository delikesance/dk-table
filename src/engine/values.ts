import { err, isErr, type CellError, type Value } from "./types";

/** Coerce a value to a number (blank=0, bool=1/0, numeric text); else #VALUE!. */
export function toNum(v: Value): number | CellError {
  if (isErr(v)) return v;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v.trim() === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : err("#VALUE!");
}

/** Coerce a non-error value to text (booleans as TRUE/FALSE). */
export function toText(v: Value): string {
  if (isErr(v)) return v.error;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return typeof v === "number" ? fmtNum(v) : v;
}

/** Truthiness for IF: numbers non-zero, text "TRUE"/"FALSE", else #VALUE!. */
export function toBool(v: Value): boolean | CellError {
  if (isErr(v)) return v;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const u = v.toUpperCase();
  if (u === "TRUE") return true;
  if (u === "FALSE" || u === "") return false;
  return err("#VALUE!");
}

/** Format a number, trimming floating-point noise (0.1+0.2 -> "0.3"). */
export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "#VALUE!";
  return String(Number(n.toPrecision(12)));
}

/** Display string of a computed value. */
export function displayValue(v: Value): string {
  return toText(v);
}
