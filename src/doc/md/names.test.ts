import { describe, expect, it } from "vitest";
import { toEditorText, toStoredText } from "./names";

/** Stored text (sheet ids) <-> editor text (sheet names) for every live element. */
const sheets = [{ id: "s1", name: "Ventes" }, { id: "s2", name: "Bilan 2024" }];
const stored = "a {{@s1!B3}} {{=SUM({s2}!A1:A3)*2|percent}}\n\n```dkblock\n{\"sheet\":\"s2\",\"ref\":\"A1:B2\",\"kind\":\"table\",\"header\":true,\"cols\":null,\"value\":null}\n```\n";

describe("names", () => {
  it("shows sheet names in the editor text", () => {
    const t = toEditorText(stored, sheets);
    expect(t).toContain("{{@Ventes!B3}}");
    expect(t).toContain("{{=SUM('Bilan 2024'!A1:A3)*2|percent}}");
    expect(t).toContain('"sheet":"Bilan 2024"');
  });
  it("gets back the stored text", () => {
    expect(toStoredText(toEditorText(stored, sheets), sheets)).toBe(stored);
  });
  it("keeps unknown sheets as typed", () => {
    expect(toStoredText("{{@Inconnue!B3}} {{=Inconnue!A1}}", sheets)).toBe("{{@Inconnue!B3}} {{=Inconnue!A1}}");
  });
});
