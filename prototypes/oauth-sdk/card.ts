/**
 * Rapport et etat d'une carte du moodboard.
 *
 * Quoi : une carte (idee) passe par idee/piste -> en-cours -> preuves -> termine (ou bloque).
 *        Elle n'est `termine` que si son rapport `docs/rapports/<id>.md` est complet : ce qui a ete
 *        fait, tests verts, captures existantes (sauf `Visible : non`). Parseur tolerant, fonctions pures.
 * Format du rapport : l'AGENT ecrit `# Rapport : <titre>`, `Visible : oui|non`, `## Fait`, `## Non fait`, `## Captures`
 *   (chemins attendus), `## Decisions`, et `## Bloque` s'il ne peut pas finir. Le CODE ecrit `Statut :` et `## Preuves`
 *   (resultats reels de npm test et tsc, captures presentes, bloc machine `<!-- boucle-proof {...} -->`) apres une fusion verte
 *   (voir proveReport.ts). Un rapport `termine` n'est valide que si le bloc de preuves est vert: plus aucune regex sur un « ok » declare.
 *   Les anciens rapports (`- Tests : ok`) restent lisibles; ceux du registre des cartes terminees restent termines.
 * Usage : `parseReport(md)`, `validateReport(r, exists)`, `cardState(r, piste, v)`, `reportTemplate(titre)`.
 */

import { parseCaptures } from "./proofs";

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
  /** Preuves ecrites par le code (bloc machine); absent = jamais prouve. */
  proof?: Proof;
  /** Raison de blocage ecrite par l'agent (`## Bloque`). */
  blocked: string[];
}

/** Resultats reels d'une fusion verte. */
export interface Proof {
  tests: { ok: boolean; count?: number; scope?: "related" | "full" | "none" };
  tsc: { ok: boolean };
}

const PROOF_RE = /<!--\s*boucle-proof\s+(\{.*?\})\s*-->/s;

/** Lit le bloc de preuves du code; `undefined` si absent ou mal forme. */
export function parseProof(md: string): Proof | undefined {
  const m = PROOF_RE.exec(md);
  if (!m) return undefined;
  try {
    const j = JSON.parse(m[1]);
    if (typeof j?.tests?.ok !== "boolean" || typeof j?.tsc?.ok !== "boolean") return undefined;
    return { tests: { ok: j.tests.ok, count: typeof j.tests.count === "number" ? j.tests.count : undefined, scope: j.tests.scope === "related" || j.tests.scope === "full" || j.tests.scope === "none" ? j.tests.scope : undefined }, tsc: { ok: j.tsc.ok } };
  } catch { return undefined; }
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
  const caps = parseCaptures([field("captures"), ...get("captures")].join(", "));
  return {
    title: /^#\s+Rapport\s*:\s*(.+)$/im.exec(md)?.[1].trim() ?? "",
    status: st === "termine" ? "termine" : st === "bloque" ? "bloque" : "en-cours",
    visible: !/^Visible\s*:\s*non/im.test(md) && !caps.exempt,
    done: get("fait"), todo: get("non fait"), tests: field("tests"),
    screenshots: caps.paths,
    decisions: get("decisions"),
    proof: parseProof(md), blocked: get("bloque"),
  };
}

/** Preuves exigees d'un rapport `termine`; un rapport en cours n'exige rien. */
export function validateReport(r: Report, exists: (path: string) => boolean): Validation {
  if (r.status !== "termine") return { ok: true, missing: [] };
  const missing: string[] = [];
  if (!r.done.length) missing.push("fait");
  if (!r.proof || !r.proof.tests.ok || !r.proof.tsc.ok) missing.push("preuves");
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

/** Gabarit initial d'un rapport (sans Statut ni Preuves: ecrits par le code), relu par `parseReport`. */
export function reportTemplate(title: string): string {
  return `# Rapport : ${title}\nVisible : oui\n\n## Fait\n\n## Non fait\n\n## Captures\n\n## Decisions\n`;
}
