// @vitest-environment jsdom
/** Tests du composant toast : affichage, action, durée, remplacement, Échap, aria. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { showToast } from "./toast";

const q = () => document.body.querySelectorAll(".dk-toast");

describe("toast", () => {
  beforeEach(() => { vi.useFakeTimers(); document.body.innerHTML = ""; });
  afterEach(() => { vi.useRealTimers(); });

  it("affiche le message avec role=status et aria-live=polite", () => {
    showToast({ message: "Cellule effacée" });
    const el = q()[0];
    expect(el.textContent).toContain("Cellule effacée");
    expect(el.getAttribute("role")).toBe("status");
    expect(el.getAttribute("aria-live")).toBe("polite");
  });

  it("clic sur l'action: onAction une fois, toast fermé", () => {
    const onAction = vi.fn();
    showToast({ message: "m", actionLabel: "Annuler", onAction });
    const btn = document.querySelector<HTMLButtonElement>(".dk-toast__action")!;
    expect(btn.textContent).toBe("Annuler");
    btn.click(); btn.click();
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(q().length).toBe(0);
  });

  it("disparaît après la durée", () => {
    showToast({ message: "m", duration: 1000 });
    vi.advanceTimersByTime(999);
    expect(q().length).toBe(1);
    vi.advanceTimersByTime(2);
    expect(q().length).toBe(0);
  });

  it("durée par défaut 5000 ms", () => {
    showToast({ message: "m" });
    vi.advanceTimersByTime(4999);
    expect(q().length).toBe(1);
    vi.advanceTimersByTime(2);
    expect(q().length).toBe(0);
  });

  it("le nouveau toast remplace l'ancien", () => {
    showToast({ message: "un" });
    showToast({ message: "deux" });
    expect(q().length).toBe(1);
    expect(q()[0].textContent).toContain("deux");
  });

  it("l'ancien handle ne ferme pas le nouveau", () => {
    const h = showToast({ message: "un" });
    showToast({ message: "deux" });
    h.dismiss();
    expect(q().length).toBe(1);
  });

  it("Échap ferme", () => {
    showToast({ message: "m" });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(q().length).toBe(0);
  });

  it("dismiss() est idempotent", () => {
    const h = showToast({ message: "m" });
    h.dismiss(); h.dismiss();
    expect(q().length).toBe(0);
  });

  it("bouton d'action focusable (button natif)", () => {
    showToast({ message: "m", actionLabel: "Annuler" });
    const btn = document.querySelector<HTMLButtonElement>(".dk-toast__action")!;
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.type).toBe("button");
  });
});
