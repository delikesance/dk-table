# Rapport : Carte des dépendances interactive
Statut : termine
Visible : oui

## Fait
- Moteur `engine/model/depmap.ts` (réutilisé) : précédents/dépendants entre feuilles, cellules vivantes, documents dk doc.
- Panneau `ui/dialogs/depmap.ts` (réutilisé) : navigation au clic (feuille + cellule, ou document).
- Câblage palette Ctrl+K : commande `data.depmap` « Qui utilise cette cellule ? » (`src/ui/commands.ts`), test `src/ui/commandsDepmap.test.ts`.
- E2E `e2e/feat-depmap.spec.ts` (captures clair/sombre, clic de navigation).

## Non fait
- Pas de raccourci clavier ni d'entrée dans la barre de menus (palette seule, règle « pas de doublon »).

## Preuves
- Tests : ok (2123 tests)
- Captures : docs/screenshots/carte-des-dependances-interactive/panneau-clair.png, docs/screenshots/carte-des-dependances-interactive/panneau-sombre.png, docs/screenshots/carte-des-dependances-interactive/navigation-clair.png, docs/screenshots/carte-des-dependances-interactive/navigation-sombre.png

## Decisions
- Design `2026-10-25-162708.html` (Espion/Historique) lu; la carte demandée = panneau existant, seul le câblage manquait.
- Point d'entrée = palette uniquement.
