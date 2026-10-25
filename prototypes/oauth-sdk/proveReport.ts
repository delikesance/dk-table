/**
 * Preuves d'un rapport et case TODO.md, ecrites par le code (jamais par l'agent).
 *
 * Quoi : `applyProof(md, proof, exists)` -> `{ md, status }` : retire l'ancien `Statut :` et l'ancienne section `## Preuves`,
 *        calcule le statut (`bloque` si `## Bloque`; `termine` si `## Fait` non vide et `## Non fait` vide; sinon `en-cours`),
 *        ecrit `## Preuves` (tests et tsc reels, captures presentes/absentes, bloc machine `boucle-proof`).
 *        `tickTodo(todo, title, id)` -> coche la case `- [ ]` qui correspond au titre (ligne ajoutee sous `## Boucle` si aucune).
 * Pourquoi : les preuves venaient de l'agent (declaratives, verifiees par regex) alors que le code connait les resultats reels;
 *        et plusieurs agents en parallele editaient TODO.md (conflits).
 * Usage : apres une fusion verte, sous le verrou de git.ts (`mergeIfGreen` avec le crochet `prove`).
 */
import { parseReport, type Proof } from "./card";
import { matches } from "./moodboard";

const flat = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
/** La ligne TODO parle de cette carte: mots du titre (moodboard) ou titre entier contenu (titres courts). */
const same = (title: string, line: string) => matches(title, line) || flat(line).includes(flat(title).trim());
/** Ligne « rien a faire » : `aucun`, `rien.`, `(aucun reste dans les criteres de la carte)`; pas `aucun test ecrit`. */
const EMPTY = /^(aucun|aucune|rien|n\/a|neant|-)( (reste|restant|a faire))?( (dans|hors) (les )?criteres( de (la|cette) carte)?)?$/;
const isEmpty = (t: string) => EMPTY.test(flat(t).replace(/[().!]/g, "").trim());

/** Statut calcule par le code d'apres le contenu ecrit par l'agent. */
export function statusFrom(md: string): "termine" | "en-cours" | "bloque" {
  const r = parseReport(md);
  if (r.blocked.length) return "bloque";
  const open = r.todo.filter((t) => !isEmpty(t));
  return r.done.length && !open.length ? "termine" : "en-cours";
}

/** Retire `Statut :` et la section `## Preuves` (y compris le bloc machine). */
function strip(md: string): string {
  const out: string[] = [];
  let skip = false;
  for (const line of md.replace(/\r\n/g, "\n").split("\n")) {
    if (/^##\s+/.test(line)) skip = /^##\s+preuves\b/i.test(line);
    if (skip || /^Statut\s*:/i.test(line)) continue;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

/** Reecrit le rapport avec statut et preuves reels. */
export function applyProof(md: string, proof: Proof, exists: (path: string) => boolean): { md: string; status: "termine" | "en-cours" | "bloque" } {
  const status = statusFrom(md);
  const r = parseReport(md);
  const body = strip(md);
  const lines = body.split("\n");
  const at = lines.findIndex((l) => /^#\s+Rapport\s*:/i.test(l));
  lines.splice(at + 1, 0, `Statut : ${status}`);
  const caps = r.visible ? (r.screenshots.map((p) => `${p}${exists(p) ? "" : " (absente)"}`).join(", ") || "aucune annoncee") : "sans objet";
  const t = proof.tests;
  const proofLines = [
    "", "## Preuves",
    `- Tests : ${t.ok ? "ok" : "echec"} (${[t.count !== undefined ? `${t.count} tests` : "", t.scope === "related" ? "tests lies aux fichiers modifies" : t.scope === "none" ? "non executes : documentation seule" : "suite complete"].filter(Boolean).join(", ")})`,
    `- Typecheck : ${proof.tsc.ok ? "ok" : "echec"}`,
    `- Captures : ${caps}`,
    `<!-- boucle-proof ${JSON.stringify(proof)} -->`,
  ];
  return { md: lines.join("\n") + "\n" + proofLines.join("\n") + "\n", status };
}

/** Coche la tache TODO correspondant a la carte; ajoute `- [x] titre (carte id)` sous `## Boucle` si aucune ligne ne correspond. */
export function tickTodo(todo: string, title: string, id: string): string {
  const lines = todo.replace(/\r\n/g, "\n").split("\n");
  const hit = lines.findIndex((l) => /^\s*-\s*\[ \]/.test(l) && same(title, l));
  if (hit >= 0) { lines[hit] = lines[hit].replace("[ ]", "[x]"); return lines.join("\n"); }
  if (lines.some((l) => /^\s*-\s*\[[xX]\]/.test(l) && same(title, l))) return lines.join("\n");
  const entry = `- [x] ${title} (carte ${id})`;
  const sec = lines.findIndex((l) => /^##\s+Boucle\s*$/i.test(l));
  if (sec >= 0) { lines.splice(sec + 1, 0, entry); return lines.join("\n"); }
  return lines.join("\n").replace(/\n*$/, "\n") + "\n## Boucle\n\n" + entry + "\n";
}
