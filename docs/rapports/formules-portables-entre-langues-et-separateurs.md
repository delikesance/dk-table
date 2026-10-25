# Rapport : Formules portables entre langues et séparateurs
Statut : termine
Visible : oui

## Fait

- Design lu : `docs/design/2026-10-25-180012.html` existe mais traite validation / espion / plages tronquées ; aucune section sur la syntaxe des formules. Non utilisé comme base (voir Décisions).
- Rapport créé avant le code.

## Non fait

- Fonctions traduites (SOMME, SI...) : hors périmètre, les noms restent canoniques.
- Syntaxe `$Feuille.A1` (LibreOffice) à l'entrée : non acceptée, dk-table utilise déjà `Feuille!A1`.
- Réglage utilisateur de la langue des formules : non fait, la langue vient de `navigator.language`.
- Codes de format TEXT localisés : non fait, les chaînes restent canoniques (voir Décisions).

## Preuves

- Tests : ok (2326 tests)
- Captures : docs/screenshots/formules-portables-entre-langues-et-separateurs/barre-fr-clair.png, docs/screenshots/formules-portables-entre-langues-et-separateurs/barre-fr-sombre.png

## Décisions

- Stockage canonique inchangé : le `.dktable` garde `,` pour les arguments et `.` pour les décimales ; seule l'interface convertit.
- Langue « décimale = `,` » (fr, de, es, it, pt, nl...) : séparateur d'arguments `;` (règle Excel). Sinon `,` et `.`.
- Conversion seulement sur les textes commençant par `=`, hors chaînes littérales, noms de feuilles entre apostrophes et jetons d'erreur.
- Points d'entrée : barre de formule (`ui/toolbar/formulabar.ts`), éditeur de cellule (`ui/grid/editor.ts`), texte brut de la cellule dans la barre latérale.
- Chaînes littérales (TEXT inclus) : non traduites, par décision du trancheur : une chaîne est une donnée; la traduire changerait sa valeur (`"1.5"` -> `"1,5"`) et casserait le format lu par TEXT.
- Le collage et le remplissage restent en syntaxe canonique (ils ne passent pas par la saisie).
