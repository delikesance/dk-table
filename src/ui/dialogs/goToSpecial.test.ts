// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openGoToSpecial } from "./goToSpecial";
import type { App } from "../appTypes";

let calls: unknown[];
let found: number;
const app = () => ({ goSpecial: (o: unknown) => { calls.push(o); return found; } }) as unknown as App;
const box = () => document.querySelector<HTMLElement>('.dk-dialog[data-id="special"]')!;
const submit = () => box().querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));

beforeEach(() => {
  document.body.innerHTML = "";
  calls = []; found = 2;
});

describe("boîte Atteindre spécial", () => {
  it("envoie la cible, les types cochés et le filtre visible", () => {
    openGoToSpecial(app());
    box().querySelector<HTMLInputElement>('input[name="kind"][value="formulas"]')!.checked = true;
    box().querySelector<HTMLInputElement>('input[name="types"][value="text"]')!.checked = false;
    box().querySelector<HTMLInputElement>('input[name="visible"]')!.checked = true;
    submit();
    expect(calls).toEqual([{ kind: "formulas", types: ["number", "logical", "error"], visibleOnly: true }]);
  });

  it("les types sont désactivés pour les cellules vides", () => {
    openGoToSpecial(app());
    box().querySelector<HTMLInputElement>('input[name="kind"][value="blanks"]')!.checked = true;
    box().querySelector("form")!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(box().querySelector<HTMLInputElement>('input[name="types"]')!.disabled).toBe(true);
  });

  it("aucune cellule : message, boîte ouverte", () => {
    found = 0;
    openGoToSpecial(app());
    submit();
    expect(box().querySelector(".dk-special__msg")!.textContent).toContain("Aucune cellule trouvée");
    expect(box().isConnected).toBe(true);
  });

  it("succès : la boîte se ferme", () => {
    openGoToSpecial(app());
    submit();
    expect(document.querySelector('.dk-dialog[data-id="special"]')).toBeNull();
  });
});
