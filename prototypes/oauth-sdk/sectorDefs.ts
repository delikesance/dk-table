/**
 * Definitions des secteurs (prompts, chemins du design du run), extraites de sectors.ts pour tenir sous 200 lignes.
 * Usage : `import { SECTOR_DEFS, promptFor } from "./sectorDefs"` (re-exporte par sectors.ts).
 */
import type { Kind } from "./agentOptions";

/** Definition d'un secteur (prompt et outils). */
export interface SectorDef {
  id: "implementation" | "correction" | "design";
  /** Une seule requete melange choix et edition: think (sonnet), pas code (haiku). */
  kind: Kind;
  prompt: string;
  maxTurns: number;
  /** Part du plafond total reservee a ce secteur. */
  share: number;
}

const RULES =
  "Les regles du projet (CLAUDE.md) sont deja chargees: TDD (ecris un test qui echoue AVANT tout code, " +
  "lance `npm test`), fichiers de 200 lignes max, tout est documente. " +
  "Ne touche ni a git (pas de commit, branche, push) ni a TODO.md : la boucle s'en charge. Reponds brievement.";

/** Chemin horodate `docs/design/<date>-<HHmmss>.html` (UTC): un fichier par run, jamais ecrase. */
export function designPath(d: Date = new Date()): string {
  const iso = d.toISOString();
  return `docs/design/${iso.slice(0, 10)}-${iso.slice(11, 19).replace(/:/g, "")}.html`;
}
/** Recap associe a un design : `recap-` + meme horodatage. */
export function recapPath(design: string): string {
  return design.replace(/([^/]+)$/, "recap-$1");
}
const DESIGN = designPath(); // valeur par defaut dans les prompts; remplacee par celle du run (promptFor)
let current = DESIGN;
/** Fige le fichier de design du run qui commence (appele au debut du secteur design). */
export function beginDesignRun(d: Date = new Date()): string { return (current = designPath(d)); }
/** Fichier de design du run en cours (lu par l'implementation et le recap). */
export function currentDesignPath(): string { return current; }
/** Prompt du secteur avec le fichier de design du run courant. */
export function promptFor(s: SectorDef): string { return s.prompt.split(DESIGN).join(current); }

/** Definitions des trois secteurs, dans l'ordre d'execution (design d'abord). */
export const SECTOR_DEFS: SectorDef[] = [
  {
    id: "design", kind: "think", maxTurns: 40, share: 0.15,
    prompt:
      "Secteur design/UX, AVANT tout code. Lis src/styles/, " +
      "docs/recherche/fonctionnalites.md et TODO.md. Choisis les 1 a 3 meilleures idees non realisees et " +
      `produis UN fichier ${DESIGN} (nom exact, jamais ecrase: un design existant reste intact) : toile libre, page HTML autonome ` +
      "(CSS et JS en ligne; scripts, animations, canvas/SVG et interactions permis; aucune requete ni ressource externe: la CSP les bloque). " +
      "La page parente peut poser `data-theme=\"dark\"` ou `\"light\"` sur <html>: prevois les themes clair ET sombre (data-theme ET prefers-color-scheme). " +
      "Conventions et gabarit: skill `design-canvas` (.claude/skills/design-canvas). " +
      "Pour chaque idee: une maquette visuelle (ecrans et etats, tokens de " +
      "src/styles/, outil professionnel sans texte decoratif), animee quand le mouvement explique le comportement, puis une section interfaces/contrats " +
      "(fonctions, types, evenements, fichiers touches). Ne modifie aucun autre fichier. " +
      "Ne touche pas a git (la boucle s'en charge). Reponds brievement.",
  },
  {
    id: "implementation", kind: "think", maxTurns: 60, share: 0.4,
    prompt:
      `Secteur implementation. Les cartes a traiter sont listees plus bas : le lot est decide par la boucle, n'en choisis aucune autre. ` +
      `Si le design ${DESIGN} existe, construis dessus. Sans liste de cartes, replie-toi sur docs/recherche/fonctionnalites.md : ` +
      "choisis 1 a 3 fonctionnalites non realisees, prioritaires et petites. " + RULES,
  },
  {
    id: "correction", kind: "think", maxTurns: 40, share: 0.2,
    prompt:
      "Secteur correction. Lance `npm test` puis `npx tsc --noEmit`. Pour chaque echec ou erreur de " +
      "type, ecris un test qui reproduit le bug, puis corrige le code (jamais en affaiblissant un " +
      "test existant). Repete jusqu'a ce que tout soit vert. " + RULES,
  },
];
