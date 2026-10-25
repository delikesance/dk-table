import { describe, it, expect } from "vitest";
import { extendSeries } from "./series";

const ext = (src: string[], n: number, ctrl = false) => extendSeries(src, n, ctrl);

describe("extendSeries: nombres", () => {
  it("1,2,3 -> 4,5,6", () => expect(ext(["1", "2", "3"], 3)).toEqual(["4", "5", "6"]));
  it("2,4 -> 6,8", () => expect(ext(["2", "4"], 2)).toEqual(["6", "8"]));
  it("pas décimal sans bruit flottant", () => expect(ext(["0.1", "0.2"], 3)).toEqual(["0.3", "0.4", "0.5"]));
  it("négatifs et pas négatif", () => expect(ext(["5", "3"], 4)).toEqual(["1", "-1", "-3", "-5"]));
  it("tendance linéaire quand le pas varie (moindres carrés)", () => expect(ext(["1", "2", "4"], 1)).toEqual(["5.333333333333"]));
  it("un seul nombre: recopie; Ctrl: série +1", () => {
    expect(ext(["7"], 3)).toEqual(["7", "7", "7"]);
    expect(ext(["7"], 3, true)).toEqual(["8", "9", "10"]);
  });
  it("plusieurs nombres + Ctrl: recopie cyclique", () => expect(ext(["1", "2"], 3, true)).toEqual(["1", "2", "1"]));
});

describe("extendSeries: texte", () => {
  it("texte + nombre final: Item 1 -> Item 2 (un seul: +1)", () => expect(ext(["Item 1"], 2)).toEqual(["Item 2", "Item 3"]));
  it("pas déduit de deux valeurs", () => expect(ext(["T1", "T3"], 2)).toEqual(["T5", "T7"]));
  it("zéros de remplissage conservés", () => expect(ext(["A007"], 2)).toEqual(["A008", "A009"]));
  it("texte + nombre avec Ctrl: recopie", () => expect(ext(["Item 1"], 2, true)).toEqual(["Item 1", "Item 1"]));
  it("préfixes différents: motif répété", () => expect(ext(["a1", "b2"], 3)).toEqual(["a1", "b2", "a1"]));
  it("texte simple: recopie; motif répété", () => {
    expect(ext(["abc"], 2)).toEqual(["abc", "abc"]);
    expect(ext(["oui", "non", "peut-être"], 4)).toEqual(["oui", "non", "peut-être", "oui"]);
  });
  it("cellule vide dans la source: motif répété tel quel", () => expect(ext(["1", ""], 3)).toEqual(["1", "", "1"]));
});

describe("extendSeries: mois et jours FR", () => {
  it("janvier -> février, mars, … avec retour à janvier", () => expect(ext(["novembre"], 3)).toEqual(["décembre", "janvier", "février"]));
  it("casse conservée", () => {
    expect(ext(["Lundi"], 2)).toEqual(["Mardi", "Mercredi"]);
    expect(ext(["LUNDI"], 1)).toEqual(["MARDI"]);
    expect(ext(["lundi"], 1)).toEqual(["mardi"]);
  });
  it("abréviations avec point", () => expect(ext(["janv.", "févr."], 2)).toEqual(["mars", "avr."]));
  it("pas de 2 jours", () => expect(ext(["lundi", "mercredi"], 3)).toEqual(["vendredi", "dimanche", "mardi"]));
  it("un seul avec Ctrl: recopie", () => expect(ext(["lundi"], 2, true)).toEqual(["lundi", "lundi"]));
  it("sens inverse (source renversée): mars, févr., janv. -> décembre", () => expect(ext(["février", "mars"].reverse(), 3)).toEqual(["janvier", "décembre", "novembre"]));
});

describe("extendSeries: dates texte", () => {
  it("ISO: +1 jour pour une seule date", () => expect(ext(["2024-02-28"], 3)).toEqual(["2024-02-29", "2024-03-01", "2024-03-02"]));
  it("JJ/MM/AAAA conservé", () => expect(ext(["30/12/2024"], 2)).toEqual(["31/12/2024", "01/01/2025"]));
  it("pas de 7 jours", () => expect(ext(["2024-01-01", "2024-01-08"], 2)).toEqual(["2024-01-15", "2024-01-22"]));
  it("pas d'un mois (même jour), fin de mois ramenée", () => {
    expect(ext(["2024-01-31", "2024-02-29"], 2)).toEqual(["2024-03-31", "2024-04-30"]);
    expect(ext(["01/01/2024", "01/02/2024"], 2)).toEqual(["01/03/2024", "01/04/2024"]);
  });
  it("pas d'un an", () => expect(ext(["2022-05-10", "2023-05-10"], 2)).toEqual(["2024-05-10", "2025-05-10"]));
  it("jours ouvrés: vendredi puis lundi saute le week-end", () => {
    // 2024-01-05 = vendredi, 2024-01-08 = lundi
    expect(ext(["2024-01-05", "2024-01-08"], 3)).toEqual(["2024-01-09", "2024-01-10", "2024-01-11"]);
    expect(ext(["2024-01-04", "2024-01-05", "2024-01-08"], 3)).toEqual(["2024-01-09", "2024-01-10", "2024-01-11"]);
  });
  it("Ctrl sur une date: recopie", () => expect(ext(["2024-03-01"], 2, true)).toEqual(["2024-03-01", "2024-03-01"]));
});

it("n <= 0 -> []", () => expect(ext(["1"], 0)).toEqual([]));

describe("extendSeries: vers le haut / la gauche (dir -1), source d'un seul élément", () => {
  const back = (src: string[], n: number, ctrl = false) => extendSeries(src, n, ctrl, -1);
  it("jour, mois, date, Item, nombre (Ctrl)", () => {
    expect(back(["mercredi"], 2)).toEqual(["mardi", "lundi"]);
    expect(back(["janvier"], 1)).toEqual(["décembre"]);
    expect(back(["2024-03-01"], 2)).toEqual(["2024-02-29", "2024-02-28"]);
    expect(back(["Item 3"], 3)).toEqual(["Item 2", "Item 1", "Item 0"]);
    expect(back(["5"], 2, true)).toEqual(["4", "3"]);
  });
});
