// @vitest-environment node
/**
 * Serveur de demonstration pour les captures des anomalies du reconciliateur (inactif sans FLUX_SHOTS=1).
 * Usage : `FLUX_SHOTS=1 npx vitest run prototypes/oauth-sdk/shots.flux.fixture --testTimeout=120000` puis
 *        `node prototypes/oauth-sdk/shots.flux.mjs <dossier>` (le serveur ecoute 127.0.0.1:4748 ~1 min).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "vitest";
import { createServer, listen } from "./server";

const C = (id: string, title: string, state: string, axis: string, summary: string, extra: object = {}) =>
  ({ id, title, state, status: "found", axis, summary, source: summary, missing: [], anomalies: [], ...extra });
const CARDS = [
  C("graphe", "Graphe de dépendances", "termine", "new", "Flèches entre précédents et dépendants au survol."),
  C("validation", "Validation de données", "preuves", "missing", "Listes déroulantes et règles par plage.", { missing: ["rapport"], anomalies: ["finie (TODO coche) sans rapport : rapport a ecrire"] }),
  C("recherchex", "RECHERCHEX", "en-cours", "missing", "Recherche bidirectionnelle sans colonne pivot."),
  C("filtre", "Fonction FILTRE", "idee", "missing", "Plage dynamique filtrée par condition.", { anomalies: ["orpheline : rapport en cours sans agent actif"] }),
  C("fiche", "Vue fiche d'une ligne", "idee", "new", "Formulaire par enregistrement."),
  C("collage", "Collage spécial", "piste", "poor", "Valeurs, formats, transposé."),
];

it.runIf(process.env.FLUX_SHOTS)("sert la demonstration", async () => {
  const here = __dirname;
  const server = createServer({
    parseBudgetEur: Number, panelHtml: () => readFileSync(join(here, "panel.html"), "utf8"), assetsDir: here,
    moodboardHtml: () => readFileSync(join(here, "moodboard.html"), "utf8"),
    moodboard: async () => CARDS, report: async () => null, shot: async () => null,
    runPipeline: async () => ({ complete: false }),
  });
  await listen(server, 4748);
  await new Promise((r) => setTimeout(r, 100_000));
  server.close();
});
