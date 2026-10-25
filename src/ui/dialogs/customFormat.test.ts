// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { openCustomFormat } from "./customFormat";
import type { App } from "../appTypes";

/** Ferme toutes les boîtes ouvertes entre les tests (une seule instance par id). */
afterEach(() => document.querySelectorAll(".dk-dialog, .dk-dialog__scrim").forEach((el) => el.remove()));

/** Faux App : seul `style` est lu par le dialogue. */
const fakeApp = () => ({ style: vi.fn() }) as unknown as App & { style: ReturnType<typeof vi.fn> };

describe("openCustomFormat", () => {
  it("aperçu et bouton Appliquer selon la validité du code", () => {
    openCustomFormat(fakeApp());
    const box = document.querySelector<HTMLElement>('.dk-dialog[data-id="custom-format"]')!;
    const input = box.querySelector<HTMLInputElement>('input[name="code"]')!;
    const apply = box.querySelector<HTMLButtonElement>('[data-action="apply"]')!;
    input.value = '0.0" cm"';
    input.dispatchEvent(new Event("input"));
    expect(box.querySelector(".dk-dialog__preview")!.textContent).toContain("1234,5 cm ; -3,0 cm ; 0,0 cm");
    expect(apply.disabled).toBe(false);
    input.value = "0 kg";
    input.dispatchEvent(new Event("input"));
    expect(apply.disabled).toBe(true);
    expect(box.querySelector(".dk-dialog__error")!.textContent).toContain("kg");
  });

  it("Appliquer envoie le code dans le style (préfixe custom:)", () => {
    const app = fakeApp();
    openCustomFormat(app);
    const box = document.querySelector<HTMLElement>('.dk-dialog[data-id="custom-format"]')!;
    const input = box.querySelector<HTMLInputElement>('input[name="code"]')!;
    input.value = '0.0" cm"';
    input.dispatchEvent(new Event("input"));
    box.querySelector<HTMLButtonElement>('[data-action="apply"]')!.click();
    expect(app.style).toHaveBeenCalledWith({ format: 'custom:0.0" cm"' });
    expect(document.querySelector('.dk-dialog[data-id="custom-format"]')).toBeNull();
  });
});
