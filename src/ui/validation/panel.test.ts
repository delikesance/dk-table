// @vitest-environment jsdom
/** « Validation des données » dialog: rules list/form and the invalid-cells list with « Corriger ». */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openValidationDialog, type ValHost } from "./panel";
import type { Invalid, ValRule } from "../../engine/validation/types";

let rules: ValRule[];
let bad: Invalid[];
let host: ValHost;
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const rows = () => [...document.querySelectorAll(".dk-val__bad li")].map((li) => li.textContent);
const set = (name: string, v: string) => { const f = $<HTMLInputElement>(`.dk-val__form [name="${name}"]`); f.value = v; f.dispatchEvent(new Event("change", { bubbles: true })); };

beforeEach(() => {
  document.body.innerHTML = "";
  rules = [{ range: "A1:A9", type: "whole", min: 1, max: 10 }];
  bad = [{ key: "A2", raw: "99", message: "Attendu : un nombre entier entre 1 et 10" }, { key: "A3", raw: "x", message: "Attendu : un nombre entier entre 1 et 10" }];
  host = {
    validationRules: () => structuredClone(rules),
    setValidationRules: vi.fn((r: ValRule[]) => { rules = r; }),
    invalidCells: () => bad,
    fixInvalid: vi.fn((keys?: string[]) => { bad = keys ? bad.filter((b) => !keys.includes(b.key)) : []; }),
    selection: () => "C2:C8",
  };
});

describe("openValidationDialog", () => {
  it("lists rules and invalid cells, once", () => {
    openValidationDialog(host); openValidationDialog(host);
    expect(document.querySelectorAll(".dk-dialog")).toHaveLength(1);
    expect($(".dk-val__rules").textContent).toMatch(/A1:A9.*entier/);
    expect(rows()).toHaveLength(2);
    expect(rows()[0]).toMatch(/A2.*99/);
  });
  it("« Corriger » fixes one cell, « Tout corriger » the rest", () => {
    openValidationDialog(host);
    $<HTMLButtonElement>('.dk-val__bad li [data-action="fix"]').click();
    expect(host.fixInvalid).toHaveBeenCalledWith(["A2"]);
    expect(rows()).toHaveLength(1);
    $<HTMLButtonElement>('[data-action="fix-all"]').click();
    expect(host.fixInvalid).toHaveBeenLastCalledWith(undefined);
    expect(document.querySelector(".dk-val__bad li")).toBeNull();
  });
  it("adds a rule on the selection and deletes one", () => {
    openValidationDialog(host);
    expect($<HTMLInputElement>('.dk-val__form [name="range"]').value).toBe("C2:C8");
    set("type", "list"); set("items", "oui, non");
    $<HTMLButtonElement>('[data-action="add"]').click();
    expect(rules[1]).toEqual({ range: "C2:C8", type: "list", items: ["oui", "non"] });
    $<HTMLButtonElement>('.dk-val__rules [data-action="del"]').click();
    expect(rules).toHaveLength(1);
    expect(rules[0].type).toBe("list");
  });
  it("rejects an invalid range", () => {
    openValidationDialog(host);
    set("range", "zz");
    $<HTMLButtonElement>('[data-action="add"]').click();
    expect(host.setValidationRules).not.toHaveBeenCalled();
    expect($(".dk-val__err").textContent).toMatch(/plage/i);
  });
});
