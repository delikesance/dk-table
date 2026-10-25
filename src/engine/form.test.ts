/** Tests de la vue Formulaire (src/engine/form.ts) : champs par colonne, ligne suivante, contrôle d'envoi. */
import { describe, expect, it } from "vitest";
import { formFields, nextRow, checkForm } from "./form";

const GRID = [
  ["Nom", "Qte", "Date", "Note"],
  ["Ana", "2", "03/01/2026", "ok"],
  ["Ben", "1,5", "2026-02-10", ""],
];

describe("formFields", () => {
  it("génère un champ par colonne d'en-tête, type déduit des valeurs", () => {
    const f = formFields(GRID);
    expect(f.map((x) => [x.col, x.name, x.kind])).toEqual([
      [0, "Nom", "text"],
      [1, "Qte", "number"],
      [2, "Date", "date"],
      [3, "Note", "text"],
    ]);
  });

  it("une colonne vide ou mixte reste en texte", () => {
    expect(formFields([["A", "B"], ["x", ""], ["", ""]]).map((x) => x.kind)).toEqual(["text", "text"]);
    expect(formFields([["A"], ["1"], ["abc"]])[0].kind).toBe("text");
  });

  it("ignore les colonnes sans en-tête et une grille vide", () => {
    expect(formFields([["A", ""], ["1", "2"]]).map((x) => x.col)).toEqual([0]);
    expect(formFields([])).toEqual([]);
  });
});

describe("nextRow", () => {
  it("renvoie la ligne après la dernière ligne utilisée (en-tête compris)", () => {
    expect(nextRow(GRID)).toBe(4);
    expect(nextRow([["Nom"]])).toBe(2);
    expect(nextRow([])).toBe(2);
  });
});

describe("checkForm", () => {
  const fields = formFields(GRID);
  const row = 4;

  it("un champ obligatoire vide bloque l'envoi avec un message", () => {
    const r = checkForm(fields, { 0: "", 1: "3", 2: "", 3: "" }, new Set([0]), row);
    expect(r).toEqual({ ok: false, errors: { 0: "Champ obligatoire" } });
  });

  it("un champ vide non obligatoire est accepté (ligne sans valeur)", () => {
    const r = checkForm(fields, { 0: "Cy", 1: "", 2: "", 3: "" }, new Set(), row);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cells).toEqual({ A4: "Cy" });
  });

  it("refuse un nombre invalide et accepte la virgule décimale (écrite avec un point)", () => {
    const bad = checkForm(fields, { 0: "Cy", 1: "deux", 2: "", 3: "" }, new Set(), row);
    expect(bad).toEqual({ ok: false, errors: { 1: "Nombre attendu" } });
    const good = checkForm(fields, { 0: "Cy", 1: "1,5", 2: "", 3: "" }, new Set(), row);
    expect(good.ok && good.cells.B4).toBe("1.5");
  });

  it("accepte JJ/MM/AAAA et AAAA-MM-JJ, refuse une date impossible", () => {
    const ok = checkForm(fields, { 0: "Cy", 1: "", 2: "31/12/2026", 3: "" }, new Set(), row);
    expect(ok.ok && ok.cells.C4).toBe("31/12/2026");
    const iso = checkForm(fields, { 0: "Cy", 1: "", 2: "2026-12-31", 3: "" }, new Set(), row);
    expect(iso.ok).toBe(true);
    const bad = checkForm(fields, { 0: "Cy", 1: "", 2: "31/02/2026", 3: "" }, new Set(), row);
    expect(bad).toEqual({ ok: false, errors: { 2: "Date attendue (JJ/MM/AAAA)" } });
  });

  it("produit les cellules de la ligne (clés A1) sans les champs vides", () => {
    const r = checkForm(fields, { 0: "Cy", 1: "7", 2: "", 3: "note" }, new Set(), row);
    expect(r).toEqual({ ok: true, cells: { A4: "Cy", B4: "7", D4: "note" } });
  });
});
