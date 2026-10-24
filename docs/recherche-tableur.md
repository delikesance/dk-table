# Recherche tableur : fonctionnalités et UX pour dk-table

Synthèse de deux rapports (fonctionnalités, UX). Priorités : **E** = Essentiel, **I** = Important, **B** = Bonus.
Marque [src] = confirmé par une source citée ; sinon connaissance générale (non sourcée).

## 1. Fonctionnalités attendues

### Édition et saisie
- E : saisie directe, Entrée valide (descend), Échap annule, Suppr efface [src]
- E : F2 édite la cellule active [src]
- E : détection de type (nombre, texte, date, booléen, formule `=`)
- I : retour à la ligne dans la cellule (Alt+Entrée) [src]
- I : Ctrl+Entrée remplit la sélection [src]
- B : remplissage instantané (Flash Fill, Ctrl+E) [src]

### Sélection et navigation clavier [src : raccourcis MS]
- E : flèches, Tab / Maj+Tab, PgUp/PgDn, Maj+flèches, Ctrl+flèches, Ctrl+Début / Ctrl+Fin
- E : Ctrl+A (tout), Ctrl+Espace (colonne), Maj+Espace (ligne)
- I : Ctrl+PgUp/PgDn (changer de feuille), Ctrl+G (Atteindre), sélection non contiguë (Maj+F8)
- B : mode extension F8

### Formules, fonctions, références
- E : syntaxe `=`, opérateurs (+ - * / ^ & comparaisons), parenthèses, plages `A1:B5`
- E : recalcul automatique avec graphe de dépendances
- E : références relatives, absolues, mixtes ; F4 cycle les modes [src]
- E : ajustement des références à la copie / insertion / suppression de lignes ou colonnes
- I : plages nommées, références inter-feuilles `Feuille2!A1`
- B : tableaux dynamiques (FILTER, UNIQUE), LET [src MS]
- Fonctions (recoupement MS / Google / sites tiers) :
  - E : SUM, SUMIF, ROUND, MIN, MAX, AVERAGE, COUNT, COUNTA, COUNTIF, IF, AND, OR, IFERROR, VLOOKUP, CONCAT, TODAY
  - I : SUMIFS, ABS, MOD, COUNTIFS, NOT, XLOOKUP, INDEX, MATCH, LEFT/RIGHT/MID, LEN, TRIM, TEXT, NOW, DATE, YEAR/MONTH/DAY, ISBLANK, ISNUMBER
  - B : PRODUCT, SUMPRODUCT, MEDIAN, HLOOKUP, UPPER/LOWER, fonctions financières (PMT, NPV, IRR)

### Recopie, copier/coller, undo
- E : Ctrl+D (bas) [src], Ctrl+R (droite), poignée de recopie avec ajustement des références
- I : séries auto (1,2,3 ; jours ; mois ; dates)
- E : Ctrl+X/C/V [src], coller avec ajustement des références, presse-papiers système (TSV)
- I : collage spécial (valeurs, formats, formules, transposer)
- B : insérer/supprimer cellules avec décalage (Ctrl+-, Ctrl+Maj++) [src]
- E : Ctrl+Z / Ctrl+Y [src], pile couvrant édition, format, tri, insertion/suppression
- I : historique profond (>100 niveaux)

### Tri et filtres
- E : tri croissant/décroissant d'une colonne, avec en-têtes
- I : tri multi-niveaux ; tri stable, ordre nombres < texte < booléens < vides
- I : filtre auto par colonne (valeurs, texte contient, nombre >), recherche dans la liste de valeurs
- B : tri personnalisé / par couleur, filtre avancé, segments (slicers), tableaux croisés dynamiques

### Mise en forme
- E : gras / italique / souligné, police, taille, couleurs texte et fond, alignement, retour à la ligne, bordures
- E : formats nombre (général, décimales, %, milliers) et date/heure (locale)
- I : devise, fusion de cellules, mise en forme conditionnelle
- B : styles de cellule, thèmes, pinceau

