import { describe, expect, it } from "vitest";
import { singleRef, toDisplay, toEngine, toStored } from "./calcSrc";

const sheets = [{ id: "s1", name: "Synthese" }, { id: "s2", name: "Feuille 2" }];

describe("formule du document : noms <-> identifiants", () => {
  it("le texte tapé est stocké avec l'identifiant de la feuille", () => {
    expect(toStored("Synthese!B3/synthese!C3", sheets)).toBe("{s1}!B3/{s1}!C3");
    expect(toStored("'Feuille 2'!A1:A3", sheets)).toBe("{s2}!A1:A3");
  });
  it("une feuille inconnue et les chaînes sont laissées telles quelles", () => {
    expect(toStored('Autre!A1&"Synthese!A1"', sheets)).toBe('Autre!A1&"Synthese!A1"');
  });
  it("le moteur reçoit le nom actuel, cité", () => {
    expect(toEngine("{s1}!B3*2", sheets)).toBe("'Synthese'!B3*2");
    expect(toEngine("SUM({s2}!A1:A3)", sheets)).toBe("SUM('Feuille 2'!A1:A3)");
    expect(toEngine("{gone}!A1", sheets)).toBe("'?'!A1");
  });
  it("l'affichage cite seulement les noms qui l'exigent et suit un renommage", () => {
    expect(toDisplay("{s1}!B3+{s2}!A1", sheets)).toBe("Synthese!B3+'Feuille 2'!A1");
    expect(toDisplay("{s1}!B3", [{ id: "s1", name: "Bilan" }])).toBe("Bilan!B3");
  });
  it("une formule qui n'est qu'une référence est reconnue", () => {
    expect(singleRef("{s1}!B3")).toEqual({ sheet: "s1", ref: "B3" });
    expect(singleRef(" {s1}!$B$3 ")).toEqual({ sheet: "s1", ref: "B3" });
    expect(singleRef("{s1}!B3/2")).toBeNull();
    expect(singleRef("B3")).toBeNull();
  });
});
