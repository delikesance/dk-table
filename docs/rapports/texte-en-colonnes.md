# Rapport : Texte en colonnes
Statut : termine
Visible : oui

## Fait
- Moteur pur `src/engine/textsplit.ts`, dialogue `src/ui/dialogs/textToCols.ts`, entrée Données du menu, doc, e2e; largeur fixe (`widths`) et format texte par colonne (`formats`, préfixe `'`)

## Non fait
- Rien

## Preuves
- Tests : ok (15 tests : textsplit + dialogue, tsc --noEmit ok)
- Captures : docs/screenshots/texte-en-colonnes/{dialogue,resultat}-{clair,sombre}.png

## Decisions
- Format par colonne: général/texte seulement (texte = apostrophe)
- Design 2026-10-25-162708.html sans rapport avec la carte (Espion) : ignoré
- Seule la 1re colonne de la sélection est découpée; cellules de droite écrasées
