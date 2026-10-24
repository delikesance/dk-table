/** Formula bar callbacks. */
export interface FormulaBarOpts {
  /** Jump request: normalized (uppercase) cell key or range, e.g. "C3" or "C3:D4". */
  onGoto(target: string): void;
  /** Raw content committed with Enter in the fx input. */
  onCommit(raw: string): void;
}

/** Public formula bar API. */
export interface FormulaBar { el: HTMLElement; setCell(key: string, raw: string): void; focus(): void }

const REF = /^[A-Z]{1,3}[1-9]\d*(:[A-Z]{1,3}[1-9]\d*)?$/;

/** Creates a text input with class and aria-label. */
function mkInput(cls: string, label: string): HTMLInputElement {
  const i = document.createElement("input");
  i.type = "text"; i.className = cls; i.setAttribute("aria-label", label);
  i.spellcheck = false; i.autocomplete = "off";
  return i;
}

/**
 * Builds name box + fx input in `host`. Name box: type a key/range, Enter jumps
 * (invalid text reverts), Esc reverts. fx: Enter commits, Esc reverts.
 */
export function createFormulaBar(host: HTMLElement, opts: FormulaBarOpts): FormulaBar {
  const el = document.createElement("div");
  el.className = "dk-formula";
  const name = mkInput("dk-formula__name", "Cellule active");
  const fxLabel = document.createElement("span");
  fxLabel.className = "dk-formula__fx"; fxLabel.textContent = "fx"; fxLabel.setAttribute("aria-hidden", "true");
  const fx = mkInput("dk-formula__input", "Contenu de la cellule");
  el.append(name, fxLabel, fx); host.append(el);
  let key = "", raw = "";

  name.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const t = name.value.trim().toUpperCase();
      if (REF.test(t)) opts.onGoto(t); else name.value = key;
    } else if (e.key === "Escape") { name.value = key; }
  });
  fx.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); raw = fx.value; opts.onCommit(fx.value); }
    else if (e.key === "Escape") { fx.value = raw; }
  });
  return {
    el,
    setCell(k, r) { key = k; raw = r; name.value = k; fx.value = r; },
    focus() { fx.focus(); },
  };
}
