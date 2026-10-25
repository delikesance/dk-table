# Rapport : Tableaux croises de Calc incomplets (non verifie)
Statut : termine
Visible : oui

## Fait
- `src/engine/pivot.ts` `defaultSpec` : lignes = 1re colonne texte dont les valeurs se repetent (sinon 1re texte); valeur = 1re colonne numerique hors identifiant (id, n°, num, code, ref, annee, year); agregation SUM. Doc comment mis a jour.
- Tests ecrits d'abord (rouge constate) : `src/engine/pivot.test.ts` (2 cas ajoutes).
- Base existante inchangee : `pivot.ts`, `pivotCalc.ts` (champ calcule), dialogue `ui/dialogs/pivot.ts`.

## Non fait
- Pas de graphique croise.
- Pas de nouveau champ calcule (deja present).
- Pas de changement de mise en page du dialogue (seulement la preselection).

## Preuves
- Tests : ok (2214 tests, 4 ignores). `npx tsc --noEmit` ok. e2e `e2e/feat-pivot-defaut.spec.ts` : 2 ok.
- Captures : docs/screenshots/tableaux-croises-de-calc-incomplets-non-verifie/disposition-defaut-clair.png, disposition-defaut-sombre.png (dialogue initial : Lignes=Region, Valeur=Montant malgre colonnes Ref et Id). Anciennes : dialogue-*.png, resultat-*.png.

## Decisions
- Carte non verifiee (ask.libreoffice.org) : une seule amelioration, disposition par defaut claire.
- Colonne unique par ligne (identifiant) evitee en lignes : sinon le TCD ferait une ligne par enregistrement.
- Pas de colonnes par defaut.
