# Rapport : Valeur cible (Goal Seek)
Visible : oui

## Fait
- Lecture du design `docs/design/2026-10-25-220125.html` (existe) et de `src/engine/solve.ts` (`solveRate`: Newton puis bissection, réutilisable).
- Rapport créé.

## Non fait
- Test TDD qui échoue (aucun test écrit).
- `src/engine/goalSeek.ts` : recherche de l'entrée (Newton/bissection via `solve.ts`, tolérance, nombre max d'itérations, échec explicite).
- Refus si la cellule d'entrée contient une formule ou si la cible n'a pas de formule.
- Dialogue d'UI (`src/ui/dialogs/`), écriture de la valeur seulement après confirmation.
- Entrée de menu/palette (Données > Valeur cible).
- Captures Playwright clair/sombre dans `docs/screenshots/valeur-cible-goal-seek/`.
- Documentation (`docs/valeur-cible.md`) et mise à jour de CLAUDE.md.

## Captures

## Decisions
- Le module moteur ira dans `src/engine/goalSeek.ts` (pur), l'UI dans `src/ui/dialogs/goalSeek.ts`, pour rester sous 200 lignes par fichier.

## Bloque
- Budget de la session épuisé (quasi nul) avant d'écrire le test et le code. La carte est à reprendre par une nouvelle tournée.
