import { describe, expect, it } from "vitest";
import { complete } from "./complete";
import { SHEET_FUNCTIONS } from "./api";
import { DOCS } from "./luadocs";

/** Labels proposed at the end of `text`. */
const labels = (text: string, explicit = false) => complete(text, text.length, explicit)?.options.map((o) => o.label) ?? null;

describe("complete", () => {
  it("documents every function of the sheet API", () => {
    const documented = DOCS.sheet.map((d) => d.label).sort();
    expect(documented).toEqual([...SHEET_FUNCTIONS].sort());
    for (const d of DOCS.sheet) expect(d.info.length).toBeGreaterThan(0);
  });

  it("lists sheet members after `sheet.` and `sheet:` filtered by prefix", () => {
    expect(labels("sheet.")).toEqual(expect.arrayContaining(["getValue", "setCell", "selection"]));
    expect(labels("x = sheet.get")).toEqual(["getValue", "getDisplay", "getRaw", "getRangeValues"]);
    expect(labels("sheet:set")).toEqual(["setCell"]);
  });

  it("returns the replace position just after the dot", () => {
    const text = "sheet.ge";
    expect(complete(text, text.length, false)?.from).toBe(6);
  });

  it("completes standard library namespaces", () => {
    expect(labels("string.up")).toEqual(["upper"]);
    expect(labels("math.fl")).toEqual(["floor"]);
    expect(labels("table.ins")).toEqual(["insert"]);
  });

  it("completes globals, keywords and local names", () => {
    expect(labels("pri")).toEqual(["print"]);
    expect(labels("loc")).toEqual(["local"]);
    expect(labels("local total = 0\ntot")).toEqual(["total"]);
    expect(labels("function addRow(n) end\nadd")).toEqual(["addRow"]);
    expect(labels("for idx = 1, 3 do\n  id")).toEqual(["idx"]);
    expect(labels("she")).toEqual(["sheet"]);
  });

  it("is case-insensitive on the prefix", () => {
    expect(labels("sheet.getvalue")).toEqual(["getValue"]);
  });

  it("stays silent inside strings and comments, and without a prefix unless explicit", () => {
    expect(labels('sheet.getValue("A')).toBeNull();
    expect(labels("-- pri")).toBeNull();
    expect(labels("x = ")).toBeNull();
    expect(labels("x = ", true)).toEqual(expect.arrayContaining(["sheet", "print", "local"]));
  });

  it("returns nothing for unknown namespaces", () => {
    expect(labels("foo.ba")).toBeNull();
  });
});
