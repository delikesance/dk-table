---
name: design-canvas
description: Concevoir ou brainstormer une interface, une idée ou un flux sur la toile libre de la page Design de la Boucle (docs/design/*.html, scripts et animations permis). À utiliser pour tout design, maquette animée, comparaison de pistes ou schéma interactif de dk-table.
---

# Toile de design

La page Design de la Boucle (`/design.html`) affiche chaque fichier `docs/design/<date>-<HHmmss>.html`
dans un cadre isolé. La toile est **vierge** : tu la contrôles entièrement, en HTML, CSS et JavaScript.

## Où écrire

- Un fichier par design : `docs/design/AAAA-MM-JJ-HHmmss.html` (UTC). Un design existant n'est jamais écrasé :
  pour une variante, crée un nouveau fichier. Le récap `recap-…html` est produit par la Boucle, pas par toi.
- Le fichier est **autonome** : CSS et JS en ligne dans le même fichier. Aucune requête réseau, aucune
  ressource externe (polices, CDN, images distantes) : la politique de sécurité du serveur les bloque.
  Images : SVG en ligne ou `data:`.
- Point de départ : `.claude/skills/design-canvas/starter.html` (jetons Hermes, deux thèmes, animation,
  section interfaces).

## Ce qui est permis

- Scripts, `requestAnimationFrame`, `<canvas>`, SVG animé, animations et transitions CSS, Web Animations,
  interactions (clic, survol, clavier), état local en mémoire.
- Pas de `localStorage`, pas de navigation, pas de pop-up, pas de formulaire envoyé : le cadre est sans origine.

## Ce que la page Design pilote pour toi

La page parente envoie des messages au design (un petit script est injecté, tu n'as rien à écrire) :

- **Thème** : `data-theme="light"` ou `"dark"` est posé sur `<html>` (et `color-scheme`). Écris les deux :
  jetons sous `:root[data-theme="dark"]` **et** sous `@media (prefers-color-scheme: dark)`
  (avec `:root:not([data-theme="light"])`).
- **Pause** : les animations CSS et Web Animations sont figées (un `*{animation-play-state:paused}` est injecté).
  Pour tes animations en JavaScript, respecte `document.hidden` et évite les `setInterval` sans fin.
- **Erreurs** : les erreurs, promesses rejetées et `console.error`/`console.warn` remontent dans le panneau
  « Erreurs du design ». Un design propre n'en affiche aucune.
- **Largeurs** : Mobile 390, Tablette 820, Bureau 1200, Large 1600, Libre. Pense responsive.

## Règles de fond

- Respecte la DA (CLAUDE.md, section Design) : bleu #0000F2, papier #F2F2F2, nuit #19192F ; Inter Tight,
  DM Mono, Sofia Sans Extra Condensed ; rayons 2-4 px ; pas d'ombre hors surfaces flottantes.
- Outil professionnel : aucun texte décoratif, aucune astuce, aucun bouton en double.
- Chaque idée : un écran par état important, **clair ET sombre**, puis une section « Interfaces et contrats »
  (fonctions, types, événements, fichiers touchés) que l'implémentation lira.
- Le mouvement doit expliquer (propagation d'un recalcul, transition d'état), pas décorer. Respecte
  `prefers-reduced-motion`.
- Pour brainstormer : une page peut montrer plusieurs pistes côte à côte, avec leurs compromis ; la page
  Design sait comparer deux fichiers.
- Tu peux utiliser tous tes outils et skills habituels pour préparer le design ; ne touche pas à git.
