/**
 * Formats de nombre personnalisés (`0.0" cm"`, `#,##0.00 €`, `0%`), 1 à 4 sections séparées par `;`
 * (positif ; négatif ; zéro ; texte). Affichage seul : la valeur stockée n'est jamais modifiée.
 * Syntaxe : `0` chiffre obligatoire, `#` chiffre facultatif, `?` espace, `.` décimale, `,` milliers,
 * `%` ×100, `@` texte, `"..."` ou `\x` littéral. Lettres non quotées (dates, E+…) refusées.
 * Décimale et milliers en fr-FR (cohérent avec `numfmt.ts`).
 */

/** Jeton d'une section : littéral, chiffre (`0`/`#`/`?`), séparateurs, `%` ou `@`. */
export type Tok =
  | { k: "lit"; s: string }
  | { k: "ph"; c: "0" | "#" | "?" }
  | { k: "dot" } | { k: "comma" } | { k: "pct" } | { k: "at" };

/** Résultat de l'analyse : sections (1 à 4) ou message d'erreur en français. */
export interface Parsed { sections?: Tok[][]; error?: string }

/** Caractères acceptés sans guillemets (en plus des chiffres et séparateurs). */
const BARE = /[ €$\-+():]/;
const MAX_SECTIONS = 4;

/** Découpe `code` sur les `;` hors guillemets (un `\x` n'est jamais coupé). */
function splitSections(code: string): string[] {
  const out: string[] = [];
  let cur = "", quoted = false;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (c === "\\" && !quoted && i + 1 < code.length) { cur += c + code[++i]; continue; }
    if (c === '"') quoted = !quoted;
    if (c === ";" && !quoted) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  return [...out, cur];
}

/** Analyse une section en jetons ; `error` si caractère inconnu, guillemet non fermé ou deux décimales. */
function tokenize(sec: string): Tok[] | string {
  const toks: Tok[] = [];
  let dots = 0;
  for (let i = 0; i < sec.length; i++) {
    const c = sec[i];
    if (c === '"') {
      const end = sec.indexOf('"', i + 1);
      if (end < 0) return "Guillemet non fermé";
      toks.push({ k: "lit", s: sec.slice(i + 1, end) });
      i = end;
    } else if (c === "\\") {
      if (i + 1 >= sec.length) return "Caractère d'échappement manquant";
      toks.push({ k: "lit", s: sec[++i] });
    } else if (c === "0" || c === "#" || c === "?") toks.push({ k: "ph", c });
    else if (c === ".") { if (++dots > 1) return "Un seul séparateur décimal par section"; toks.push({ k: "dot" }); }
    else if (c === ",") toks.push({ k: "comma" });
    else if (c === "%") toks.push({ k: "pct" });
    else if (c === "@") toks.push({ k: "at" });
    else if (BARE.test(c)) toks.push({ k: "lit", s: c });
    else {
      const word = sec.slice(i).match(/^[A-Za-zÀ-ÿ]+/)?.[0] ?? c;
      return `« ${word} » : mettre entre guillemets ou précéder de \\`;
    }
  }
  return toks;
}

/** Analyse un code de format : `{ sections }` si valide, sinon `{ error }`. */
export function parseCustom(code: string): Parsed {
  if (code.trim() === "") return { error: "Format vide" };
  const parts = splitSections(code);
  if (parts.length > MAX_SECTIONS) return { error: "Au plus 4 sections" };
  const sections: Tok[][] = [];
  for (const p of parts) {
    const t = tokenize(p);
    if (typeof t === "string") return { error: t };
    sections.push(t);
  }
  return { sections };
}

/** Message d'erreur du code (`null` si valide), pour le dialogue. */
export function checkCustom(code: string): string | null {
  return parseCustom(code).error ?? null;
}

/** Groupes de milliers (fine insécable, comme Intl fr-FR). */
const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** Partie entière : zéros minimum, groupes de milliers, espaces des `?`. */
function intPart(toks: Tok[], digits: string): string {
  const ph = toks.filter((t): t is Extract<Tok, { k: "ph" }> => t.k === "ph");
  const minInt = ph.filter((t) => t.c === "0").length;
  let s = digits;
  if (s === "0" && minInt === 0) s = "";
  s = s.padStart(minInt, "0");
  if (toks.some((t) => t.k === "comma")) s = group(s);
  const width = ph.length;
  return s.length < width && ph.some((t) => t.c === "?") ? s.padStart(width, " ") : s;
}

/** Rendu d'une section numérique pour la valeur absolue `v` (déjà ×100 si `%`). */
function renderNumber(toks: Tok[], v: number): string {
  const dot = toks.findIndex((t) => t.k === "dot");
  const fracToks = dot < 0 ? [] : toks.slice(dot + 1);
  const fracPh = fracToks.filter((t) => t.k === "ph") as Extract<Tok, { k: "ph" }>[];
  const minFrac = fracPh.filter((t) => t.c === "0").length;
  const fixed = v.toFixed(Math.min(fracPh.length, 20));
  let frac = fixed.split(".")[1] ?? "";
  while (frac.length > minFrac && frac.endsWith("0")) frac = frac.slice(0, -1);
  const ints = intPart(dot < 0 ? toks : toks.slice(0, dot), fixed.split(".")[0]);
  let out = "", intDone = false, j = 0, seenDot = false;
  for (const t of toks) {
    if (t.k === "dot") { seenDot = true; if (frac) out += ","; }
    else if (t.k === "ph" && !seenDot) { if (!intDone) { out += ints; intDone = true; } }
    else if (t.k === "ph") {
      const d = frac[j];
      out += d ?? (t.c === "0" ? "0" : t.c === "?" ? " " : "");
      j++;
    } else if (t.k === "lit") out += t.s;
    else if (t.k === "pct") out += "%";
  }
  return out;
}

/** Rendu d'une section texte : `@` remplacé par le texte, littéraux conservés. */
function renderText(toks: Tok[], text: string): string {
  return toks.map((t) => {
    if (t.k === "at") return text;
    if (t.k === "lit") return t.s;
    if (t.k === "dot") return ".";
    if (t.k === "comma") return ",";
    if (t.k === "pct") return "%";
    return "";
  }).join("");
}

/**
 * Affiche `text` (valeur affichée de la cellule) selon le code `code`. Choix de section : positif,
 * négatif (valeur absolue ; signe « - » automatique seulement avec une section), zéro (3e section),
 * texte (4e section). Texte sans 4e section ou nombre sans section : inchangé. `null` si code invalide.
 */
export function formatCustom(text: string, code: string): string | null {
  const p = parseCustom(code);
  if (p.error || !p.sections) return null;
  const { sections } = p;
  if (text.trim() === "") return text;
  const n = Number(text.trim());
  if (!Number.isFinite(n)) {
    const sec = sections.length === MAX_SECTIONS ? sections[3] : null;
    return sec ? renderText(sec, text) : text;
  }
  let sec = sections[0], sign = "";
  if (n === 0 && sections.length >= 3) sec = sections[2];
  else if (n < 0 && sections.length >= 2) sec = sections[1];
  else if (n < 0) sign = "-";
  const v = Math.abs(n) * (sec.some((t) => t.k === "pct") ? 100 : 1);
  return sign + renderNumber(sec, v);
}
