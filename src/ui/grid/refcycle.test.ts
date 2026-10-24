import { describe, expect, it } from "vitest";
import { cycleRef } from "./refcycle";

describe("cycleRef (F4)", () => {
  it("cycles A1 -> $A$1 -> A$1 -> $A1 -> A1 with the caret after the ref", () => {
    let s = { text: "=A1", caret: 3 };
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) { s = cycleRef(s.text, s.caret); seen.push(s.text); expect(s.caret).toBe(s.text.length); }
    expect(seen).toEqual(["=$A$1", "=A$1", "=$A1", "=A1"]);
  });
  it("works with the caret inside the ref and keeps surrounding text", () => {
    expect(cycleRef("=SUM(B12:C3)+1", 6)).toEqual({ text: "=SUM($B$12:C3)+1", caret: 10 });
  });
  it("takes the ref just left of the caret", () => {
    expect(cycleRef("=A1+B2", 6)).toEqual({ text: "=A1+$B$2", caret: 8 });
    expect(cycleRef("=A1+B2", 3)).toEqual({ text: "=$A$1+B2", caret: 5 });
  });
  it("leaves text unchanged without a ref at the caret", () => {
    expect(cycleRef("=1+2", 2)).toEqual({ text: "=1+2", caret: 2 });
    expect(cycleRef("=A1 + 2", 6)).toEqual({ text: "=A1 + 2", caret: 6 });
  });
  it("ignores function names that end like a ref", () => {
    expect(cycleRef("=LOG10(5)", 6)).toEqual({ text: "=LOG10(5)", caret: 6 });
  });
  it("keeps lowercase refs lowercase", () => {
    expect(cycleRef("=a1", 3).text).toBe("=$a$1");
  });
});
