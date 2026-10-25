/**
 * Faux agents de la Boucle : un `QueryFn` scripte qui ecrit de vrais fichiers dans le worktree de l'agent.
 *
 * Quoi : `fakeQuery(script)` reconnait le secteur par le debut du prompt (recherche, design, implementation,
 *        correction), lit les cartes du lot dans la consigne et applique le comportement choisi par carte.
 * Pourquoi : aucun jeton ni reseau; les tests decident ce que « l'agent » fait (termine, bloque, conflit, lenteur).
 * Usage : `fakeQuery({ card: (id) => ({ kind: "done" }) })`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { QueryFn, ResultMsg } from "../../prototypes/oauth-sdk/research";

/** Comportement d'un agent sur une carte. */
export type Behavior =
  | { kind: "done"; /** Fichier source ecrit (defaut: src/<id>.ts). */ file?: string; text?: string }
  | { kind: "wip" } | { kind: "blocked" } | { kind: "none" }
  /** Termine, mais `Captures` pointe vers un fichier absent. */
  | { kind: "no-shot" };

/** Script des faux agents. */
export interface Script {
  /** Comportement par carte et par essai, 0 = premier passage (defaut: done). */
  card?: (id: string, attempt: number) => Behavior;
  /** Attente avant de rendre la main (cartes ou secteur), pour observer le temps reel. */
  gate?: (what: string) => Promise<void> | undefined;
  /** Fichiers que le design ecrit (defaut: un). */
  designs?: string[];
  cost?: number;
  /** Prompts recus (inspection). */
  seen?: { sector: string; cwd: string; ids: string[] }[];
  /** Coup de pouce de test sur le sol de l'agent. */
  onRun?: (sector: string, cwd: string, ids: string[]) => Promise<void> | void;
}

/** PNG 1x1. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

/** Rapport markdown d'une carte. */
export function report(id: string, status: string, shot: string | null): string {
  return `# Rapport : ${id}\nStatut : ${status}\nVisible : oui\n\n## Fait\n- ${id} fait\n\n## Non fait\n\n## Preuves\n- Tests : ok (3 tests)\n` +
    (shot ? `- Captures : ${shot}\n` : "") + "\n## Decisions\n";
}

const put = (dir: string, rel: string, data: string | Buffer) => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), data);
};

/** Ids des cartes du lot (lignes `- <id> (etat, rapport docs/rapports/<id>.md)`). */
export const idsOf = (prompt: string): string[] =>
  [...prompt.matchAll(/^- ([a-z0-9-]+) \([a-z-]+, rapport docs\/rapports\//gm)].map((m) => m[1]);

/** Construit le faux `query`. */
export function fakeQuery(s: Script = {}): QueryFn {
  const want = s.cost ?? 0.02, tries = new Map<string, number>();
  return ({ prompt, options }) => (async function* (): AsyncGenerator<ResultMsg> {
    const cwd = String(options.cwd ?? "");
    const cost = Math.min(want, Number(options.maxBudgetUsd ?? want)); // comme le SDK : jamais au-dela du plafond de la requete
    const sector = /^Secteur (design|implementation|correction)/.exec(prompt)?.[1] ?? (prompt.startsWith("Compare") ? "research" : "autre");
    const ids = idsOf(prompt);
    s.seen?.push({ sector, cwd, ids });
    await s.onRun?.(sector, cwd, ids);
    // comme le SDK : un abandon (bouton Stop) interrompt l'agent, sans resultat
    const abort = options.abortController as AbortController | undefined;
    const aborted = new Promise<"abort">((r) => abort?.signal.addEventListener("abort", () => r("abort"), { once: true }));
    if ((await Promise.race([Promise.resolve(s.gate?.(`${sector}:${ids.join(",")}`)), aborted])) === "abort") return;
    if (sector === "research") yield { type: "result", subtype: "success", result: "- **Idee de test** : texte.", total_cost_usd: cost };
    if (sector === "design") {
      // le fichier de design du run est nomme dans la consigne (`docs/design/<date>-<HHmmss>.html`)
      const named = /docs\/design\/\d{4}-\d{2}-\d{2}-\d{6}\.html/.exec(prompt)?.[0] ?? "docs/design/maquette.html";
      for (const n of s.designs ?? [named]) put(cwd, n.includes("/") ? n : `docs/design/${n}`, `<body><h1>${n}</h1></body>`);
      await s.gate?.("design:written");
    }
    if (sector === "implementation") {
      for (const id of ids) {
        const n = tries.get(id) ?? 0; tries.set(id, n + 1);
        const b = s.card?.(id, n) ?? { kind: "done" as const };
        if (b.kind === "none") continue;
        if (b.kind === "done" || b.kind === "no-shot") {
          put(cwd, b.kind === "done" && b.file ? b.file : `src/${id}.ts`, b.kind === "done" && b.text ? b.text : `export const ${id.replace(/-/g, "_")} = 1;\n`);
          const shot = `docs/screenshots/${id}/${id}-clair.png`;
          if (b.kind === "done") put(cwd, shot, PNG);
          put(cwd, `docs/rapports/${id}.md`, report(id, "termine", shot));
        } else put(cwd, `docs/rapports/${id}.md`, report(id, b.kind === "blocked" ? "bloque" : "en-cours", null));
      }
    }
    yield { type: "result", subtype: "success", result: "ok", total_cost_usd: cost };
  })();
}
