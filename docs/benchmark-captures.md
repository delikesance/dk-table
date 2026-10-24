# Benchmark d'interfaces de tableurs

Objectif : repérer les choix d'interface des tableurs existants pour dk-table (casual d'abord, outils pro cachés, minimal par défaut, icônes Iconoir noires, style Apple sobre). Complète `docs/recherche-tableur.md` et `docs/workflow-ux.md`.

## Méthode et limites

- Sources : documentation officielle (support Microsoft, Apple, Google, Airtable, Notion, LibreOffice) lue via recherche/fetch web.
- Captures : aucune image téléchargée ni regardée (fetch renvoie du texte). Tout ce qui est visuel (densité, couleurs, proportions) est marqué **[non vu]** et déduit de descriptions textuelles.
- Rien n'est redistribué ; ce document est une référence interne.
- Marque `[src]` = confirmé par la page citée ; `[non vu]` = pas de capture ; `[mémoire]` = connaissance générale non vérifiée ici.

## Par outil

### Microsoft Excel

- Sources : https://support.microsoft.com/en-us/excel/show-the-ribbon, https://support.microsoft.com/en-us/office/customize-the-ribbon-in-office-00f24ca7-6021-48d3-9514-a31a460ecb31 (capture : non vue).
- Disposition : ruban d'onglets (File/Backstage, Home, Insert, ...) + barre Nom/formule + grille + onglets de feuilles en bas + barre d'état [src] pour la barre Nom/formule et les onglets, via sources tierces.
- Ruban : commandes groupées par onglet, la liste change selon l'onglet actif [src]. Densité très élevée [non vu].
- Masquage : bouton Options d'affichage du ruban (toujours afficher / onglets seuls / masquer auto), double-clic sur un onglet, Ctrl+F1 [src]. Plein écran Ctrl+Maj+F1 masque aussi barre de formule et d'état [src].
- Personnalisable : barre d'accès rapide et ruban modifiables [src]. Champ de recherche de commandes (Tell Me / Search) selon la version [src].
- Grille : en-têtes A/B/C et 1/2/3, cellule active encadrée, Nom de cellule à gauche de la barre de formule [src].
- Feuilles : onglets en bas, boutons de défilement, bouton « nouvelle feuille » [src].
- Panneaux latéraux : volets de tâches à la demande (ex. format) [mémoire].
- Menu contextuel : mini-barre de mise en forme + menu long [mémoire, non vu].
- Bien : barre de formule claire, repli du ruban, recherche de commande.
- Lourd : des dizaines de commandes visibles, 8+ onglets, vocabulaire pro ; intimidant pour un débutant.

### Google Sheets

- Sources : https://support.google.com/docs/answer/46973 (édition/format), https://support.google.com/docs/topic/2811806 (hub Sheets) ; sources tierces pour onglets/Explore : https://bettersheets.co/glossary/side-panel (capture : non vue).
- Disposition : barre de menus texte + barre d'outils d'icônes unique + barre de formule + grille + onglets de feuilles en bas [src partiel].
- Barre d'outils : gras, italique, couleur de remplissage, bordures, fusion, alignement, retour à la ligne [src]. Une seule ligne d'icônes, plus dense que Numbers, bien moins qu'Excel [non vu].
- Menus : formats numériques sous le menu Format [src] ; recherche dans les menus [mémoire].
- Feuilles : menu contextuel d'onglet = insérer, renommer, supprimer, dupliquer ; flèches + icône « liste de toutes les feuilles » quand les onglets débordent [src, tiers].
- Panneaux latéraux : Explore (suggestions de graphiques/tableaux croisés) à droite ou en bas à droite selon version [src tiers, variable].
- Menu contextuel : clic droit sur cellule/plage [src, contenu non détaillé].
- Bien : une seule rangée d'outils, coût de départ faible, liste des feuilles.
- Lourd : menus profonds ; panneaux latéraux multiples (Explore, extensions).

### Apple Numbers

- Sources : https://support.apple.com/guide/numbers/tan95190244d/mac (capture : non vue).
- Disposition : barre d'outils en haut + canvas libre + barre latérale droite « Format / Organiser » [src].
- Barre latérale : n'affiche que les contrôles de l'objet sélectionné (tableau, graphique, image, forme) [src]. Se masque via Présentation > Inspecteur [src] ; la barre d'outils personnalisable renvoie à un guide séparé [src].
- Styles prédéfinis en haut du panneau (6 styles, enregistrables) [src].
- Grille : tableaux posés sur une feuille libre (pas de grille infinie) [mémoire]. En-têtes discrets [non vu].
- Feuilles : onglets en haut, glisser pour réordonner [mémoire].
- Menu contextuel : [non vu].
- Bien : un seul panneau contextuel, aucun ruban, styles en un clic, esthétique sobre.
- Lourd : modèle « feuille + objets » déroutant pour les habitués de la grille ; peu de raccourcis visibles.

### LibreOffice Calc

