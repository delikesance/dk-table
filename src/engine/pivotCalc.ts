/**
 * Champ calculé d'un tableau croisé : expression simple sur les noms de colonnes
 * (identifiants sans espace), nombres, + - * / et parenthèses. Module pur.
 */

/** Évalue `expr` avec `vars` (nom de colonne -> nombre). NaN si invalide ou nom inconnu. */
export function evalCalc(expr: string, vars: Record<string, number>): number {
  const toks = expr.match(/[A-Za-z_À-ÿ][\wÀ-ÿ]*|\d+(?:[.,]\d+)?|[-+*/()]|\S/g) ?? [];
  let i = 0;
  const peek = (): string | undefined => toks[i];
  const atom = (): number => {
    const t = toks[i++];
    if (t === undefined) return NaN;
    if (t === "(") { const v = sum(); if (toks[i++] !== ")") return NaN; return v; }
    if (t === "-") return -atom();
    if (/^\d/.test(t)) return Number(t.replace(",", "."));
    return Object.prototype.hasOwnProperty.call(vars, t) ? vars[t] : NaN;
  };
  const prod = (): number => {
    let v = atom();
    while (peek() === "*" || peek() === "/") { const o = toks[i++]; const r = atom(); v = o === "*" ? v * r : v / r; }
    return v;
  };
  function sum(): number {
    let v = prod();
    while (peek() === "+" || peek() === "-") { const o = toks[i++]; const r = prod(); v = o === "+" ? v + r : v - r; }
    return v;
  }
  const v = sum();
  return i === toks.length && Number.isFinite(v) ? v : NaN;
}
