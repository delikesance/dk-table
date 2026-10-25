# Saisie par formulaire

Palette « Saisie par formulaire… » (Ctrl+K) : ouvre un formulaire sur la feuille active.

- **Champs** : un par colonne dont la ligne 1 porte un nom. Le type se déduit des valeurs de la colonne : nombre, date (JJ/MM/AAAA ou AAAA-MM-JJ) ou texte. Une colonne vide ou mixte reste en texte.
- **Obligatoire** : case à cocher sous chaque champ. Un champ obligatoire vide bloque l'envoi (« Champ obligatoire »).
- **Envoi** (« Ajouter la ligne » ou Entrée dans un champ) : la saisie est contrôlée (`engine/form.ts` `checkForm`), puis écrite dans la ligne suivant la dernière ligne utilisée, en un seul pas d'annulation. Les champs sont ensuite vidés et la boîte reste ouverte.
- **Nombre** : la virgule est acceptée et écrite avec un point. **Date** : les dates impossibles (31/02) sont refusées.

Fichiers : `src/engine/form.ts` (pur: `formFields`, `nextRow`, `checkForm`), `src/ui/dialogs/form.ts` (boîte), `src/ui/dialogs/form.css`, commande dans `src/ui/commands.ts`.

Limites : les obligations ne sont pas enregistrées dans le classeur (elles repartent à l'ouverture de la boîte). Pas d'entrée dans la barre de menus.

Tests : `npx vitest run src/engine/form.test.ts src/ui/dialogs/form.test.ts`, e2e `e2e/feat-formulaire.spec.ts`.
