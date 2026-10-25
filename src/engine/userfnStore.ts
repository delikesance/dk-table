/**
 * Fonctions nommées (définies par l'utilisateur) : registre, validation et expansion d'un appel.
 * Une fonction = nom, paramètres (lettres seules, pour ne pas ressembler à une cellule) et corps
 * (formule, "=" facultatif). L'appel `NOM(a;b)` évalue le corps où chaque paramètre est remplacé
 * par l'expression de l'argument. Les fonctions intégrées priment. Sans dépendance du reste du
 * moteur d'évaluation (le registre est lu par `evaluator.ts`).
 */
import type { Node } from "./types";
import { listFunctionNames } from "./functions";
import { parseFormula } from "./parser";

/** Définition persistée dans `.dktable` (`functions`). */
export interface UserFn {
  name: string;
  params: string[];
  body: string;
}

let fns = new Map<string, UserFn>();
const parsed = new Map<string, Node | null>();

/** Remplace toutes les définitions (ouverture/nouveau document, dialogue). */
export function setUserFunctions(list: UserFn[]): void {
  fns = new Map(list.map((f) => [f.name.toUpperCase(), { ...f, params: [...f.params] }]));
  parsed.clear();
}

/** Définitions courantes (copie). */
export function getUserFunctions(): UserFn[] {
  return [...fns.values()].map((f) => ({ ...f, params: [...f.params] }));
}

/** Message d'erreur (FR) si la définition est invalide, sinon null. `others` = autres noms déjà pris. */
export function checkUserFn(f: UserFn, others: string[] = []): string | null {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(f.name)) return "Nom invalide (lettres, chiffres, _; commence par une lettre).";
  const up = f.name.toUpperCase();
  if (listFunctionNames().includes(up) || others.map((o) => o.toUpperCase()).includes(up))
    return "Ce nom existe déjà.";
  const ps = f.params.map((p) => p.toUpperCase());
  if (f.params.some((p) => !/^[A-Za-z_]+$/.test(p)) || new Set(ps).size !== ps.length)
    return "Paramètre invalide ou en double (lettres seules, ex. ht, taux).";
  if (!f.body.replace(/^\s*=/, "").trim()) return "Corps de formule vide.";
  return null;
}

/** AST du corps (mis en cache), null si illisible. */
function bodyAst(f: UserFn): Node | null {
  const k = f.name.toUpperCase();
  if (!parsed.has(k)) {
    try { parsed.set(k, parseFormula(f.body.trim().replace(/^=/, ""))); } catch { parsed.set(k, null); }
  }
  return parsed.get(k)!;
}

/** Remplace les paramètres (noeuds `err` portant leur nom) par les arguments. */
function subst(n: Node, m: Map<string, Node>): Node {
  switch (n.t) {
    case "err": return (n.name && m.get(n.name)) || n;
    case "neg": case "pct": return { ...n, e: subst(n.e, m) };
    case "bin": return { ...n, l: subst(n.l, m), r: subst(n.r, m) };
    case "call": return { ...n, args: n.args.map((a) => subst(a, m)) };
    default: return n;
  }
}

/** Corps de la fonction `call` avec arguments substitués ; undefined si le nom est inconnu. */
export function expandUserCall(call: Extract<Node, { t: "call" }>): Node | undefined {
  const f = fns.get(call.name);
  if (!f) return undefined;
  const body = bodyAst(f);
  if (!body || call.args.length !== f.params.length) return { t: "err", code: "#VALUE!" };
  return subst(body, new Map(f.params.map((p, i) => [p.toUpperCase(), call.args[i]])));
}