### Structure du classeur
- E : onglets (ajouter / supprimer / renommer), redimensionnement lignes/colonnes à la souris
- I : réordonner, dupliquer, couleur, masquer les feuilles ; auto-ajustement (double-clic) ; insérer/supprimer/masquer lignes et colonnes
- I : figer première ligne / colonne / jusqu'à la sélection
- B : références 3D, fractionner la fenêtre, regroupement (outline), largeur uniforme

### Erreurs et validation
- E : #DIV/0!, #REF!, #NAME?, #VALUE!, propagation aux dépendants, détection des références circulaires (pas de boucle infinie)
- I : #N/A, #NUM!, #NULL!, IFERROR / IFNA, ISERROR
- I : validation de données (listes déroulantes, bornes nombre/date, longueur) avec message d'erreur/avertissement
- B : audit (antécédents/dépendants), évaluation pas à pas, formule de validation personnalisée

### Import / export, graphiques, impression, collaboration
- E : CSV (séparateur, UTF-8 ; ne garde que la feuille active, sans format) [src MS], format natif/JSON interne
- I : XLSX [src MS], ODS [src MS]
- B : XLS, PDF, XLSM/XLSB [src MS], TSV
- I : graphiques colonnes/barres, lignes, secteurs ; B : nuage de points, aires, combiné, sparklines
- B : impression (zone, orientation, marges, échelle, sauts de page, en-têtes/pieds, export PDF) ; aperçu avant impression : I
- B : collaboration (hors périmètre d'une app de base ; prévoir au plus commentaires/notes)

**MVP (Essentiel)** : grille éditable + clavier, formules (~20 fonctions de base), références rel/abs et recopie, copier/couper/coller, undo/redo, formats nombre/date, mise en forme de base, redimensionnement, feuilles multiples, tri simple, CSV, erreurs standard + cycles.

## 2. Règles UX pour réduire les clics

Principes sourcés :
- **Flexibilité et efficacité [S1]** : plusieurs chemins par tâche, accélérateurs pour experts. Exemple dk-table : chaque action en menu ET raccourci, raccourci affiché dans le menu.
- **Loi de Fitts [S3]** : cible grande et proche = rapide. Exemple : poignée de recopie assez grande ; clic sur en-tête de ligne/colonne = sélection entière.
- **Loi de Hick [S4]** : moins de choix = décision plus rapide. Exemple : barre d'outils limitée à ~8 actions fréquentes, le reste en menus/palette.
- **Divulgation progressive [S2]** : essentiel d'abord, avancé à la demande, 2 niveaux max. Exemple : format avancé (devise, date, conditions) dans un panneau latéral.
- **Contrôle utilisateur / undo [S5]** : undo multi-niveaux, avertir seulement avant perte non récupérable. Exemple : suppression de ligne immédiate + toast « Annuler ? Ctrl+Z », sans modale ; garder Ctrl+Z et Édition > Annuler visibles (un snackbar seul disparaît trop vite).

Règles pratiques [Pratique] (conventions courantes, non tirées d'une source ci-dessous) :
- **Clavier d'abord** : Tab/Entrée valident et avancent, Maj+Entrée remonte, Échap annule, F2 édite sans effacer. Exemple : saisie continue sans souris.
- **Édition en cellule** : taper remplace, double-clic/F2 édite sur place, aucune modale.
- **Menu contextuel** : clic droit, actions pertinentes seulement (insérer, supprimer, trier, copier, format), raccourci affiché.
- **Barre contextuelle** : outils texte selon la sélection ; barre de base courte.
- **Défauts intelligents** : type de colonne auto, nouvelle ligne = formats de la précédente, largeur auto (double-clic sur bordure).
- **Remplissage / suggestions** : poignée de recopie (séries), Ctrl+D / Ctrl+R, autocomplétion de la colonne, suggestions de fonctions après « = ».
- **Palette de commandes** (Ctrl+Maj+P ou Ctrl+K) : recherche floue de toutes les actions ; Ctrl+P pour « aller à cellule / feuille ».
- **Auto-sauvegarde** : écriture débouncée + fichier de récupération (Tauri), indicateur « Enregistré », plus de Ctrl+S obligatoire.
- **Feedback immédiat** : recalcul instantané, aperçu de recopie en pointillé, erreur inline (#REF!) avec infobulle, progression non bloquante.
- **Glisser-déposer** : réordonner lignes/colonnes, déposer un CSV/XLSX sur la fenêtre (événement file-drop Tauri), déplacer une plage.
- **Préférences** : persister dossier, fenêtre, largeurs de colonnes, panneaux, thème, fichiers récents (plugin store Tauri) ; restaurer la session au lancement.

## 3. Pistes concrètes pour dk-table

Ordre de construction suggéré :
1. Grille + édition directe + clavier complet (Tab/Entrée/F2/Échap, Ctrl+flèches) : socle du MVP et de la règle « clavier d'abord ».
2. Moteur de formules : graphe de dépendances, ~20 fonctions E, références rel/abs (F4), erreurs standard et détection de cycles.
3. Copier/coller (TSV système) + poignée de recopie + Ctrl+D/R avec ajustement des références ; undo/redo couvrant tout.
4. Suppression/insertion immédiates avec undo (pas de modale) et toast « Annuler ? Ctrl+Z ».
5. Auto-sauvegarde + format natif JSON, CSV import/export, drag-drop de fichier, persistance des préférences et session.
6. Palette de commandes (Ctrl+K) qui liste actions + raccourcis, avec menus contextuels courts (réduit Hick).
7. Mise en forme de base via barre minimale/contextuelle ; formats avancés dans un panneau latéral (divulgation progressive).
8. Ensuite seulement : tri/filtres, feuilles multiples avancées, figer les volets, XLSX/ODS, graphiques (Important), puis Bonus.

## 4. Sources

Fonctionnalités :
- https://support.microsoft.com/en-us/office/keyboard-shortcuts-in-excel-1798d9d5-842a-42b8-9c99-9b7213f0040f
- https://support.microsoft.com/en-us/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb
- https://support.google.com/docs/table/25273
- https://support.microsoft.com/en-us/office/file-formats-that-are-supported-in-excel-0943ff2c-6014-4e8d-aaea-b83d51d46247
- https://www.excel-easy.com/examples/most-used-functions.html (complément tiers, non officiel)

UX :
- [S1] https://www.nngroup.com/articles/flexibility-efficiency-heuristic/ (extrait de recherche web uniquement ; page non lue en entier)
- [S2] https://www.nngroup.com/articles/progressive-disclosure/
- [S3] https://lawsofux.com/fittss-law/
- [S4] https://lawsofux.com/hicks-law/
- [S5] https://www.nngroup.com/articles/user-control-and-freedom/

## 5. Limites

- Aucune source LibreOffice Calc exploitable : la page d'aide récupérée était celle de Writer.
- Apple HIG (Undo/Redo) : fetch sans contenu exploitable, non cité. Material non consulté.
- Pas de source officielle dédiée pour tri, filtres, graphiques, impression, collaboration, validation, erreurs : sections issues de connaissance générale, non sourcées.
- Noms exacts des codes d'erreur : connaissance générale Excel ; LibreOffice utilise aussi Err:5xx, non vérifié.
- Les « règles pratiques » [Pratique] (palette, autosave, drag-drop, préférences, etc.) sont des conventions de l'industrie, non étayées par une source citée ici.
- Pas de sources spécifiques aux tableurs côté UX.
- Priorités E/I/B = jugement pour une app de base.
- [S1] : seul un extrait de recherche web a été vu, page non lue en entier.
