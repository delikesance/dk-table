/**
 * Illustration Atlas (gravure de l'Atlas Farnèse, F. R. R. Brendamour, domaine public) en bichromie.
 * Réservée aux écrans sans données (accueil, À propos) : jamais sur l'écran de travail.
 * Deux versions : bleu + papier (thème clair) et nuit (thème sombre) ; la CSS montre la bonne via data-theme.
 */
import atlasLight from "../assets/atlas-bleu.png";
import atlasNight from "../assets/atlas-nuit.png";
import "./art.css";

/** Crédit de l'image (attribution, affichée avec elle). */
export const ATLAS_CREDIT = "Atlas Farnèse · gravure de F. R. R. Brendamour · domaine public";

/** Figure de l'Atlas ; `cls` s'ajoute à `.dk-art` pour la mise en page de l'hôte. */
export function atlasFigure(cls = ""): HTMLElement {
  const fig = document.createElement("figure");
  fig.className = `dk-art ${cls}`.trim();
  const alt = "Gravure de l'Atlas Farnèse portant le globe céleste";
  fig.innerHTML =
    `<img class="dk-art__img dk-art__img--light" src="${atlasLight}" alt="${alt}">` +
    `<img class="dk-art__img dk-art__img--night" src="${atlasNight}" alt="${alt}">` +
    `<figcaption class="dk-art__credit">${ATLAS_CREDIT}</figcaption>`;
  return fig;
}
