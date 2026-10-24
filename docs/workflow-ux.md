# Workflow UX de dk-table

But : le tableur le plus ergonomique possible. Les casuals d'abord (familier, propre), les features pro
cachées mais à portée de clavier. Sources : `docs/recherche-tableur.md` (S1 à S5), lecture de `src/ui`.
Légende : **(actuel)** = dans le code ; **(prévu)** = absent du code, à construire.

## 1. Benchmark : ce qu'on garde / évite

Aucune page produit n'a été relue pour ce document ; sauf mention, tout est [non sourcé] (connaissance générale).
Seuls les principes UX de `docs/recherche-tableur.md` sont sourcés (NN/g, Laws of UX, voir S1 à S5 là-bas).

| Outil | On garde | On évite |
|---|---|---|
| Excel | Raccourcis standard (Ctrl+B/Z/S, F2, Tab/Entrée), Σ rapide, poignée de recopie [non sourcé] | Ruban à onglets profond, dizaines de boutons visibles, dialogues modaux pour tout [non sourcé] |
| Google Sheets | Barre courte au-dessus de la grille, menus Fichier/Édition/..., autosave, menu contextuel riche [non sourcé] | Menus à 10+ entrées de premier niveau, barre trop dense [non sourcé] |
| Numbers (Apple) | Feuille d'abord, formatage dans un panneau contextuel selon la sélection, peu d'outils par défaut [non sourcé] | Modèle « tables flottantes » (inutile ici), panneau toujours ouvert [non sourcé] |
| LibreOffice Calc | Barre de formule + nom de cellule, tri/filtre auto accessibles [non sourcé] | Barres d'outils multiples empilées, aspect daté [non sourcé] |
| Airtable | Filtre/tri en un clic dans la vue, types de colonne clairs [non sourcé] | Modèle base de données (hors périmètre) [non sourcé] |
| Notion | Palette « / » et recherche d'actions, interface calme [non sourcé] | Tables sans formules sérieuses, latence perçue [non sourcé] |
| Quip | Feuille intégrée sobre, menu contextuel proche de la sélection [non sourcé] | Fonctions limitées [non sourcé] |
| Apple HIG | Clarté, déférence au contenu, annuler plutôt que confirmer [non sourcé ; fetch HIG vide, voir recherche §5] | Chrome qui écrase le contenu |
| Material (Google) | Cibles ≥ 40 px tactiles, états visibles (survol, focus, actif) [non sourcé ; non consulté] | Surcharge d'élévations/ombres |

Principes sourcés retenus (recherche S1 à S5) : plusieurs chemins par tâche (S1), loi de Fitts (S3),
loi de Hick (S4), divulgation progressive 2 niveaux max (S2), undo plutôt que modale (S5).

## 2. Modèle en 3 niveaux

Règle : N1 = tout ce qu'un casual fait en 5 minutes, sans chercher ; N2 = 1 clic de plus ; N3 = pour qui sait
(Ctrl+K, raccourcis, clic droit). Chaque feature a toujours un chemin N3 (palette) même si elle vit en N1/N2.

### N1 : visible d'emblée (casuals)

