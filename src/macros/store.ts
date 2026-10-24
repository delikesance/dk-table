/** Workbook macro list (id, name, Lua code) with change notification; persisted in `.dktable` `macros`. */
import type { DocMacro } from "../io/types";

/** A Lua macro. */
export type Macro = DocMacro;

/** Mutable macro collection. Listeners fire after every change (palette, menu, title dirty marker). */
export interface MacroStore {
  list(): Macro[];
  get(id: string): Macro | undefined;
  /** Add an empty macro named "Macro N" (lowest free N). */
  create(): Macro;
  /** Change code and/or name; blank names are ignored. */
  update(id: string, patch: Partial<Pick<Macro, "name" | "code">>): void;
  remove(id: string): void;
  /** Replace all macros (document open / new). */
  load(list: Macro[]): void;
  onChange(fn: () => void): void;
}

let seq = 0;

/** Create an empty macro store. */
export function createMacroStore(): MacroStore {
  let macros: Macro[] = [];
  const listeners: (() => void)[] = [];
  const emit = () => listeners.forEach((fn) => fn());
  return {
    list: () => macros,
    get: (id) => macros.find((m) => m.id === id),
    create() {
      const names = new Set(macros.map((m) => m.name));
      let n = 1;
      while (names.has(`Macro ${n}`)) n++;
      const m = { id: `m${Date.now().toString(36)}${(seq++).toString(36)}`, name: `Macro ${n}`, code: "" };
      macros = [...macros, m];
      emit();
      return m;
    },
    update(id, patch) {
      const name = patch.name?.trim();
      macros = macros.map((m) => (m.id !== id ? m : { ...m, ...(patch.code !== undefined && { code: patch.code }), ...(name && { name }) }));
      emit();
    },
    remove(id) {
      macros = macros.filter((m) => m.id !== id);
      emit();
    },
    load(list) {
      macros = list.map((m) => ({ ...m }));
      emit();
    },
    onChange: (fn) => void listeners.push(fn),
  };
}
