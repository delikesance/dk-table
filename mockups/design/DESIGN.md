# dk-table - design system

## Principes
- Clavier d'abord, peu de clics : chrome minimal, la grille domine.
- Épuré et aéré : bordures hairline (0,5px), ombres rares, pas de dégradés.
- Un seul accent ; tout le reste est neutre.
- Chiffres tabulaires en cellules, monospace pour formules.
- Clair/sombre via `prefers-color-scheme`, zéro dépendance ni réseau.
- Contrastes AA vérifiés par valeur choisie (texte >= 5:1).

## Identité singulière : accent « encre » + curseur à cran
- Accent unique : bleu-encre indigo (`--c-accent`), seul élément coloré hors états.
- Curseur de cellule : anneau 2px intérieur + petit cran carré détaché en coin (poignée de remplissage).
- Repère de position : en-têtes sélectionnés = voile + point d'accent de 4px (pas de bordure épaisse).
- Dépendances : précédents ambre, dépendants cyan, en filet 1px.

## Tokens (tokens.css)
| Famille | Variables |
|---|---|
| Surfaces | `--c-bg`, `--c-surface`, `--c-surface-2`, `--c-surface-hover`, `--c-overlay`, `--c-scrim` |
| Texte | `--c-text`, `--c-text-2`, `--c-text-3`, `--c-text-on-accent` |
| Lignes | `--c-line`, `--c-line-strong` |
| Accent | `--c-accent`, `-hover`, `--c-accent-soft`, `--c-accent-soft-2` |
| États | `--c-error(-soft)`, `--c-success(-soft)`, `--c-readonly-bg/text` |
| Dépendances | `--c-dep-in(-soft)`, `--c-dep-out(-soft)` |
| Typo | `--font-ui`, `--font-mono`, `--fs-xs..xl` (11-20px), `--fw-*`, `--lh-*`, `--num` |
| Espaces | `--s-1..12` (4px a 48px) |
| Rayons | `--r-xs`, `-sm`, `-md`, `-lg`, `-pill` |
| Ombres | `--sh-1`, `--sh-2`, `--sh-3`, `--focus-ring` |
| Mouvement | `--dur-fast/base/slow` (80/140/240ms), `--ease-out`, `--ease-inout` |
| Grille | `--cell-h/w/px`, `--row-header-w`, `--col-header-h`, `--toolbar-h`, `--formula-h`, `--tabs-h`, `--sidebar-w`, `--cursor-w`, `--notch` |

## Composants (components.css, racine `.dk-app`)
- Cellule : `.dk-cell` + `--num`, `--range`, `--active`, `--editing`, `--error`, `--readonly`, `--dep-in`, `--dep-out`
- En-têtes : `.dk-header` + `--row`, `--selected` (survol natif)
- Barre d'outils : `.dk-toolbar`, `.dk-toolgroup`, `.dk-toolsep`, `.dk-iconbtn` + `--active`, `.dk-kbd`
- Formule : `.dk-formula`, `__name`, `__fx`, `__input`, `--error`
- Latérale : `.dk-sidebar`, `.dk-section` (+ `--closed`), `__head`, `__chev`, `__body`, `.dk-list`, `.dk-item` + `--selected`, `--disabled`, `__meta`
- Onglets : `.dk-tabs`, `.dk-tab` + `--active`, `--add`
- Palette : `.dk-scrim`, `.dk-palette`, `__input`, `__list`, `__item` + `--selected`
- Menu : `.dk-menu`, `__item` + `--hover`, `--disabled`, `--danger`, `__sep`

Planche de référence : `composants.html`.
