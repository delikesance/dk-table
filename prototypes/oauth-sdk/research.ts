/**
 * Secteur recherche (v1) : compare Excel, Google Sheets, LibreOffice Calc et Airtable
 * pour proposer des fonctionnalites a dk-table, en 4 axes.
 *
 * Quoi : une requete par axe, les 4 en parallele (puis d'autres tours tant que le budget
 *        le permet), cout cumule via `total_cost_usd`, arret a 90 % du plafond.
 * Pourquoi : `query` est injectee (test sans reseau ni cout); le plafond est aussi
 *        transmis au SDK (`maxBudgetUsd` = reste du budget).
 * Usage : `runResearch({ query, budgetUsd: 20 })` -> `{ markdown, items, totalCostUsd }`.
 */

import { agentOptions, MODEL_BY_KIND, type Kind } from "./agentOptions";
import type { Budget } from "./budget";
import type { BoucleEvent } from "./server";

/** Message minimal du flux SDK utilise ici. */
export interface ResultMsg {
  type: string;
  subtype?: string;
  result?: string;
  total_cost_usd?: number;
}

/** Signature de `query()` du SDK, reduite a ce dont on a besoin. */
export type QueryFn = (a: {
  prompt: string;
  options: Record<string, unknown>;
}) => AsyncIterable<ResultMsg>;

export { MODEL_BY_KIND, type Kind } from "./agentOptions";

/** Un axe de recherche : titre de section, consigne, type de tache. */
export interface Axis {
  id: string;
  title: string;
  ask: string;
  kind: Kind;
}

const BASE =
  "Compare Excel, Google Sheets, LibreOffice Calc et Airtable pour le tableur dk-table. " +
  "Lis d'abord docs/recherche-tableur.md, TODO.md et CLAUDE.md pour savoir ce que dk-table a deja; " +
  "cherche sur le web (docs officielles, forums, avis utilisateurs). ";

/** Les 4 axes de la synthese (ordre = ordre des sections). */
export const AXES: Axis[] = [
  { id: "nouveau", title: "Idees nouvelles", kind: "think",
    ask: "Propose des fonctionnalites originales que ces tableurs n'ont pas (ou mal)." },
  { id: "absent", title: "Absent de dk-table, present ailleurs", kind: "think",
    ask: "Liste les fonctionnalites presentes dans au moins un de ces tableurs et absentes de dk-table." },
  { id: "neglige", title: "Negligees ou sous-utilisees ailleurs", kind: "think",
    ask: "Liste les fonctionnalites existantes mais negligees ou peu utilisees dans ces tableurs." },
  { id: "mal", title: "Mal implementees ailleurs", kind: "think",
    ask: "Liste les fonctionnalites mal implementees que les utilisateurs de ces tableurs detestent." },
];

/** Parametres de `runResearch`. */
export interface ResearchOpts {
  query: QueryFn;
  /** Budget partage (reserve/settle), parallele-sur. */
  budget: Budget;
  /** Tours max par axe (defaut 2). */
  maxRounds?: number;
  /** Env transmis au SDK (token OAuth, sans cle API). */
  env?: Record<string, string>;
  /** Journal d'avancement, une ligne par evenement (defaut: muet). */
  log?: (line: string) => void;
  /** Horloge en ms (defaut: Date.now). */
  now?: () => number;
  /** Abandon (bouton Stop) et dossier de travail des agents. */
  abort?: AbortController;
  cwd?: string;
  /** Evenements start/end par axe (panneau), sans cout: le cout est sur l'evenement du secteur. */
  emit?: (e: BoucleEvent) => void;
}

/** Resultat : markdown des 4 sections, puces par axe, cout total. */
export interface ResearchOut {
  markdown: string;
  items: Record<string, string[]>;
  totalCostUsd: number;
}

/** Extrait les puces `- ...` d'une reponse. */
export function parseItems(text: string): string[] {
  return text.split(/\r?\n/).filter((l) => /^\s*[-*] /.test(l)).map((l) => l.replace(/^\s*[*-] /, "- ").trimEnd());
}

/** Boucle de recherche : par tour, les 4 axes en parallele; le reste du budget est reparti entre eux. */
export async function runResearch(o: ResearchOpts): Promise<ResearchOut> {
  const rounds = o.maxRounds ?? 2;
  const log = o.log ?? (() => {});
  const now = o.now ?? Date.now;
  const items: Record<string, string[]> = Object.fromEntries(AXES.map((a) => [a.id, []]));
  let totalCost = 0;
  const money = (n: number) => `$${n.toFixed(2)}`;

  /** Une requete d'axe, plafonnee a `share` USD (deja reserves); regle le cout reel. */
  async function one(a: Axis, share: number): Promise<void> {
    const known = items[a.id].length ? `\nDeja trouve (ne pas repeter):\n${items[a.id].join("\n")}` : "";
    const prompt =
      `${BASE}${a.ask} Reponds en francais, uniquement par des puces "- **Nom** : description, ` +
      `source (URL), valeur pour dk-table", 5 a 8 puces.${known}`;
    const t0 = now();
    o.emit?.({ type: "start", sector: "research", axis: a.id });
    let cost = 0;
    const stream = o.query({
      prompt,
      options: agentOptions("research", {
        model: MODEL_BY_KIND[a.kind], maxTurns: 15, maxBudgetUsd: share, env: o.env, cwd: o.cwd, abort: o.abort,
      }),
    });
    for await (const m of stream) {
      if (m.type !== "result") continue;
      cost += m.total_cost_usd ?? 0;
      if (m.subtype === "success") items[a.id].push(...parseItems(m.result ?? ""));
    }
    o.budget.settle(share, cost);
    totalCost += cost;
    const elapsedS = Math.round((now() - t0) / 1000);
    o.emit?.({ type: "end", sector: "research", axis: a.id, costUsd: cost, elapsedS, totalUsd: o.budget.spent(), remainingUsd: o.budget.left() });
    log(`[${a.id}] fin ${money(cost)} ${elapsedS}s | total ${money(o.budget.spent())} reste ${money(o.budget.left())}`);
  }

  for (let r = 0; r < rounds && !o.budget.exhausted() && !o.abort?.signal.aborted; r++) {
    const share = o.budget.remaining() / AXES.length;
    // reserve synchrone: la somme des plafonds en vol ne depasse jamais le reste
    const runs = AXES.map((a) => ({ a, got: o.budget.reserve(share) })).filter((x) => x.got > 0);
    await Promise.all(runs.map((x) => one(x.a, x.got)));
  }
  const markdown =
    "# Recherche de fonctionnalites\n\n" +
    AXES.map((a) => `## ${a.title}\n\n${items[a.id].join("\n")}\n`).join("\n");
  return { markdown, items, totalCostUsd: totalCost };
}
