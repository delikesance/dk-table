/**
 * Prototype : secteur recherche (voir research.ts), Claude Agent SDK en mode autonome.
 *
 * Quoi : lance la boucle de recherche (4 axes) et ecrit docs/recherche/fonctionnalites.md.
 * Usage : CLAUDE_CODE_OAUTH_TOKEN=... npx tsx prototypes/oauth-sdk/index.ts [plafondUSD=20]
 *        Dep : `npm install --no-save @anthropic-ai/claude-agent-sdk tsx`.
 * Securite : le token n'est jamais affiche; ANTHROPIC_API_KEY est retiree de l'env du SDK.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { createBudget } from "./budget";
import { runResearch, type QueryFn } from "./research";

/** Echec propre (stderr + code 1) avant tout appel reseau. */
function fail(msg: string): never {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
  fail("CLAUDE_CODE_OAUTH_TOKEN absent. Genere-le avec `claude setup-token` puis exporte-le.");
}

// Env sans la cle API (sinon elle prime sur le token OAuth).
const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) {
  if (v !== undefined && k !== "ANTHROPIC_API_KEY") env[k] = v;
}

const budgetUsd = Number(process.argv[2] ?? 20);

runResearch({
  query: query as unknown as QueryFn, budget: createBudget(budgetUsd, 1), env,
  log: (l) => process.stderr.write(`${l}
`),
})
  .then((out) => {
    mkdirSync("docs/recherche", { recursive: true });
    writeFileSync("docs/recherche/fonctionnalites.md", out.markdown);
    console.error(`[cout] $${out.totalCostUsd.toFixed(4)} / $${budgetUsd}`);
  })
  .catch((e: unknown) => fail(`Erreur: ${e instanceof Error ? e.message : String(e)}`));
