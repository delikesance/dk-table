// @vitest-environment jsdom
/** Tests de ui/dialogs/password.ts : saisie, confirmation, erreur affichée sans fermer la boîte. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { openPasswordDialog } from "./password";

const flush = () => new Promise((r) => setTimeout(r, 0));
const field = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
const submit = () => document.querySelector<HTMLButtonElement>('[data-action="submit"]')!.click();

describe("password dialog", () => {
  afterEach(() => { document.body.innerHTML = ""; });

  it("sends the typed password and closes on success", async () => {
    const onSubmit = vi.fn(async () => {});
    openPasswordDialog({ id: "pw-ok", title: "Ouvrir", button: "Ouvrir", confirm: false, onSubmit });
    field("pw").value = "secret";
    submit();
    await flush();
    expect(onSubmit).toHaveBeenCalledWith("secret");
    expect(document.querySelector('.dk-dialog[data-id="pw-ok"]')).toBeNull();
  });

  it("shows the error and keeps the dialog open", async () => {
    const onSubmit = vi.fn(async () => { throw new Error("Mot de passe incorrect"); });
    openPasswordDialog({ id: "pw-bad", title: "Ouvrir", button: "Ouvrir", confirm: false, onSubmit });
    field("pw").value = "faux";
    submit();
    await flush();
    expect(document.querySelector(".dk-dialog__error")!.textContent).toBe("Mot de passe incorrect");
    expect(document.querySelector('.dk-dialog[data-id="pw-bad"]')).not.toBeNull();
  });

  it("refuses an empty password and mismatched confirmation without calling onSubmit", async () => {
    const onSubmit = vi.fn(async () => {});
    openPasswordDialog({ id: "pw-conf", title: "Chiffrer", button: "Chiffrer", confirm: true, onSubmit });
    submit();
    await flush();
    expect(onSubmit).not.toHaveBeenCalled();
    field("pw").value = "a";
    field("pw2").value = "b";
    submit();
    await flush();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.querySelector(".dk-dialog__error")!.textContent).toMatch(/correspondent pas/);
  });
});
