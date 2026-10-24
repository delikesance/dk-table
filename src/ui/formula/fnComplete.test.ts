import { describe, expect, it } from "vitest";
import { applyFn, fnCompletion, signatureParts } from "./fnComplete";
import type { FnDoc } from "../sidebar/sidebar";

/** Function completion after "=": list of names matching the word at the caret, or the hint of the call around it. */
const DOCS: FnDoc[] = [
  { name: "SUMIF", signature: "SUMIF(plage; critère; [somme])", description: "Somme conditionnelle" },
  { name: "SUM", signature: "SUM(A1:A5)", description: "Somme des nombres" },
  { name: "SQRT", signature: "SQRT(x)", description: "Racine carrée" },
  { name: "IF", signature: "IF(test; oui; non)", description: "Condition" },
  { name: "ROUND", signature: "ROUND(x; n)", description: "Arrondi" },
];
const at = (s: string) => fnCompletion(s.replace("|", ""), s.indexOf("|"), DOCS);

describe("fnCompletion: list", () => {
  it("lists functions starting with the word, exact match first then alphabetical", () => {
    const c = at("=su|");
    expect(c?.kind).toBe("list");
    if (c?.kind !== "list") return;
    expect(c.options.map((d) => d.name)).toEqual(["SUM", "SUMIF"]);
    expect(c.from).toBe(1);
  });
  it("lists every function right after = and after an operator, ( or ;", () => {
    expect(at("=|")?.kind).toBe("list");
    expect(at("=1+s|")?.kind).toBe("list");
    expect(at("=IF(s|")?.kind).toBe("list");
    expect(at("=IF(A1; r|")).toMatchObject({ kind: "list", from: 8 });
  });
  it("is off outside formulas, in strings, and on references", () => {
    expect(at("su|")).toBeNull();
    expect(at('="su|')).toBeNull();
    expect(at("=A1:s|")).toBeNull();
    expect(at("=Feuille2!s|")).toBeNull();
    expect(at("=$s|")).toBeNull();
  });
  it("returns no list when nothing matches (e.g. a cell reference A1)", () => {
    expect(at("=A1|")).toBeNull();
    expect(at("=sumx|")).toBeNull();
  });
});

describe("fnCompletion: hint", () => {
  it("gives the innermost open call and the argument index under the caret", () => {
    expect(at("=SUMIF(|")).toMatchObject({ kind: "hint", arg: 0 });
    expect(at("=SUMIF(A1:A3; |")).toMatchObject({ kind: "hint", arg: 1 });
    const c = at("=IF(ROUND(A1; |");
    expect(c).toMatchObject({ kind: "hint", arg: 1 });
    if (c?.kind === "hint") expect(c.doc.name).toBe("ROUND");
  });
  it("ignores separators inside nested calls and strings", () => {
    expect(at("=IF(ROUND(1; 2); |")).toMatchObject({ kind: "hint", arg: 1 });
    expect(at('=IF("a;b"; |')).toMatchObject({ kind: "hint", arg: 1 });
  });
  it("prefers the name list while a name is being typed, and is off after the call closes", () => {
    expect(at("=IF(ro|")?.kind).toBe("list");
    expect(at("=SUM(A1)|")).toBeNull();
    expect(at("=NOPE(|")).toBeNull();
  });
});

describe("applyFn", () => {
  it("replaces the typed word with NAME( and puts the caret after (", () => {
    expect(applyFn("=1+su", 3, 5, "SUM")).toEqual({ text: "=1+SUM(", caret: 7 });
  });
  it("keeps the text after the caret and does not double an existing (", () => {
    expect(applyFn("=su+1", 1, 3, "SUM")).toEqual({ text: "=SUM(+1", caret: 5 });
    expect(applyFn("=su(A1)", 1, 3, "SUM")).toEqual({ text: "=SUM(A1)", caret: 5 });
  });
});

describe("signatureParts", () => {
  it("splits a signature into name and arguments", () => {
    expect(signatureParts("SUMIF(plage; critère; [somme])")).toEqual({ name: "SUMIF", args: ["plage", "critère", "[somme]"] });
    expect(signatureParts("PI()")).toEqual({ name: "PI", args: [] });
  });
});
