/** Tests du découpage « Texte en colonnes » (moteur pur). */
import { describe, expect, it } from "vitest";
import { splitLine, splitColumn } from "./textsplit";

describe("splitLine", () => {
  it("virgule", () => expect(splitLine("a,b,c", { delims: [","] })).toEqual(["a", "b", "c"]));
  it("point-virgule et tabulation", () => {
    expect(splitLine("a;b\tc", { delims: [";", "\t"] })).toEqual(["a", "b", "c"]);
  });
  it("autre délimiteur", () => expect(splitLine("a|b", { delims: [], other: "|" })).toEqual(["a", "b"]));
  it("espace + fusion des délimiteurs consécutifs", () => {
    expect(splitLine("a   b", { delims: [" "], merge: true })).toEqual(["a", "b"]);
    expect(splitLine("a  b", { delims: [" "] })).toEqual(["a", "", "b"]);
  });
  it("guillemets protègent le délimiteur", () => {
    expect(splitLine('"a,b",c', { delims: [","] })).toEqual(["a,b", "c"]);
  });
  it("sans délimiteur : une seule partie", () => expect(splitLine("a,b", { delims: [] })).toEqual(["a,b"]));
});

describe("splitColumn", () => {
  it("découpe vers la droite, clés A1", () => {
    const r = splitColumn({ A1: "1,2", A2: "x,y,z" }, { delims: [","] });
    expect(r.cells).toEqual({ A1: "1", B1: "2", A2: "x", B2: "y", C2: "z" });
    expect(r.cols).toBe(3);
  });
  it("cellule vide ignorée", () => expect(splitColumn({ A1: "" }, { delims: [","] }).cells).toEqual({}));
  it("colonne au-delà de Z", () => {
    expect(splitColumn({ Z1: "a,b" }, { delims: [","] }).cells).toEqual({ Z1: "a", AA1: "b" });
  });
});
