# Rapport : Texte en colonnes
Statut : termine
Visible : oui

## Fait
- Moteur pur `src/engine/textsplit.ts`, dialogue `src/ui/dialogs/textToCols.ts`, entrée Données du menu, doc, e2e; largeur fixe (`widths`) et format texte par colonne (`formats`, préfixe `'`)

## Non fait
- Rien

## Preuves
- Tests : ok (13 tests : 9 textsplit/dialogue + 4 e2e inclus plafonds, vitest src/ui 768 ok)
- Captures : docs/screenshots/texte-en-colonnes/{dialogue,resultat}-{clair,sombre}.png

## Decisions
- Format par colonne: général/texte seulement (texte = apostrophe)
- Seule la 1re colonne de la sélection est découpée; cellules de droite écrasées
