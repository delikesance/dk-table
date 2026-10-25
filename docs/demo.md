# Script de démo dk-table (5 minutes)

Tout ce qui suit existe dans le code. Ne rien montrer d'autre.

## Minutage

| Étape | Durée | Cumul |
|---|---|---|
| 1. Installation | 0:45 | 0:45 |
| 2. Interface minimale + Ctrl+J | 0:30 | 1:15 |
| 3. Saisie, formules, recalcul auto | 1:00 | 2:15 |
| 4. #CYCLE! | 0:20 | 2:35 |
| 5. Formats, styles, annuler/rétablir | 0:45 | 3:20 |
| 6. Palette Ctrl+K | 0:20 | 3:40 |
| 7. Fichiers : .dktable, CSV, récents | 0:40 | 4:20 |
| 8. Cellules vivantes (final) | 0:40 | 5:00 |

## Installation (0:45)

- Windows : lancer l'installeur MSI ou NSIS (`src-tauri/target/release/bundle/msi/`, `.../nsis/`), suivant, suivant, terminer.
- Linux : `sudo apt install ./dk-table_*.deb`, ou `chmod +x dk-table_*.AppImage && ./dk-table_*.AppImage`.
- Artefacts Linux produits par `.github/workflows/release.yml` (job `build-linux`, bundles deb + AppImage).
- Lancer dk-table depuis le menu Démarrer / lanceur d'applications.
- Dire : installeur léger (MSI ~3 Mo, NSIS ~2 Mo), pas d'IA embarquée.

## Tour des fonctionnalités

### 2. Interface minimale (0:30)

- Au lancement : seulement la feuille et la barre de formule.
- Appuyer sur Ctrl+J (ou le chevron) : la barre d'outils et le panneau latéral apparaissent. Ctrl+J à nouveau : ils se replient.
- L'état est mémorisé entre deux lancements.
- Les onglets de feuilles sont en bas ; Ctrl+N ajoute une feuille.

### 3. Saisie, formules, recalcul auto (1:00)

Jeu d'exemple à saisir (feuille 1, colonne A = mois, B = ventes, C = coûts) :

| Cellule | Saisie |
|---|---|
| A1 / B1 / C1 | `Mois` / `Ventes` / `Coûts` |
| A2:A7 | `Jan` `Fév` `Mar` `Avr` `Mai` `Juin` |
| B2:B7 | `120` `135` `150` `140` `170` `195` |
| C2:C7 | `80` `85` `90` `95` `100` `105` |
| A9 | `Total` |
| B9 | `=SUM(B2:B7)` |
| C9 | `=SUM(C2:C7)` |
| A10 | `Marge` |
| B10 | `=B9-C9` |
| A11 | `Taux` |
| B11 | `=B10/B9` |
| A12 | `Moyenne` |
| B12 | `=AVERAGE(B2:B7)` |
| A13 | `Statut` |
| B13 | `=IF(B10>300,"OK","Bas")` |

- Montrer la barre de formule (la formule brute s'y affiche).
- Modifier `B7` (195 vers 300) : B9, B10, B11, B12, B13 se mettent à jour seuls.
- Fonctions disponibles : SUM, AVERAGE, MIN, MAX, COUNT, ABS, ROUND, CONCAT, IF.
- Erreurs possibles : `#DIV/0!`, `#REF!`, `#NAME?`, `#VALUE!`.
- Copier-coller d'une plage : un seul pas d'annulation.

### 4. Cycle (0:20)

- Saisir `=B15` en `B14`, puis `=B14` en `B15` : les deux affichent `#CYCLE!`.
- Corriger `B15` (saisir `5`) : `B14` se résout seul.
- Dire : le moteur détecte les cycles sans planter.

### 5. Formats, styles, annuler/rétablir (0:45)

- Sélectionner `B9:C10`, format devise : `1 000,00 €` (fr-FR). Puis `B11` en pourcentage.
- Formats du menu : général, nombre, pourcentage, devise. Affichage seul, la valeur reste intacte.
- Gras (Ctrl+B), italique (Ctrl+I), alignement, couleur de fond sur la ligne d'en-tête.
- Les styles sont enregistrés dans le fichier `.dktable` et annulables.
- Ctrl+Z annule, Ctrl+Y rétablit (1000 pas par feuille; une macro = un pas, historique conservé).

### 6. Palette de commandes (0:20)

- Ctrl+K, taper `csv` : « Importer un CSV » / « Exporter en CSV ».
- Taper `outils` : « Afficher/Masquer les outils » (rappel Ctrl+J).
- Les commandes affichent leur raccourci. Clic droit : menu contextuel.

### 7. Fichiers (0:40)

- Ctrl+S : enregistrer en `demo.dktable` (JSON lisible). Le titre perd l'indicateur de modification.
- Ctrl+N : nouveau document ; Ctrl+O : rouvrir `demo.dktable`, tout est restitué (valeurs, formules, styles).
- Menu Fichier (barre d'outils, Ctrl+J) : Exporter en CSV, puis Importer un CSV.
- Panneau latéral : liste des fichiers récents (8 max, mémorisés), un clic rouvre.

### 8. Cellules vivantes (0:40, final)

Dans une cellule libre (ex. D2, D3, D4), saisir une formule en cellule entière :

| Cellule | Saisie | Rendu |
|---|---|---|
| D2 | `=SPARKLINE(B2:B7)` | courbe SVG |
| D3 | `=BAR(B2:B7)` | mini-barres SVG |
| D4 | `=TREND(B2:B7)` | flèche colorée + pourcentage |

- Modifier `B7` : les trois graphiques se redessinent.
- Palette Ctrl+K : « Insérer SPARKLINE / BAR / TREND » insère la formule.
- Tenter aussi `=TREND(C2:C7)` pour comparer les tendances.
- Conclure : tableur léger, sobre, pas d'IA embarquée, bonus Pépite.

## Pièges connus

- L'option « Date » du menu de format est sans effet (limite connue).
- Le SVG vivant n'apparaît que si la formule occupe toute la cellule : `=SPARKLINE(B2:B7)` OK, `="x"&SPARKLINE(...)` ou `=SUM(...)+TREND(...)` non (texte de repli seul).
- La plage doit être de type `B2:B7` (ou une seule cellule) : pas de plage nommée.
- La grille est fixe, 26 colonnes x 100 lignes (A:Z).
- Dans un champ de saisie, Ctrl+Z/Y/B/I gardent leur comportement natif de texte.
- Les installeurs doivent être construits avant la démo (`npm run tauri build`).

## Checklist de répétition

- [ ] Installeur MSI ou NSIS testé sur une machine propre (désinstaller avant).
- [ ] .deb / AppImage testé sur Linux (téléchargés depuis l'artefact de release).
- [ ] Jeu d'exemple saisi une fois, chronométré : 5:00 maximum.
- [ ] Ctrl+J, Ctrl+K, Ctrl+Z, Ctrl+Y, Ctrl+S, Ctrl+O fonctionnent dans la fenêtre Tauri.
- [ ] `#CYCLE!` reproduit, puis levé.
- [ ] Les trois graphiques se redessinent après modification de `B7`.
- [ ] `demo.dktable` rouvert : formules et styles intacts ; CSV exporté puis réimporté.
- [ ] Clair et sombre vérifiés.
- [ ] Fichier `demo.dktable` pré-enregistré en secours si la saisie dérape.
- [ ] Ne pas montrer : format Date, formules composées avec SVG.
