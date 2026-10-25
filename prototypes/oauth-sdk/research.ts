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

/** Un axe de recherche : titre de section, consigne, modele. */
export interface Axis {
  id: string;
  title: string;
  ask: string;
  model: string;
}

const BASE =
  "Compare Excel, Google Sheets, LibreOffice Calc et Airtable pour le tableur dk-table. " +
  "Lis d'abord docs/recherche-tableur.md, TODO.md et CLAUDE.md pour savoir ce que dk-table a deja; " +
  "cherche sur le web (docs officielles, forums, avis utilisateurs). ";

/** Les 4 axes de la synthese (ordre = ordre des sections). */
export const AXES: Axis[] = [
  { id: "nouveau", title: "Idees nouvelles", model: "sonnet",
    ask: "Propose des fonctionnalites originales que ces tableurs n'ont pas (ou mal)." },
  { id: "absent", title: "Absent de dk-table, present ailleurs", model: "sonnet",
    ask: "Liste les fonctionnalites presentes dans au moins un de ces tableurs et absentes de dk-table." },
  { id: "neglige", title: "Negligees ou sous-utilisees ailleurs", model: "sonnet",
    ask: "Liste les fonctionnalites existantes mais negligees ou peu utilisees dans ces tableurs." },
  { id: "mal", title: "Mal implementees ailleurs", model: "sonnet",
    ask: "Liste les fonctionnalites mal implementees que les utilisateurs de ces tableurs detestent." },
];

/** Outils autorises (recherche web + lecture locale), rien d'autre. */
export const ALLOWED_TOOLS = ["WebSearch", "WebFetch", "Read", "Grep", "Glob"];

/** Parametres de `runResearch`. */
export interface ResearchOpts {
  query: QueryFn;
  budgetUsd: number;
  /** Tours max par axe (defaut 2). */
  maxRounds?: number;
  /** Env transmis au SDK (token OAuth, sans cle API). */
  env?: Record<string, string>;
  /** Journal d'avancement, une ligne par evenement (defaut: muet). */
  log?: (line: string) => void;
  /** Horloge en ms (defaut: Date.now). */
  now?: () => number;
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
  let total = 0;
  const money = (n: number) => `$${n.toFixed(2)}`;

  /** Une requete d'axe, plafonnee a `share` USD; ajoute son cout reel au total. */
  async function one(a: Axis, share: number): Promise<void> {
    const known = items[a.id].length ? `\nDeja trouve (ne pas repeter):\n${items[a.id].join("\n")}` : "";
    const prompt =
      `${BASE}${a.ask} Reponds en francais, uniquement par des puces "- **Nom** : description, ` +
      `source (URL), valeur pour dk-table", 5 a 8 puces.${known}`;
    const t0 = now();
    log(`[${a.id}] debut (plafond ${money(share)})`);
    let cost = 0;
    const stream = o.query({
      prompt,
      options: {
        model: a.model, maxTurns: 15, maxBudgetUsd: share,
        tools: ALLOWED_TOOLS, allowedTools: ALLOWED_TOOLS,
        permissionMode: "dontAsk", settingSources: [], env: o.env,
      },
    });
    for await (const m of stream) {
      if (m.type !== "result") continue;
      cost += m.total_cost_usd ?? 0;
      if (m.subtype === "success") items[a.id].push(...parseItems(m.result ?? ""));
    }
    total += cost;
    log(`[${a.id}] fin ${money(cost)} ${Math.round((now() - t0) / 1000)}s | total ${money(total)} reste ${money(o.budgetUsd - total)}`);
  }

  for (let r = 0; r < rounds && total < 0.9 * o.budgetUsd; r++) {
    const share = (o.budgetUsd - total) / AXES.length; // somme des plafonds <= reste
    await Promise.all(AXES.map((a) => one(a, share)));
  }
  const markdown =
    "# Recherche de fonctionnalites\n\n" +
    AXES.map((a) => `## ${a.title}\n\n${items[a.id].join("\n")}\n`).join("\n");
  return { markdown, items, totalCostUsd: total };
}
