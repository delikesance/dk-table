# Atteindre spécial (Ctrl+G)

Sélectionne d'un coup les cellules d'une feuille répondant à un critère, comme Excel (Ctrl+G > Spécial).

## Utilisation
- `Ctrl+G`, menu Édition > « Atteindre spécial… », ou palette (Ctrl+K) : boîte « Atteindre spécial ».
- Cible : **Cellules vides** (dans la zone utilisée, A1 jusqu'à la dernière ligne/colonne non vide), **Formules**, **Constantes** (saisies sans `=`).
- Pour formules et constantes : types de résultat **Nombres / Texte / Logique / Erreurs** (tous cochés par défaut).
- **Cellules visibles seulement** : ignore les lignes masquées par filtre.
- OK : la première cellule trouvée devient la cellule active, les autres sont marquées (classe `dkg-special`, fond d'accent). Aucune cellule : message, la boîte reste ouverte. La marque tombe au prochain changement de sélection.

## Code
- `src/engine/special.ts` : `specialKeys(sheet, {kind, types, visible})`, pur, clés triées ligne par ligne. Type d'une valeur : `valueType`.
- `src/ui/appSpecial.ts` : `goSpecial(c, choix)` (sélection + marque), `markSpecial`, `clearSpecial` (appelé par `onSelect` de la grille).
- `src/ui/dialogs/goToSpecial.ts` : la boîte (une instance, `openDialog`). `src/ui/special.css` : marque et boîte.
- Câblage : `appApi.ts` (`goSpecial`), `appTypes.ts`, `appState.ts` (`special`), `appGrid.ts` (marque sur cellules créées), `commands.ts` (palette + `Ctrl+G`), `menubar/spec.ts` (Édition).

## Limites
- Une seule zone de sélection : les cellules trouvées ne sont pas sélectionnées ensemble (pas de sélection multi-zones dans la grille) ; elles sont marquées, la cellule active est la première.
- Les booléens et erreurs saisis hors formule (`TRUE`, `#N/A`) sont du texte dans le moteur ; seules les formules donnent logique et erreurs.
- « Cellule… » (aller à) reste la zone de nom.
- Types ignorés pour « Cellules vides ».
