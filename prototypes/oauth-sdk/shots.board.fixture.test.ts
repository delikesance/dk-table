// @vitest-environment node
/**
 * Serveur de demonstration pour les captures du moodboard et de la toile design (inactif sans BOARD_SHOTS=1).
 * Usage : `BOARD_SHOTS=1 npx vitest run prototypes/oauth-sdk/shots.board.fixture --testTimeout=300000` puis, dans un autre
 *        terminal, `node prototypes/oauth-sdk/shots.board.mjs <dossier> [port]` (le serveur ecoute 127.0.0.1:4747 ~4 min).
 * Vrai serveur (CSP, runtime injecte, routes /reports et /shots) avec des donnees de demonstration realistes.
 */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "vitest";
import { createServer, listen } from "./server";
import { listDesigns, readDesign } from "./designs";

const C = (id: string, title: string, state: string, axis: string, summary: string, extra: object = {}) => ({ id, title, state, status: "found", axis, summary, source: summary, missing: [], ...extra });
const CARDS = [
  C("graphe-de-dependances", "Graphe de dépendances", "termine", "new", "Flèches entre précédents et dépendants au survol."),
  C("validation-de-donnees", "Validation de données", "termine", "missing", "Listes déroulantes et règles par plage."),
  C("tableau-croise", "Tableau croisé dynamique", "preuves", "missing", "Synthèse par glisser-déposer.", { missing: ["captures"] }),
  C("recherchex", "RECHERCHEX", "en-cours", "missing", "Recherche bidirectionnelle sans colonne pivot."),
  C("filtre-dynamique", "Fonction FILTRE", "en-cours", "missing", "Plage dynamique filtrée par condition."),
  C("annulation-macro", "Annulation après macro", "bloque", "poor", "Excel la perd; dk-table la conserve."),
  C("historique-cellule", "Historique par cellule", "piste", "new", "Journal local des valeurs précédentes."),
  C("vue-fiche", "Vue fiche d'une ligne", "idee", "new", "Formulaire par enregistrement."),
  C("mise-en-page-impression", "Mise en page d'impression", "idee", "neglected", "Aperçu et sauts de page."),
  C("collage-special", "Collage spécial", "idee", "poor", "Valeurs, formats, transposé."),
];
const REPORTS: Record<string, unknown> = {
  recherchex: { id: "recherchex", state: "en-cours", missing: [], markdown: "", report: { title: "RECHERCHEX", status: "en-cours", visible: true,
    done: ["Test rouge écrit : 6 cas (exact, approché, plage, absent, erreur)", "Parseur des arguments optionnels", "Recherche de haut en bas et de bas en haut"], todo: ["Mode joker (*, ?)", "Documentation FR dans fndocs"],
    tests: "ok (18 tests)", screenshots: ["docs/screenshots/boucle/apres-en-cours-clair.png", "docs/screenshots/boucle/apres-en-cours-sombre.png"], decisions: ["Joker désactivé par défaut (décision du trancheur : compatibilité Excel)"] } },
  "tableau-croise": { id: "tableau-croise", state: "preuves", missing: ["captures"], markdown: "", report: { title: "Tableau croisé dynamique", status: "termine", visible: true,
    done: ["Agrégations somme / moyenne / nombre", "Regroupement par ligne et colonne"], todo: [], tests: "ok (31 tests)", screenshots: [], decisions: [] } },
  "validation-de-donnees": { id: "validation-de-donnees", state: "termine", missing: [], markdown: "", report: { title: "Validation de données", status: "termine", visible: true,
    done: ["Listes déroulantes", "Règles numériques et dates", "Message d'erreur personnalisé"], todo: [], tests: "ok (24 tests)", screenshots: ["docs/screenshots/boucle/apres-termine-clair.png"], decisions: [] } },
};

it.runIf(process.env.BOARD_SHOTS)("sert la demonstration", async () => {
  const here = __dirname;
  const png = readFileSync(join(here, "..", "..", "docs", "screenshots", "boucle", "apres-en-cours-clair.png"));
  const ddir = mkdtempSync(join(tmpdir(), "designs-"));
  const starter = join(here, "..", "..", ".claude", "skills", "design-canvas", "starter.html");
  copyFileSync(starter, join(ddir, "2026-10-25-100000.html"));
  const v2 = readFileSync(starter, "utf8").replace("Titre du design", "Variante B : bandeau de recalcul").replace("Idée 1 — propagation visible des recalculs", "Idée 1 — bandeau de recalcul");
  writeFileSync(join(ddir, "2026-10-25-110000.html"), v2);
  writeFileSync(join(ddir, "2026-10-25-120000.html"), readFileSync(starter, "utf8").replace("</script>", "console.error('Largeur de colonne invalide : NaN');\n</script>"));
  const steps = [{ type: "start", sector: "design" }, { type: "file", sector: "design", message: "2026-10-25-100000.html", state: "ecrit" }, { type: "file", sector: "design", message: "2026-10-25-110000.html", state: "ecrit" }, { type: "end", sector: "design", ok: true, costUsd: 0.8 }];
  const server = createServer({
    parseBudgetEur: Number, panelHtml: () => readFileSync(join(here, "panel.html"), "utf8"), assetsDir: here,
    moodboardHtml: () => readFileSync(join(here, "moodboard.html"), "utf8"), designHtml: () => readFileSync(join(here, "design.html"), "utf8"),
    moodboard: async () => CARDS, report: async (id) => REPORTS[id] ?? null, shot: async () => png,
    designs: { list: async () => listDesigns(ddir), read: (n) => readDesign(ddir, n), steps: () => steps },
    runPipeline: async ({ onEvent }) => { onEvent({ type: "card", cardId: "recherchex" }); return { complete: false }; },
  });
  await listen(server, 4747);
  await new Promise((r) => setTimeout(r, 240_000));
  server.close();
});
