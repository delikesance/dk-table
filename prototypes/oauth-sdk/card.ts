/**
 * Rapport et etat d'une carte du moodboard.
 *
 * Quoi : une carte (idee) passe par idee/piste -> en-cours -> preuves -> termine (ou bloque).
 *        Elle n'est `termine` que si son rapport `docs/rapports/<id>.md` est complet : ce qui a ete
 *        fait, tests verts, captures existantes (sauf `Visible : non`). Parseur tolerant, fonctions pures.
 * Format du rapport (ecrit par l'agent des le debut, mis a jour a chaque etape) :
 *   `# Rapport : <titre>`, `Statut : en-cours|termine|bloque`, `Visible : oui|non`, puis sections
 *   `## Fait`, `## Non fait`, `## Preuves` (lignes `- Tests : ...`, `- Captures : a.png, b.png`), `## Decisions`.
 * Usage : `parseReport(md)`, `validateReport(r, exists)`, `cardState(r, piste, v)`, `reportTemplate(titre)`.
 */

/** Etat d'une carte sur le board. */
export type CardState = "idee" | "piste" | "en-cours" | "preuves" | "termine" | "bloque";

/** Rapport analyse. */
export interface Report {
  title: string;
  status: "en-cours" | "termine" | "bloque";
  visible: boolean;
  done: string[];
  todo: string[];
  tests: string;
  screenshots: string[];
  decisions: string[];
}

/** Resultat de la verification des preuves. */
export interface Validation { ok: boolean; missing: string[] }

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const bullets = (lines: string[]) => lines.map((l) => /^\s*[-*]\s+(.*)$/.exec(l)?.[1].trim()).filter((x): x is string => !!x);

/** Analyse un rapport markdown (jamais d'exception). */
export function parseReport(md: string): Report {
  const sections = new Map<string, string[]>();
  let cur = "";
  for (const line of md.split(/\r?\n/)) {
    const h = /^##\s+(.*)$/.exec(line);
    if (h) { cur = norm(h[1]).trim(); sections.set(cur, []); } else if (cur) sections.get(cur)!.push(line);
  }
  const get = (k: string) => bullets(sections.get(k) ?? []);
  const proof = get("preuves");
  const field = (k: string) => proof.find((l) => norm(l).startsWith(k))?.replace(/^[^:]*:\s*/, "").trim() ?? "";
  const st = norm(/^Statut\s*:\s*(.+)$/im.exec(md)?.[1] ?? "").trim();
  const caps = field("captures");
  return {
    title: /^#\s+Rapport\s*:\s*(.+)$/im.exec(md)?.[1].trim() ?? "",
    status: st === "termine" ? "termine" : st === "bloque" ? "bloque" : "en-cours",
    visible: !/^Visible\s*:\s*non/im.test(md),
    done: get("fait"), todo: get("non fait"), tests: field("tests"),
    screenshots: caps ? caps.split(/\s*,\s*/).filter(Boolean) : [],
    decisions: get("decisions"),
  };
}

/** Preuves exigees d'un rapport `termine`; un rapport en cours n'exige rien. */
export function validateReport(r: Report, exists: (path: string) => boolean): Validation {
  if (r.status !== "termine") return { ok: true, missing: [] };
  const missing: string[] = [];
  if (!r.done.length) missing.push("fait");
  if (!/\bok\b/i.test(r.tests)) missing.push("tests");
  if (r.visible && !r.screenshots.length) missing.push("captures");
  for (const p of r.screenshots) if (!exists(p)) missing.push(`capture absente : ${p}`);
  return { ok: missing.length === 0, missing };
}

/** Etat de la carte: rapport absent -> idee/piste; `termine` declare sans preuves -> `preuves`. */
export function cardState(r: Report | undefined, piste: boolean, v?: Validation): CardState {
  if (!r) return piste ? "piste" : "idee";
  if (r.status === "bloque") return "bloque";
  if (r.status === "termine") return v?.ok ? "termine" : "preuves";
  return "en-cours";
}

/** Gabarit initial d'un rapport (statut en cours), relu par `parseReport`. */
export function reportTemplate(title: string): string {
  return `# Rapport : ${title}\nStatut : en-cours\nVisible : oui\n\n## Fait\n\n## Non fait\n\n## Preuves\n\n## Decisions\n`;
}
