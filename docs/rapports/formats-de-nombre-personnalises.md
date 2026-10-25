# Rapport : Formats de nombre personnalisés
Statut : termine
Visible : oui

## Fait

- Analyse et rendu d'un code à 1 à 4 sections (`src/ui/numfmtCustom.ts`) : `0`, `#`, `?`, `.`, `,` (milliers), `%`, `@`, littéraux entre guillemets, `\x`, littéraux nus (`€ $ - + ( ) :`).
- Négatif : signe automatique seulement avec une section ; zéro en 3e section ; texte en 4e section.
- Branchement dans `formatValue` (`src/ui/numfmt.ts`) via le préfixe `custom:` stocké dans `CellStyle.format`.
- Dialogue Format > Personnalisé… (`src/ui/dialogs/customFormat.ts`) : saisie, aperçu sur 1234,5 / -3 / 0, erreur sous le champ, Appliquer inactif si invalide.
- Alignement : nombre avec unité dans une cellule à format personnalisé aligné à droite (hook `numeric` sur la grille).
- Documentation : `docs/formats-personnalises.md`; CLAUDE.md (section décisions); TODO.md coché.

## Non fait

- Dates et heures dans un code personnalisé (`jj/mm/aaaa`, `h:mm`) : refusées avec un message (lettres non quotées). Le format « Date » prédéfini reste disponible.
- Notation scientifique (`E+`), fractions (`# ?/?`), couleurs `[Rouge]`, conditions `[>100]` : non pris en charge.
- Liste déroulante de la barre d'outils : un format personnalisé n'a pas d'entrée, le sélecteur reste vide sur ces cellules.
- Le design `docs/design/2026-10-25-180012.html` (validation, espion, plages tronquées) est sans rapport avec ce sujet : non utilisé comme base, la carte a été construite sur son libellé.

## Preuves

- Tests : ok (2346 tests passés, 4 ignorés, `npm test`; tsc `--noEmit` ok). Ajouts : `src/ui/numfmtCustom.test.ts` (16 cas), `src/ui/dialogs/customFormat.test.ts` (2), `src/ui/grid/cellkind.test.ts` (2 ajoutés, environnement jsdom).
- E2E : `e2e/feat-format-personnalise.spec.ts` (clair et sombre) ok; `e2e/edit-numfmt.spec.ts` ok (10 tests verts, 2 du nouveau spec inclus).
- Captures : docs/screenshots/formats-de-nombre-personnalises/dialogue-clair.png, docs/screenshots/formats-de-nombre-personnalises/resultat-clair.png, docs/screenshots/formats-de-nombre-personnalises/dialogue-sombre.png, docs/screenshots/formats-de-nombre-personnalises/resultat-sombre.png

## Decisions

- Stockage : `CellStyle.format = "custom:<code>"`, sans changer le schéma `.dktable` (validation `io/format.ts` inchangée, chaîne libre).
- Séparateurs d'affichage en fr-FR (`,` décimale, espace fine U+202F pour les milliers), cohérent avec `numfmt.ts`. Le code saisi utilise `.` (stockage canonique).
- Lettres sans guillemets refusées plutôt que affichées : évite les faux rendus (ex. `d` d'une date).
- Un nombre à format personnalisé est aligné à droite même avec unité (règle Excel), via le hook `numeric`, seulement si le texte contient un chiffre.
- Trancheur non sollicité : les choix ci-dessus découlent des conventions existantes du projet.
- Hors limite de 200 lignes : `TODO.md` (301 lignes) et `CLAUDE.md` (214) étaient déjà au-delà avant ce changement; non traité ici.
