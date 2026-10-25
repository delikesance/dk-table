// @vitest-environment node
/**
 * Serveur de demonstration pour la capture du panneau avec agents en parallele (inactif sans PAR_SHOTS=1).
 * Usage : `PAR_SHOTS=1 npx vitest run prototypes/oauth-sdk/shots.par.fixture --testTimeout=120000` puis
 *        `node prototypes/oauth-sdk/shots.par.mjs <dossier>` (le serveur ecoute 127.0.0.1:4749 ~1 min).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "vitest";
import { createServer, listen, type BoucleEvent } from "./server";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

it.runIf(process.env.PAR_SHOTS)("sert la demonstration", async () => {
  const here = __dirname;
  const server = createServer({
    parseBudgetEur: Number, panelHtml: () => readFileSync(join(here, "panel.html"), "utf8"), assetsDir: here,
    runPipeline: async ({ onEvent }) => {
      const e = (x: BoucleEvent) => onEvent({ ts: Date.now(), ...x } as BoucleEvent);
      e({ type: "start", sector: "research" }); e({ type: "info", sector: "research", message: "recherche ignoree : 14 carte(s) non terminee(s) (seuil 12), aucun appel modele" });
      e({ type: "end", sector: "research", costUsd: 0, elapsedS: 0, totalUsd: 0, remainingUsd: 21.6, ok: true });
      e({ type: "start", sector: "design" }); e({ type: "end", sector: "design", costUsd: 0.62, elapsedS: 74, totalUsd: 0.62, remainingUsd: 20.98, ok: true });
      e({ type: "info", round: 1, message: "tournee 1 : 14 carte(s) restante(s), lot graphe, filtre, fiche, collage, tri, cf" });
      e({ type: "info", message: "agents en parallele (3 a la fois) : graphe, filtre, fiche" });
      for (const a of ["graphe", "filtre", "fiche"]) { e({ type: "start", sector: "implementation", agent: a }); await sleep(60); }
      e({ type: "end", sector: "implementation", agent: "graphe", costUsd: 0.41, elapsedS: 96, totalUsd: 1.03, remainingUsd: 20.57, ok: true });
      e({ type: "info", sector: "implementation", agent: "graphe", message: "wt/implementation-graphe-1-0 fusionne dans developpement" });
      e({ type: "info", sector: "implementation", agent: "filtre", message: "anomalie : test(s) deja rouge(s) sur developpement, sans rapport avec la carte : prototypes/oauth-sdk/git.push.test.ts > pushDev" });
      await sleep(90_000);
      return { complete: false };
    },
  });
  await listen(server, 4749);
  await sleep(100_000);
  server.close();
});
