/** Tests du champ optionnel `calc` d'un `.dktable` (mode de calcul du classeur). */
import { describe, expect, it } from "vitest";
import { calcToDoc, checkCalc } from "./calcFormat";
import { parse, serialize } from "./format";
import { DEFAULT_CALC } from "../engine/calc-mode";

const sheet = { id: "s1", name: "Feuille 1", cols: 26, rows: 100, cells: {} };

describe("calcFormat", () => {
  it("omits the field when the mode is the default one", () => {
    expect(calcToDoc(DEFAULT_CALC)).toBeUndefined();
  });

  it("keeps every setting otherwise", () => {
    const m = { manual: true, iterative: true, maxIter: 50, maxChange: 0.01 };
    expect(calcToDoc(m)).toEqual(m);
  });

  it("validates the field", () => {
    expect(checkCalc({ manual: true })).toEqual({ ...DEFAULT_CALC, manual: true });
    expect(() => checkCalc(3)).toThrow(/calc must be an object/);
    expect(() => checkCalc({ manual: "oui" })).toThrow(/calc.manual/);
    expect(() => checkCalc({ maxIter: 0 })).toThrow(/calc.maxIter/);
    expect(() => checkCalc({ maxChange: -1 })).toThrow(/calc.maxChange/);
  });

  it("round-trips through parse/serialize", () => {
    const calc = { manual: false, iterative: true, maxIter: 100, maxChange: 0.001 };
    const doc = parse(serialize({ version: 1, sheets: [sheet], calc }));
    expect(doc.calc).toEqual(calc);
    expect(parse(serialize({ version: 1, sheets: [sheet] })).calc).toBeUndefined();
  });
});
