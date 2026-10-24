// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { luaLanguage } from "./luaSyntax";

/** [node name, text] pairs of the leaf tokens of `code` (whitespace skipped). */
function tokens(code: string): [string, string][] {
  const state = EditorState.create({ doc: code, extensions: [luaLanguage] });
  const out: [string, string][] = [];
  syntaxTree(state).iterate({
    enter: (n) => { if (!n.node.firstChild && n.from < n.to) out.push([n.name, code.slice(n.from, n.to)]); },
  });
  return out;
}
const kind = (code: string, text: string) => tokens(code).find(([, t]) => t === text)?.[0];

describe("luaLanguage", () => {
  it("separates keywords, constants, numbers, strings and comments", () => {
    const code = 'local n = 12 -- c\nif n == nil then print("x") end';
    expect(kind(code, "local")).toBe("keyword");
    expect(kind(code, "12")).toBe("number");
    expect(kind(code, "-- c")).toBe("comment");
    expect(kind(code, "nil")).toBe("bool");
    expect(kind(code, '"x"')).toBe("string");
    expect(kind(code, "==")).toBe("operator");
  });

  it("tells library names, members and user variables apart", () => {
    const code = 'local total = sheet.getValue("A1") + math.max(1, 2)';
    expect(kind(code, "sheet")).toBe("variableName.standard");
    expect(kind(code, "math")).toBe("variableName.standard");
    expect(kind(code, "getValue")).toBe("propertyName");
    expect(kind(code, "max")).toBe("propertyName");
    expect(kind(code, "total")).toBe("variableName");
  });

  it("handles method calls, escapes and long brackets", () => {
    expect(kind("sheet:setCell()", "setCell")).toBe("propertyName");
    expect(kind('x = "a\\"b"', '"a\\"b"')).toBe("string");
    const multi = tokens("--[[ a\nb ]] local x");
    expect(multi.filter(([n]) => n === "comment").map(([, t]) => t).join("")).toContain("b ]]");
    expect(kind("--[[ a\nb ]] local x", "local")).toBe("keyword");
  });
});
