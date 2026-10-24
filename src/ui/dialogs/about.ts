/** À propos (Aide > À propos de dk-table) : Atlas et crédits (image, polices, icônes). */
import { openDialog } from "./dialog";
import { atlasFigure } from "../art";

/** Ouvre la boîte À propos (une seule instance). */
export function openAbout(): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-about";
  body.append(atlasFigure("dk-about__art"));
  const credits = document.createElement("p");
  credits.className = "dk-about__credits";
  credits.textContent =
    "Polices Inter Tight, DM Mono, Sofia Sans Extra Condensed : SIL Open Font License. Icônes Iconoir : MIT.";
  body.append(credits);
  openDialog("about", "dk-table", body);
}
