// @vitest-environment jsdom
/** Dialogue « Fonctions nommées » : ajout, remplacement, erreur, suppression. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openNamedFns, upsertFn } from "./namedFns";
import type { App } from "../appTypes";
import type { UserFn } from "../../engine/userfnStore";

const fake = (init: UserFn[] = []) => {
  let list = init;
  const setFunctions = vi.fn((l: UserFn[]) => { list = l; });
  return { app: { getFunctions: () => list, setFunctions } as unknown as App, setFunctions };
};
beforeEach(() => { document.body.innerHTML = ""; });

describe("namedFns", () => {
  it("upsertFn ajoute, remplace (même nom), refuse les noms invalides", () => {
    const a = { name: "TVA", params: ["ht"], body: "=ht*1.2" };
    expect(upsertFn([], a)).toEqual({ list: [a] });
    const b = { ...a, body: "=ht*1.1" };
    expect(upsertFn([a], b)).toEqual({ list: [b] });
    expect("error" in upsertFn([], { ...a, name: "SUM" })).toBe(true);
  });
  it("dialogue : saisir et ajouter appelle setFunctions", () => {
    const { app, setFunctions } = fake();
    openNamedFns(app);
    const q = (n: string) => document.querySelector<HTMLInputElement>(`[name="${n}"]`)!;
    q("name").value = "TVA"; q("params").value = "ht; taux"; q("body").value = "=ht*(1+taux)";
    document.querySelector<HTMLButtonElement>('[data-action="add-fn"]')!.click();
    expect(setFunctions).toHaveBeenCalledWith([{ name: "TVA", params: ["ht", "taux"], body: "=ht*(1+taux)" }]);
    expect(document.body.textContent).toContain("TVA(ht; taux)");
  });
  it("dialogue : erreur affichée, rien enregistré", () => {
    const { app, setFunctions } = fake();
    openNamedFns(app);
    document.querySelector<HTMLInputElement>('[name="name"]')!.value = "1x";
    document.querySelector<HTMLButtonElement>('[data-action="add-fn"]')!.click();
    expect(setFunctions).not.toHaveBeenCalled();
    expect(document.querySelector(".dk-fns__err")!.textContent).not.toBe("");
  });
  it("dialogue : supprimer", () => {
    const { app, setFunctions } = fake([{ name: "F", params: [], body: "=1" }]);
    openNamedFns(app);
    document.querySelector<HTMLButtonElement>('[data-action="del-fn"]')!.click();
    expect(setFunctions).toHaveBeenCalledWith([]);
  });
});
