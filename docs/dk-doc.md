# dk doc : documents de texte dans le classeur

Un dk doc est un document de texte riche (titres, listes, citation, gras / italique / souligné / lien) rangé dans le même `.dktable` que les feuilles. Il cite des cellules, des plages et des graphiques par référence (phases 2 et 3).

## Décisions

- **Un seul classeur** : les documents sont dans `DktDoc.docs` (optionnel, absent des anciens fichiers). Un onglet par document, à la suite des feuilles, marqué d'un petit rectangle de page.
- **ProseMirror direct** (sans TipTap). Le code éditeur est chargé à la première ouverture d'un document (`import("../doc/editor")`) : chunk ~65 Ko gzip, le chunk de démarrage ne grossit que de ~3 Ko.
- **Références en lecture seule** (phase 2) : un document lit le moteur, il n'entre jamais dans le graphe de dépendances. Les nœuds désignent la feuille par son `id` (déjà stable dans le format), pas par son nom.
- **Annuler** : historique propre à chaque document (`prosemirror-history`). `app.undo/redo` s'adressent à l'éditeur quand un document est ouvert.

## Format

```json
{ "version": 1, "sheets": [], "docs": [ { "id": "s…", "name": "Rapport T1", "content": { "type": "doc", "content": [] } } ] }
```

`content` est le JSON ProseMirror. Validation : `io/docsFormat.ts` (id unique parmi feuilles et documents, nom, racine `{type:"doc"}`, clés inconnues ignorées).

## Code

- `doc/schema.ts` schéma ; `doc/emptyDoc.ts` document vide (sans dépendance ProseMirror) ; `doc/store.ts` liste des documents ; `doc/editor.ts` éditeur ; `doc/doc.css` mise en page.
- `ui/appDocs.ts` : ouverture / fermeture de la vue document, création, suppression, renommage.
- API `App` : `addDoc()`, `openDoc(id)`, `removeDoc(id)`, `activeDocId()`, `docEditor()`. Palette : « Nouveau document ».

## Références vivantes (phase 2)

- Nœud inline `cellRef {sheet: id de feuille, ref: "B3" ou "A3:D4"}`. Puce `dk-ref` (valeur formatée comme la cellule, `#REF!` si la cible a disparu), carte au survol (adresse, valeur, formule), clic = ouvrir la cellule, `Alt+←` = revenir au document.
- `@` dans le texte : `doc/mention.ts` liste les cases trouvées par leurs noms (« bob ca » trouve « Bob · CA_T1 »), par valeur ou par adresse (`searchRefs`). Flèches / Entrée / Tab / Échap.
- Lecture seule : `doc/refs.ts` lit le moteur (`getDisplay`, `getRaw`) sans entrer dans le graphe de dépendances. Rafraîchissement : `DocEditor.refresh()` appelé par `touch` et `refreshTabs`.

## Blocs liés (phase 3)

- Nœud bloc `liveBlock {sheet, ref, kind: table|bar|trend, header, cols, value}`. `doc/blocks.ts` lit la plage (texte affiché formaté + nombres), choisit les colonnes (`tableView`) et prépare les séries (`chartData` : 1re colonne = étiquettes, colonne « Valeur » = dernière par défaut). `doc/blockRender.ts` dessine tableau, barres ou courbe + flèche (`engine/live`). `doc/blockView.ts` : vue du nœud, barre flottante (forme, En-tête, Colonnes n/N, Valeur), `#REF!` si la feuille a disparu.
- Coller : la grille annonce chaque copie (`onCopy` → `Ctx.lastCopy {text, sheet, ref}`). Coller ce même texte dans un document insère une puce (une cellule) ou un bloc tableau lié (plage) ; tout autre texte est collé tel quel (`doc/paste.ts`).
- Morceau d'un tableau lié : glisser sur des cellules affiche « Citer la sélection · A3:D4 » (puce de plage sous le bloc) et « Nouveau bloc lié » (`doc/blockPick.ts`). Les colonnes masquées sont comptées dans l'adresse.
- Mode « Figé » non implémenté (non spécifié).

## Tests

`npx vitest run src/doc src/ui/appDocs.test.ts src/io/format.docs.test.ts`.
