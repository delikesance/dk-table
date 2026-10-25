/**
 * Point d'entree de la boucle autonome : panneau local + pipeline reel.
 *
 * Quoi : serveur sur 127.0.0.1 (PORT, defaut 4317) servant `panel.html`; "Go" lance
 *        research -> implementation -> correction -> design avec le Claude Agent SDK.
 * Usage : npx tsx --env-file=.env prototypes/oauth-sdk/boucle.ts   puis ouvrir http://127.0.0.1:4317
 *        Dep : `npm install --no-save @anthropic-ai/claude-agent-sdk tsx`.
 * Securite : le token n'est jamais affiche; ANTHROPIC_API_KEY est retiree de l'env du SDK.
 *        Aucun push, jamais master (fusion dans `developpement` seulement, si tests + tsc verts).
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { parseBudgetEur } from "./budget";
import type { Run } from "./git";
import { createPipeline } from "./pipeline";
import type { QueryFn } from "./research";
import { createServer, listen } from "./server";

if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
  process.stderr.write("CLAUDE_CODE_OAUTH_TOKEN absent (voir .env, `claude setup-token`).\n");
  process.exit(1);
}

// Env sans la cle API (sinon elle prime sur le token OAuth).
const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) {
  if (v !== undefined && k !== "ANTHROPIC_API_KEY") env[k] = v;
}

/** Lance une commande (shell sous Windows pour npm/npx); sortie fusionnee, jamais d'exception. */
const run: Run = (cmd, args, cwd) =>
  new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, shell: process.platform === "win32", env });
    let out = "";
    p.stdout.on("data", (c) => (out += c));
    p.stderr.on("data", (c) => (out += c));
    p.on("error", (e) => resolve({ code: 1, out: String(e) }));
    p.on("close", (code) => resolve({ code: code ?? 1, out }));
  });

const here = dirname(fileURLToPath(import.meta.url));
const server = createServer({
  runPipeline: createPipeline({ query: query as unknown as QueryFn, run, cwd: process.cwd(), env }),
  parseBudgetEur,
  panelHtml: readFileSync(join(here, "panel.html"), "utf-8"),
});
const port = Number(process.env.PORT) || 4317;
listen(server, port).then(() => console.error(`boucle: http://127.0.0.1:${port}`));