- Sources : https://books.libreoffice.org/en/GS71/GS7105-GettingStartedWithCalc.html, https://help.libreoffice.org/latest/en-US/text/scalc/main0000.html (capture : non vue).
- Disposition : barre de menus (avec Feuille et Données) + barre Standard + barre Mise en forme + barre de formule + grille + onglets + barre d'état [src].
- Barre de formule : zone Nom, assistant de fonctions, somme rapide, bouton « = », ligne de saisie extensible ; masquable via Affichage [src].
- Barre latérale : Ctrl+F5 ou menu Affichage ; 5 decks (Propriétés, Styles, Galerie, Navigateur, Fonctions) [src].
- Feuilles : onglet actif blanc, bouton « + » pour ajouter, boutons de défilement, clic droit = renommer / couleur / masquer [src].
- Barre d'état : sélection, et clic droit pour afficher somme/moyenne/nombre [src]. Pratique et caché.
- Menu contextuel cellule : Format de cellule, commentaire, supprimer, collage spécial, effacer le contenu, listes [src].
- Bien : somme/moyenne en barre d'état, décks de la barre latérale optionnels, fonctions listées par catégorie.
- Lourd : deux barres d'icônes + menus complets visibles, look daté, densité haute [non vu].

### Airtable

- Sources : https://support.airtable.com/articles/5189551686-getting-started-with-airtable-views, https://support.airtable.com/docs/hiding-fields-and-field-visibility-overview (capture : non vue).
- Disposition : barre latérale des vues (repliable via icône à 3 barres) + barre de vue (hauteur de ligne, recherche, compteur) + grille [src].
- Contrôles de vue : masquer des champs, réordonner, filtrer, grouper, trier, colorer les enregistrements, tous dans une barre unique [src]. Masquer ne supprime rien, c'est propre à la vue [src].
- Types de vues : grille (défaut), formulaire, calendrier, galerie, kanban, ligne du temps, liste, gantt [src].
- Collaboration : vues collaboratives, personnelles ou verrouillées [src].
- Hauteur de ligne : court / moyen / grand / très grand [src].
- Bien : la configuration (filtre, tri) vit dans la vue, pas dans la donnée ; hauteur de ligne en un contrôle.
- Lourd : modèle base de données, inadapté à un tableur de calcul ; abstractions (vues, champs) à apprendre.

### Notion (tables)

- Source : https://www.notion.com/help/views-filters-and-sorts (capture : non vue).
- Disposition : titre de base + onglets de vues (icône seule, texte seul ou les deux) + table [src].
- Réglages : menu en haut à droite « Paramètres de vue » = mise en page, visibilité des propriétés, filtre, tri, groupe, sous-groupe [src].
- Filtres avancés ET/OU imbriqués sur 3 niveaux ; option « enregistrer pour tous » désactivable [src]. Tri multiple réordonnable par glisser [src].
- Pages ouvertes en « side peek » par défaut [src]. Figer jusqu'à une colonne via le nom de colonne [src].
- Bien : tout derrière un seul menu de réglages ; vues multiples par onglets ; filtre personnel possible.
- Lourd : pas un vrai tableur (formules limitées [mémoire]) ; réglages imbriqués profonds.

### Autres (Zoho, OnlyOffice, Quip)

- Non étudiés : aucune source consultée (https://www.onlyoffice.com/spreadsheet-editor.aspx, non lu). Piste : OnlyOffice reprend le ruban Excel [mémoire, non vu].

## Patterns à reprendre / à éviter pour dk-table

#### À reprendre

- Panneau latéral unique et contextuel (Numbers) : n'affiche que ce qui concerne la sélection ; masquable.
- Une seule rangée d'outils (Google Sheets), pas de ruban à onglets.
- Recherche/palette de commandes (Excel Tell Me, menus Sheets) : outils pro cachés mais atteignables.
- Repli en un geste de la barre d'outils (Excel : double-clic sur un onglet, Ctrl+F1) : minimal par défaut.
- Somme/moyenne/nombre de la sélection en barre d'état (Calc), sans formule.
- Barre Nom + formule (Excel, Calc) : repère connu des habitués.
- Liste des feuilles quand les onglets débordent, menu contextuel d'onglet renommer/dupliquer/supprimer (Sheets), couleur d'onglet (Calc).
- Config de vue séparée de la donnée (Airtable, Notion) pour filtres/tri : réversible, personnel.
- Hauteur de ligne en un contrôle (Airtable).
- Styles prédéfinis en un clic (Numbers).

#### À éviter

- Ruban dense multi-onglets (Excel) : intimide un utilisateur casual.
- Deux barres d'icônes + menus complets visibles (Calc).
- Panneaux multiples simultanés (Sheets : Explore + extensions).
- Menus imbriqués profonds pour les réglages courants (Notion filtres 3 niveaux).
- Abstractions base de données (champs/vues) dans un tableur de calcul.
- Fonctions essentielles accessibles uniquement via un menu long ou une boîte de dialogue.

#### Application (icônes Iconoir noires, style Apple sobre)

- Barre d'outils : une seule rangée d'icônes Iconoir noires, groupes séparés par un filet.
- Panneau latéral droit contextuel façon Numbers, fermé par défaut ; ouverture via bouton Format.
- Outils pro (fonctions avancées, tri/filtre complexes) : palette de commandes et menu contextuel, pas la barre.
- Barre d'état discrète : somme / moyenne / nombre de la sélection.
- Valider ces choix visuellement avec de vraies captures lors d'un second passage : tout visuel ici est **[non vu]**.


## Lacunes de `recherche-tableur.md`

- Tri, filtres, graphiques, impression, collaboration, validation, erreurs : toujours sans source officielle, sauf filtres/tri partiels (Airtable, Notion).
- Non couvert : Numbers (onglets, menu contextuel), Sheets (page interface complète introuvable), Excel (ruban seulement).
