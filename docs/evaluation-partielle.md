# Évaluation partielle d'une sous-expression

Valeur d'un morceau de formule (un nœud de l'AST) dans la feuille courante, comme pour le F9 d'Excel sur une sélection.

- `src/engine/partialEval.ts`
  - `evalNode(sheet, node)`: évalue un nœud avec le même évaluateur et les mêmes valeurs que le recalcul. Les erreurs (`#DIV/0!`, `#REF!`…) reviennent comme valeurs intermédiaires.
  - `findNode(ast, text)`: nœud dont le texte correspond à `text` (espaces et casse ignorés). Le plus extérieur gagne en cas de doublon.
  - `evalSelection(sheet, formula, text)`: pour une sélection `text` dans `formula` (texte après « = »). Renvoie `{ node, value }` ou `undefined` (formule invalide, aucun nœud).
- `src/engine/unparse.ts`: AST -> texte (parenthèses selon la précédence), aller-retour vérifié par `unparse.test.ts`. `normText` compare sans espaces ni casse.

Usage (moteur seul, pas d'UI pour l'instant) :

```ts
const hit = evalSelection(sheet, "(A1+1)*B1-A2", "(A1+1)*B1");
hit?.value; // valeur de (A1+1)*B1
```

Limite : la comparaison de texte ignore les espaces, donc `"a b"` et `"ab"` dans une chaîne littérale seraient confondus.
