/** Tests de MOVING_AVERAGE (moyenne mobile) et EXP_SMOOTH (lissage exponentiel), en débordement. */
import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, setCell } from "./sheet";

/** Sheet with `vals` down column A from A1 (undefined = empty cell); the formula goes in C1. */
function run(formula: string, vals: (string | undefined)[], rows: number): string[] {
  const s = createSheet();
  vals.forEach((v, i) => { if (v !== undefined) setCell(s, `A${i + 1}`, v); });
  setCell(s, "C1", formula);
  return Array.from({ length: rows }, (_, i) => getDisplay(s, `C${i + 1}`));
}

describe("MOVING_AVERAGE", () => {
  it("moyenne glissante, positions incomplètes vides", () => {
    expect(run("=MOVING_AVERAGE(A1:A5;3)", ["1", "2", "3", "4", "5"], 5)).toEqual(["", "", "2", "3", "4"]);
  });
  it("fenêtre égale à la taille : une seule valeur", () => {
    expect(run("=MOVING_AVERAGE(A1:A3;3)", ["1", "2", "6"], 3)).toEqual(["", "", "3"]);
  });
  it("fenêtre <= 0, non entière ou plus grande que la plage -> #NUM!", () => {
    const v = ["1", "2", "3"];
    expect(run("=MOVING_AVERAGE(A1:A3;0)", v, 1)).toEqual(["#NUM!"]);
    expect(run("=MOVING_AVERAGE(A1:A3;-1)", v, 1)).toEqual(["#NUM!"]);
    expect(run("=MOVING_AVERAGE(A1:A3;1.5)", v, 1)).toEqual(["#NUM!"]);
    expect(run("=MOVING_AVERAGE(A1:A3;4)", v, 1)).toEqual(["#NUM!"]);
  });
  it("cellule vide ou texte dans la fenêtre -> case vide", () => {
    expect(run("=MOVING_AVERAGE(A1:A5;3)", ["1", "2", undefined, "4", "5"], 5)).toEqual(["", "", "", "", ""]);
    expect(run("=MOVING_AVERAGE(A1:A4;2)", ["1", "x", "3", "4"], 4)).toEqual(["", "", "", "3.5"]);
  });
  it("plage sur plusieurs colonnes -> #VALUE!", () => {
    const s = createSheet();
    setCell(s, "A1", "1");
    setCell(s, "B1", "2");
    setCell(s, "C1", "=MOVING_AVERAGE(A1:B2;1)");
    expect(getDisplay(s, "C1")).toBe("#VALUE!");
  });
});

describe("EXP_SMOOTH", () => {
  it("s1 = x1, puis s_t = alpha*x_t + (1-alpha)*s_(t-1)", () => {
    expect(run("=EXP_SMOOTH(A1:A4;0.5)", ["10", "20", "30", "40"], 4)).toEqual(["10", "15", "22.5", "31.25"]);
  });
  it("alpha = 1 : la série elle-même", () => {
    expect(run("=EXP_SMOOTH(A1:A3;1)", ["4", "8", "2"], 3)).toEqual(["4", "8", "2"]);
  });
  it("alpha hors de ]0;1] -> #VALUE!", () => {
    const v = ["1", "2"];
    expect(run("=EXP_SMOOTH(A1:A2;0)", v, 1)).toEqual(["#VALUE!"]);
    expect(run("=EXP_SMOOTH(A1:A2;-0.2)", v, 1)).toEqual(["#VALUE!"]);
    expect(run("=EXP_SMOOTH(A1:A2;1.01)", v, 1)).toEqual(["#VALUE!"]);
  });
  it("cellule vide : case vide, s n'est pas mis à jour", () => {
    expect(run("=EXP_SMOOTH(A1:A4;0.5)", ["10", undefined, "30", "40"], 4)).toEqual(["10", "", "20", "30"]);
  });
  it("texte avant la première valeur numérique : case vide jusqu'à elle", () => {
    expect(run("=EXP_SMOOTH(A1:A3;0.5)", ["x", "10", "20"], 3)).toEqual(["", "10", "15"]);
  });
});
