// @vitest-environment jsdom
/** « Formatage conditionnel » dialog: rule list (order, edit, delete) and rule editor. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openCfDialog, type CfHost } from "./panel";
import type { CfRule } from "../../engine/cf/types";

let rules: CfRule[];
let host: CfHost & { setCfRules: ReturnType<typeof vi.fn> };
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T & Element>(s) as T;
const items = () => [...document.querySelectorAll(".dk-cf__item")].map((li) => li.textContent);
const field = (name: string) => $<HTMLInputElement & HTMLSelectElement>(`.dk-cf__form [name="${name}"]`);
const set = (name: string, v: string) => { const f = field(name); f.value = v; f.dispatchEvent(new Event("change", { bubbles: true })); };
const click = (s: string) => $<HTMLElement>(s).click();

const A: CfRule = { id: "a", range: "A1:A9", type: "cell", op: "gt", a: "100", format: { fill: "#fde2e0" } };
const B: CfRule = { id: "b", range: "B1:B9", type: "duplicate", format: { bold: true } };

beforeEach(() => {
  document.body.innerHTML = "";
  rules = [A, B];
  host = {
    cfRules: () => structuredClone(rules),
    setCfRules: vi.fn((r: CfRule[]) => { rules = r; }),
    selection: () => "C2:C8",
  };
});

describe("openCfDialog", () => {
  it("lists the rules of the sheet by priority, once", () => {
    openCfDialog(host); openCfDialog(host);
    expect(document.querySelectorAll(".dk-dialog")).toHaveLength(1);
    expect($("h2").textContent).toBe("Formatage conditionnel");
    expect(items()).toEqual([expect.stringContaining("Valeur > 100"), expect.stringContaining("Valeurs en double")]);
    expect(items()[0]).toContain("A1:A9");
  });
  it("moves, deletes rules (each change saved immediately)", () => {
    openCfDialog(host);
    click('.dk-cf__item:nth-child(2) [data-action="up"]');
    expect(rules.map((r) => r.id)).toEqual(["b", "a"]);
    expect(items()[0]).toContain("Valeurs en double");
    click('.dk-cf__item:nth-child(1) [data-action="delete"]');
    expect(rules.map((r) => r.id)).toEqual(["a"]);
    expect(items()).toHaveLength(1);
  });
  it("adds a rule on the current selection", () => {
    openCfDialog(host);
    click('[data-action="add"]');
    expect(field("range").value).toBe("C2:C8");
    set("type", "text");
    expect(field("text").closest("[hidden]")).toBeNull();
    expect(field("a").closest("[hidden]")).not.toBeNull();
    set("textOp", "begins");
    set("text", "Fr");
    click('.dk-cf__form input[name="fill"][value="#d9f2dd"]');
    field("bold").click();
    click('[data-action="save"]');
    const added = rules[2];
    expect(added).toMatchObject({ range: "C2:C8", type: "text", op: "begins", text: "Fr", format: { fill: "#d9f2dd", bold: true } });
    expect(added.id).toBeTruthy();
    expect(items()).toHaveLength(3);
  });
  it("edits a rule in place, keeping its id and priority", () => {
    openCfDialog(host);
    click('.dk-cf__item:nth-child(1) [data-action="edit"]');
    expect(field("a").value).toBe("100");
    set("op", "between");
    expect(field("b").closest("[hidden]")).toBeNull();
    set("a", "5"); set("b", "10");
    click('[data-action="save"]');
    expect(rules[0]).toMatchObject({ id: "a", op: "between", a: "5", b: "10", format: { fill: "#fde2e0" } });
  });
  it("builds color scales and data bars", () => {
    openCfDialog(host);
    click('[data-action="add"]');
    set("type", "scale");
    field("useMid").click();
    click('[data-action="save"]');
    expect(rules[2]).toMatchObject({ type: "scale", min: expect.any(String), mid: expect.any(String), max: expect.any(String) });
    click('[data-action="add"]');
    set("type", "bar");
    click('[data-action="save"]');
    expect(rules[3]).toMatchObject({ type: "bar", color: expect.stringMatching(/^#/) });
  });
  it("refuses an invalid rule and says why; cancel returns to the list", () => {
    openCfDialog(host);
    click('[data-action="add"]');
    set("range", "pas une plage");
    click('[data-action="save"]');
    expect(host.setCfRules).not.toHaveBeenCalled();
    expect($(".dk-cf__error").textContent).toMatch(/plage/i);
    set("range", "A1:A3");
    click('[data-action="save"]');
    expect($(".dk-cf__error").textContent).toMatch(/valeur/i);
    click('[data-action="cancel"]');
    expect(items()).toHaveLength(2);
  });
});
