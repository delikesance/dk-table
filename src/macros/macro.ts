/**
 * Macros Lua (wasmoon = Lua 5.4 en WASM) manipulant les cellules via l'API
 * publique du moteur. Exposé à Lua: getValue, getRaw, setCell, getRange.
 */
import { LuaFactory } from "wasmoon";
import wasmUrl from "wasmoon/dist/glue.wasm?url";
import type { Sheet, Value } from "../engine/sheet";
import { getRangeValues, getRaw, getValue, setCell } from "../engine/sheet";
import { displayValue } from "../engine/values";

/** Accès aux cellules vu par Lua (adresses type "A1", plages "A1:B3"). */
export interface MacroApi {
  getValue(addr: string): number | string | boolean;
  getRaw(addr: string): string;
  setCell(addr: string, raw: string): void;
  getRange(range: string): number[];
}

/** Résultat d'une exécution: jamais d'exception, message d'erreur en français. */
export interface MacroResult {
  ok: boolean;
  error?: string;
}

/** Options d'exécution (délai maximal en ms, 2000 par défaut). */
export interface MacroOptions {
  timeoutMs?: number;
}

/** Adapte une feuille du moteur à `MacroApi` (les erreurs de cellule deviennent du texte "#DIV/0!"). */
export function sheetApi(sheet: Sheet): MacroApi {
  const plain = (v: Value): number | string | boolean =>
    typeof v === "object" ? displayValue(v) : v;
  return {
    getValue: (a) => plain(getValue(sheet, a)),
    getRaw: (a) => getRaw(sheet, a),
    setCell: (a, raw) => setCell(sheet, a, raw),
    getRange: (r) => getRangeValues(sheet, r),
  };
}

/** Node (tests): wasmoon trouve seul son .wasm; navigateur/Tauri: URL émise par Vite. */
const inNode = import.meta.env.MODE === "test";
const HOOK_STEP = 1000;
const TIMEOUT_TAG = "__macro_timeout__";

/** Convertit une valeur Lua en texte brut de cellule. */
const toRaw = (v: unknown): string => (v == null ? "" : String(v));

/**
 * Exécute `code` Lua dans un état neuf. Un hook d'instructions (tous les
 * 1000 pas) interrompt le script après `timeoutMs` (boucle infinie).
 * Les écritures sont immédiates (recalcul des dépendants par le moteur).
 */
export async function runMacro(code: string, api: MacroApi, opts: MacroOptions = {}): Promise<MacroResult> {
  const timeoutMs = opts.timeoutMs ?? 2000;
  let lua: Awaited<ReturnType<LuaFactory["createEngine"]>> | undefined;
  try {
    lua = await new LuaFactory(inNode ? undefined : wasmUrl).createEngine();
    lua.global.set("getValue", (a: string) => api.getValue(String(a)));
    lua.global.set("getRaw", (a: string) => api.getRaw(String(a)));
    lua.global.set("setCell", (a: string, v: unknown) => api.setCell(String(a), toRaw(v)));
    lua.global.set("getRange", (r: string) => api.getRange(String(r)));
    lua.global.set("__deadline", Date.now() + timeoutMs);
    lua.global.set("__now", () => Date.now());
    lua.global.set("__code", code);
    // Le hook est par thread Lua: il est posé et le code chargé dans le même chunk.
    await lua.doString(
      `local d, now, e = __deadline, __now, error
       debug.sethook(function() if now() > d then e("${TIMEOUT_TAG}") end end, "", ${HOOK_STEP})
       local f, m = load(__code, "macro")
       if not f then e(m, 0) end
       f()`,
    );
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes(TIMEOUT_TAG)) return { ok: false, error: `Macro interrompue: délai de ${timeoutMs} ms dépassé.` };
    return { ok: false, error: `Erreur de macro: ${msg}` };
  } finally {
    lua?.global.close();
  }
}
