# dk doc : documents de texte dans le classeur

Un dk doc est un document de texte rangé dans le même `.dktable` que les feuilles. On l'écrit en Markdown ; la syntaxe ne se voit que sous le curseur (rendu « Live Preview » d'Obsidian). Il cite des cellules, des plages et des graphiques par référence et calcule dans le texte.

## Décisions

- **Un seul classeur** : les documents sont dans `DktDoc.docs` (optionnel, absent des anciens fichiers). Un onglet par document, à la suite des feuilles, marqué d'un petit rectangle de page.
- **Le texte Markdown est le document** (comme Obsidian). Éditeur = CodeMirror 6 (`doc/editor.ts`) chargé à la première ouverture (`import("../doc/editor")`) ; plus de ProseMirror. Historique propre à chaque document (`@codemirror/commands`) ; `app.undo/redo` s'adressent à l'éditeur quand un document est ouvert.
- **Références en lecture seule** : un document lit le moteur, il n'entre jamais dans le graphe de dépendances. Le texte stocké désigne la feuille par son `id`, l'éditeur montre son nom (`doc/md/names.ts`).

## Style du document

Le contenu d'un document ne suit pas la charte Hermes : page A4 blanche (21 cm, marges 2,5 cm), Times New Roman 12 pt, interligne 1,5, titres noirs en gras (18 / 14 / 12 pt), tableaux à bordures noires, puces de valeur soulignées en pointillé. L'export HTML / PDF reprend le même style (`@page A4`, `exportHtml.ts`). Seuls le cadre de l'application et ses barres gardent la charte. Test : `doc/exportStyle.test.ts`.

## Format

```json
{ "version": 1, "sheets": [], "docs": [ { "id": "s…", "name": "Rapport T1", "md": "# Titre\n\nCA : {{@s1!B3}}\n" } ] }
```

`md` est le Markdown. Validation : `io/docsFormat.ts` (id unique parmi feuilles et documents, nom, `md` texte, clés inconnues ignorées). Les anciens fichiers (`content` = JSON ProseMirror) sont convertis en Markdown à l'ouverture (`doc/md/fromJson.ts`) ; ils sont réécrits en `md` à l'enregistrement.