Cible : grille + barre de formule + onglets + une barre de base courte, **sans devoir déployer quoi que ce soit**.
- Grille, sélection, saisie directe, Entrée/Tab/Échap/F2/Suppr (actuel)
- Barre de formule + nom de cellule (actuel)
- Annuler / Rétablir (actuel, aujourd'hui dans la barre masquée)
- Gras, Italique, alignement G/C/D (actuel, idem)
- Format de nombre : Standard/Nombre/%/Monétaire (actuel ; « Date » sans effet, à corriger ou retirer)
- Couleur de fond (actuel)
- Enregistrer, Ouvrir (actuel)
- Onglets de feuilles + bouton « + » (actuel)
- Somme rapide Σ (prévu)
- Trier A→Z / Z→A de la colonne active (prévu)
- Indicateur « enregistré / modifié » dans le titre (actuel, T3.5)

### N2 : à 1 clic (menus, panneaux déployables)

- Menu Fichier : Nouveau, Ouvrir, Enregistrer, Enregistrer sous, fichiers récents (actuel ; récents dans la sidebar)
- Menu Import / Export : CSV import, CSV export (actuel) ; XLSX/ODS, PDF (prévu, recherche « Important »)
- Panneau latéral : fonctions avec recherche, infos cellule (actuel)
- Filtre automatique par colonne, trier multi-niveaux (prévu)
- Figer lignes/colonnes, redimensionner colonnes/lignes, auto-ajustement (prévu)
- Couleur du texte, bordures, retour à la ligne, souligné (prévu)
- Format avancé (devise, décimales, date) en panneau latéral (prévu ; recherche §3 point 7)
- Mise en forme conditionnelle, validation de données (prévu)
- Insérer/supprimer lignes et colonnes (prévu), menu contextuel de la grille (actuel : gras, italique, aligner, effacer, annuler)
- Graphiques classiques (prévu, « Important »)

### N3 : caché / pro

- Palette Ctrl+K : fichier, annuler, format, feuille, vue, insertion SPARKLINE/BAR/TREND (actuel)
- Raccourcis : Ctrl+Z/Y/B/I/O/S/N, Ctrl+J outils (actuel) ; Ctrl+D/R, Ctrl+G, F4, Alt+= (prévu)
- Cellules vivantes SPARKLINE/BAR/TREND (actuel, pépite) ; accessibles aussi par la sidebar
- Copier/coller TSV, plages (actuel) ; collage spécial, transposer (prévu)
- Historique profond / voyage dans le temps (prévu, pépite 2 non retenue) ; flèches de dépendances (prévu, pépite 1)
- Plages nommées, références inter-feuilles, audit, tableaux dynamiques (prévu, Important/Bonus)
- Auto-sauvegarde + récupération (prévu) ; préférences/session (prévu ; seul l'état des outils est persisté, actuel)
- Glisser-déposer de fichier (prévu), recherche d'une fonction par signature (actuel, sidebar)
- Mode minimal + Ctrl+J (actuel) est le **réglage de densité** : il doit rester, mais ne plus masquer N1.

## 3. Tâches courantes : clics actuels vs cible

Hypothèse : mode minimal par défaut (état d'arrivée, `appTools.ts`). « Clic » = souris ; clavier compté à part.
Clics actuels déduits du code (`toolbar.ts`, `menus.ts`, `tabs.ts`, `commands.ts`) ; non mesurés dans l'app réelle.

| Tâche | Actuel | Cible | Remarque |
|---|---|---|---|
| Mettre en gras | 2 (chevron, B) ; Ctrl+B = 0 | 1 | barre N1 toujours là, ou mini-barre flottante |
| Aligner / centrer | 2 (chevron, bouton) | 1 | idem |
| Format nombre (%) | 3 (chevron, select, option) | 2 | select natif = 2 clics, bouton % direct = 1 |
| Couleur de fond | 3+ (chevron, sélecteur natif, choix) | 2 | palette maison de 12 pastilles |
| Trier colonne | impossible (absent) | 2 | clic droit > Trier, ou bouton A→Z |
| Filtrer colonne | impossible (absent) | 2 | menu en tête de colonne |
| Somme rapide | 0 clic mais taper `=SUM(A1:A9)` | 1 | bouton Σ ou Alt+= : détecte la plage |
| Ajouter une feuille | 1 (« + » des onglets) ; Ctrl+N = 0 | 1 | OK à confirmer visuellement |
| Enregistrer | 2 (chevron, disquette) ; Ctrl+S = 0 | 0 à 1 | autosave (prévu) + bouton toujours visible |
| Annuler | 2 (chevron, flèche) ; Ctrl+Z = 0 | 1 | bouton toujours visible |
| Ouvrir un fichier | 2 (chevron, Ouvrir) | 2 | Fichier > Ouvrir ou récents |
| Exporter CSV | 3 (chevron, Import/Export, item) | 2 | menu Fichier unique, sous-section Exporter |
| Insérer SPARKLINE | 2 (chevron, fonction sidebar) | 2 | OK ; palette Ctrl+K reste N3 |
| Supprimer une feuille | 2 (clic droit + confirm natif) | 1 + toast Annuler | pas de modale (S5) |
| Effacer le contenu | 2 (clic droit, item) ; Suppr = 0 | 2 | OK |

Constat : en mode minimal, le chevron ajoute **1 clic à presque toute action de formatage/annulation/sauvegarde**.

## 4. Écarts avec l'app actuelle et changements

Écarts :
- Le mode minimal masque aussi N1 (annuler, gras, enregistrer) : un casual ne trouve rien sans chercher le chevron.
- La toolbar est tout-ou-rien (barre + sidebar ensemble) ; N1 et N2 ne sont pas séparés.
- Deux menus (Fichier, Import/Export) dans la toolbar ; Fichier et Import/Export se confondent.
- Tri, filtre, Σ, redimensionnement, couleur du texte, poignée de recopie absents.
- Suppression de feuille et erreurs passent par `window.confirm`/`alert` (natifs), contraire à la règle « undo plutôt que modale ».
- « Date » du menu format sans effet (TODO P0).

Changements priorisés (chacun = une micro-tâche, fichiers disjoints ; TDD, test d'abord) :

| # | Changement | Niveau | Fichiers `src/ui` |
|---|---|---|---|
| 1 | Barre N1 toujours visible (undo/redo, B/I, align, format, fond, enregistrer) ; le chevron ne déploie que N2 (sidebar, menus) | N1 | `toolbar/toolbar.ts`, `appTools.ts`, `app.css` |
| 2 | Bouton Σ + Alt+= : somme de la plage au-dessus/à gauche | N1 | nouveau `autosum.ts`, `commands.ts` |
| 3 | Tri A→Z / Z→A de la colonne active (bouton + clic droit + palette) | N1 | nouveau `sort.ts`, `contextmenu` via `commands.ts`, `model.ts` |
| 4 | Fusion en un seul menu « Fichier » (nouveau, ouvrir, récents, enregistrer, importer, exporter) | N2 | `toolbar/menus.ts`, `fileops.ts` |
| 5 | Toast « Annuler ? » à la place de `confirm`/`alert` | N2 | nouveau `toast/toast.ts`, `tabs/tabs.ts`, `fileops.ts` |
| 6 | Palette de couleurs maison (fond + texte) remplaçant l'input natif | N2 | nouveau `toolbar/colors.ts`, `toolbar/toolbar.ts` |
| 7 | Filtre auto par colonne (menu en tête) | N2 | nouveau `grid/filter.ts`, `grid/grid.ts` |
| 8 | Redimensionner colonnes, double-clic auto-ajustement | N2 | `grid/grid.ts`, `grid/grid.css` |
| 9 | Autosave débouncé + indicateur « Enregistré » | N3 | `fileops.ts`, `appState.ts` |
| 10 | Ctrl+D / Ctrl+R / F4 et poignée de recopie | N3 | `grid/keys.ts`, `grid/grid.ts` |
| 11 | Mini-barre flottante de formatage près de la sélection | N1 | nouveau `toolbar/floating.ts` |
| 12 | Format « Date » fonctionnel ou retiré | N1 | `numfmt.ts`, `toolbar/toolbar.ts` |

Ordre conseillé : 1, 12, 4, 5, 2, 3 (valeur casual immédiate), puis 6, 8, 7, 9, 10, 11.
Conflits de fichiers à gérer : 1, 6, 11, 12 touchent `toolbar.ts` (séquencer) ; 3, 7, 8, 10 touchent la grille (séquencer).
Hors UI (moteur) : tri/filtre/Σ réclament des helpers `src/engine` (plage, tri stable, ordre des types).

## 5. Décisions à trancher + défaut

| Décision | Défaut raisonnable |
|---|---|
| Garder le mode minimal par défaut ? | Oui, mais N1 reste visible ; minimal ne masque que sidebar et N2 |
| Chevron : conserver Ctrl+J ? | Oui ; renommer « Panneau » (outils N2) |
| Barre unique ou ruban ? | Barre unique courte (≈ 8 actions, Hick S4), pas de ruban |
| Où vit Σ ? | Barre N1, à côté du format ; Alt+= en N3 |
| Tri : bouton ou clic droit seulement ? | Les deux ; filtre dans l'en-tête de colonne seulement |
| Autosave activé par défaut ? | Oui pour fichier déjà enregistré, sinon invite au premier Ctrl+S |
| Date : implémenter ou retirer ? | Implémenter format ISO local ; sinon retirer l'option |
| Pépites 1/2 (flèches, temps) ? | Hors périmètre N1/N2 ; N3 seulement si le temps le permet |
| Thème : clair/sombre auto ou réglage ? | Suivre le système (tokens déjà clair + sombre) |
| Langue de l'UI | Français uniquement pour la démo |
