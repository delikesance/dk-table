// @vitest-environment node
/**
 * Serveur de demonstration du moodboard en temps reel (inactif sans LIVE_SHOTS=1): 3 faux agents en parallele deplacent des cartes.
 * Usage : `LIVE_SHOTS=1 npx vitest run prototypes/oauth-sdk/shots.live.fixture --testTimeout=120000` puis
 *        `node prototypes/oauth-sdk/shots.live.mjs <dossier>` (le serveur ecoute 127.0.0.1:4750 ~1 min).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "vitest";
import { createServer, listen, type BoucleEvent } from "./server";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TITLES: Record<string, string> = {
  graphe: "Carte des dépendances interactive", filtre: "Filtre par valeur dans l'en-tête", fiche: "Vue fiche d'une ligne", collage: "Collage spécial (valeurs, formats)",
  tri: "Tri multi-colonnes", cf: "Formatage conditionnel par échelle", texte: "Texte en colonnes", plafonds: "Plafonds de lignes visibles", import: "Import CSV avec rapport", macros: "Annulation conservée après macro",
};
const state: Record<string, string> = Object.fromEntries(Object.keys(TITLES).map((id) => [id, "idee"]));
state.import = "termine"; state.macros = "termine"; state.plafonds = "preuves";
const board = () => Object.entries(TITLES).map(([id, title], i) => ({
  id, title, state: state[id], status: "found", axis: ["new", "missing", "neglected", "poor"][i % 4], summary: "", source: "", missing: state[id] === "preuves" ? ["capture absente : docs/screenshots/x.png"] : [],
  anomalies: [],
}));

it.runIf(process.env.LIVE_SHOTS)("sert la demonstration", async () => {
  const here = __dirname;
  const server = createServer({
    parseBudgetEur: Number, panelHtml: "", assetsDir: here, moodboardHtml: () => readFileSync(join(here, "moodboard.html"), "utf8"),
    moodboard: async () => board(),
    runPipeline: async ({ onEvent }) => {
      const e = (x: BoucleEvent) => onEvent(x);
      const move = async (id: string, st: string, ms = 350) => { state[id] = st; e({ type: "card", sector: "implementation", cardId: id, agent: id }); await sleep(ms); };
      e({ type: "info", round: 1, cards: ["graphe", "filtre", "fiche"], message: "tournee 1 : 3 cartes" });
      for (const a of ["graphe", "filtre", "fiche"]) e({ type: "start", sector: "implementation", agent: a });
      await move("graphe", "en-cours"); await move("filtre", "en-cours"); await move("fiche", "en-cours");
      await move("graphe", "preuves"); await move("filtre", "preuves");
      e({ type: "end", sector: "implementation", agent: "graphe", ok: true }); await move("graphe", "termine");
      e({ type: "start", sector: "implementation", agent: "tri" }); await move("tri", "en-cours");
      await sleep(120_000);
      return { complete: false };
    },
  });
  await listen(server, 4750);
  await sleep(110_000);
  server.close();
});