Syntaxe des éléments vivants (dans le texte stocké ; l'éditeur montre les noms de feuilles) :

| Élément | Syntaxe |
| --- | --- |
| Référence | `{{@Feuille!B3}}`, plage `{{@Feuille!A3:D4}}` |
| Calcul | `{{=formule}}`, `{{=formule|percent}}` (format : Auto si absent) |
| Bloc lié | fence ```` ```dkblock ```` + une ligne JSON `{sheet, ref, kind: table|bar|trend, header, cols, value}` |
| Souligné | `<u>…</u>` |

## Live Preview (comment ça marche)

Comme Obsidian : l'arbre syntaxique Lezer Markdown (`doc/md/chipParser.ts`, avec l'élément inline `Chip` pour que `*` et `_` d'une formule ne soient pas lus comme de l'emphase) donne, à chaque changement de texte ou de sélection, un ensemble de décorations (`doc/live/decorations.ts`, un `StateField`) :

- **Inline, par élément** : `**`, `*`, `` ` ``, `[](…)`, `<u>` sont cachés tant que la sélection ne touche pas l'élément ; le contenu reçoit sa classe (`dk-strong`, `dk-em`…).
- **Par ligne** : le `#` d'un titre, le `>` d'une citation, le `-` d'une liste (dessiné en puce `•`) et `---` (trait) réapparaissent quand le curseur est sur la ligne.
- **Par bloc** : une fence `dkblock` est remplacée par son tableau / graphique tant que le curseur n'est pas dedans.
- **Puces** : `{{@…}}` et `{{=…}}` sont remplacés par leur valeur (widgets, `doc/live/widgets.ts`) ; la source apparaît quand le curseur est strictement dedans (flèches, ou clic sur un calcul). Clic sur une référence = ouvrir la cellule (`Alt+←` revient au document). Entrée / Tab dans une puce en sort ; Retour arrière juste après une puce la supprime entière.
- Sans classeur (éditeur de texte seul), les puces restent du texte.

## Blocs de code

- Un bloc ```` ```langage ```` est cadré (filet noir, fond gris clair, police à chasse fixe). Loin du curseur, les lignes ``` sont masquées et le nom du langage s'affiche en petit en haut à droite ; le curseur dans le bloc montre les ``` bruts.
- Colorisation par langage (`@codemirror/language-data`, analyseur chargé à la demande au premier bloc du langage) : `doc/live/codeHighlight.ts`, classes `dk-t-*` sobres (mots-clés en gras noir, chaînes vert foncé, nombres brun, commentaires gris italique, types/fonctions bleu marine).
- Export HTML/PDF : même cadre et même étiquette de langage, sans couleurs (l'export est synchrone et sans analyseur) ; l'export Markdown conserve le langage.

## Code

- `doc/editor.ts` éditeur CodeMirror ; `doc/store.ts` liste des documents ; `doc/doc.css`, `doc/blocks.css` mise en page.
- `doc/md/` : `chip.ts` (syntaxe des puces et blocs), `chipParser.ts`, `toJson.ts` / `fromJson.ts` (Markdown ↔ JSON, pour les exports et la migration), `names.ts` (ids ↔ noms de feuilles), `format.ts` (commandes Gras, Titre, listes… = ajout / retrait de syntaxe).
- `doc/live/` : `decorations.ts`, `widgets.ts`, `host.ts` (classeur, calculateur, version de rafraîchissement), `keys.ts` (raccourcis, règle `=`), `mention.ts` (listes `@` et fonctions).
- `ui/appDocs.ts` : ouverture / fermeture de la vue document, création, suppression, renommage.
- API `App` : `addDoc()`, `openDoc(id)`, `removeDoc(id)`, `activeDocId()`, `docEditor()`. Palette : « Nouveau document ».

## Références vivantes

- `@` dans le texte : `doc/live/mention.ts` liste les cases trouvées par leurs noms (« bob ca » trouve « Bob · CA_T1 »), par valeur ou par adresse (`searchRefs`) ; Entrée insère `{{@Feuille!B3}}`.
- Lecture seule : `doc/refs.ts` lit le moteur (`getDisplay`, `getRaw`). Rafraîchissement : `DocEditor.refresh()` appelé par `touch` et `refreshTabs`. `#REF!` si la cible a disparu.

## Blocs liés

- `doc/blocks.ts` lit la plage (texte affiché formaté + nombres), choisit les colonnes (`tableView`) et prépare les séries (`chartData` : 1re colonne = étiquettes, « value » = dernière colonne par défaut). `doc/blockRender.ts` dessine tableau, barres ou courbe + flèche (`engine/live`). Barre au survol : forme et En-tête (elle réécrit la ligne JSON) ; colonnes et valeur se changent dans le JSON (curseur dans le bloc).
- Coller : la grille annonce chaque copie (`onCopy` → `Ctx.lastCopy {text, sheet, ref}`). Coller ce même texte insère une puce (une cellule) ou un bloc tableau lié (plage) ; tout autre texte est collé tel quel.
- Pas repris du rendu précédent : la carte au survol d'une puce (l'adresse est en info-bulle) et la sélection de cellules dans un tableau lié (« Citer la sélection »).

## Menus, vue scindée, exports

- **Menus** : avec un document ouvert, la barre devient Fichier, Édition, Format, Insertion, Scripts, Affichage, Aide (`ui/menubar/docSpec.ts`, `Ctx.rebuildMenus`). Format ajoute ou retire la syntaxe Markdown (`DocEditor.command`, `doc/md/format.ts`) ; Ctrl+B / I / U, Ctrl+Alt+0-3. Insertion : « Cellule liée » tape `@`, « Tableau lié » et graphiques lient la plage sélectionnée (zone utilisée si une seule cellule), « Calcul » insère `{{=}}`.
- **Vue scindée** `Ctrl+\` (`appDocs.toggleSplit`, `Ctx.split`) : grille à gauche, document à droite ; cliquer une puce sélectionne la cellule sans quitter le document.
- **Exports** : `doc/exportMd.ts`, `exportHtml.ts` (+ `exportShared.ts`) lisent le JSON de `mdToJson(md)` et les valeurs courantes ; une puce devient sa valeur, un bloc un tableau. Markdown et HTML passent par la boîte d'enregistrement (`io/docFiles.ts`), PDF par l'impression d'un iframe (`ui/docPrint.ts`). Boîte `ui/dialogs/exportDoc.ts` (Ctrl+E).
- Non vérifié : l'impression PDF dans les fenêtres Tauri (WebView2, WebKitGTK).

## Calculs dans le texte

- `=` en début de mot ou de ligne (ou Insertion > Calcul) ouvre `{{=}}` curseur dedans : formule avec la syntaxe des cellules, complétion des fonctions, `@bob ca` insère l'adresse d'une case. Entrée / Tab sortent de la puce. Format : suffixe `|percent` (Auto si absent).
- Le texte stocké contient les feuilles par identifiant (`{s1}!B3`), donc une feuille renommée ne casse pas la formule ; l'éditeur montre les noms (`doc/calcSrc.ts`). Limite : renommer une feuille pendant qu'un document est ouvert ne met pas son texte à jour avant la réouverture.
- Calcul : `doc/calc.ts` donne une cellule d'une feuille de travail rattachée au classeur par `engine/book.ts attachTo` sans y être listée ; rien ne la lit, donc aucun cycle. Format Auto : une formule qui n'est qu'une référence garde le format de la cellule citée.
- Mini-graphiques : `SPARKLINE(plage)`, `BAR(plage)`, `TREND(plage)` en formule entière s'affichent en SVG dans la ligne.
- Pas encore : blocs « Calcul » à lignes libellées, variables nommées, références entre puces.

## Tests

`npx vitest run src/doc src/ui/appDoc src/io/format.docs.test.ts`, puis `npx playwright test e2e/feat-doc.spec.ts` (navigateur).
