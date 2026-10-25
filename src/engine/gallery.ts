/**
 * Vue Galerie (logique pure, sans DOM) : une carte par ligne d'une grille de chaînes (ligne 1 = en-têtes).
 * Le titre est la 1re colonne; les champs affichés sont ceux choisis (index 0-based), sinon toutes les
 * autres colonnes nommées. Les lignes vides ou masquées par le filtre de la vue sont ignorées.
 */

/** Un champ affiché sur une carte. */
export interface GalleryField {
  name: string;
  value: string;
}

/** Une carte = une ligne (`row` 1-based), son titre et ses champs. */
export interface GalleryCard {
  row: number;
  title: string;
  fields: GalleryField[];
}

/** Cartes de la grille; `cols` vide = toutes les colonnes nommées sauf le titre. */
export function galleryCards(grid: string[][], cols: number[], hidden: (row: number) => boolean = () => false): GalleryCard[] {
  if (grid.length === 0) return [];
  const header = grid[0];
  const shown = cols.length ? cols.filter((c) => c !== 0) : header.map((h, c) => (c > 0 && h !== "" ? c : -1)).filter((c) => c > 0);
  const out: GalleryCard[] = [];
  for (let i = 1; i < grid.length; i++) {
    const row = i + 1;
    if (hidden(row) || grid[i].every((v) => v === "")) continue;
    out.push({ row, title: grid[i][0] ?? "", fields: shown.map((c) => ({ name: header[c] ?? "", value: grid[i][c] ?? "" })) });
  }
  return out;
}
