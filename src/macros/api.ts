/** Binds the `sheet` Lua table (cell read/write API exposed to macros) onto a Lua state. */
import { lua, lauxlib, to_luastring as L$ } from "fengari";
import type { LuaState } from "fengari";
import type { Value } from "../engine/sheet";

/** Spreadsheet operations a macro can call; implemented by the app (or tests). */
export interface MacroHost {
  getValue(ref: string): Value;
  getDisplay(ref: string): string;
  getRaw(ref: string): string;
  getRangeValues(range: string): number[];
  /** Write raw input ("" clears, "=..." is a formula); dependents recalculate. */
  setCell(ref: string, raw: string): void;
  selection(): string;
  select(ref: string): void;
  sheetName(): string;
}

/** First "real" argument index: skips `self` when called as `sheet:fn(...)`. */
const base = (L: LuaState): number => (lua.lua_type(L, 1) === lua.LUA_TTABLE ? 2 : 1);

/** Required string argument (A1 reference or range). */
const ref = (L: LuaState, i = 0): string => lauxlib.luaL_checklstring(L, base(L) + i) && lua.lua_tojsstring(L, base(L) + i);

/** Push a number, as a Lua integer when exact (fengari integers are 32-bit) so `print` shows "5" not "5.0". */
function pushNumber(L: LuaState, v: number): void {
  if (Number.isInteger(v) && Math.abs(v) < 2 ** 31) lua.lua_pushinteger(L, v);
  else lua.lua_pushnumber(L, v);
}

/** Push an engine value: errors become their code string ("#DIV/0!"). */
function pushValue(L: LuaState, v: Value): void {
  if (typeof v === "number") pushNumber(L, v);
  else if (typeof v === "boolean") lua.lua_pushboolean(L, v);
  else lua.lua_pushstring(L, L$(typeof v === "string" ? v : v.error));
}

/** Convert a Lua value to raw cell input (nil clears, booleans become TRUE/FALSE). */
function toRaw(L: LuaState, i: number): string {
  switch (lua.lua_type(L, i)) {
    case lua.LUA_TNIL: case lua.LUA_TNONE: return "";
    case lua.LUA_TBOOLEAN: return lua.lua_toboolean(L, i) ? "TRUE" : "FALSE";
    case lua.LUA_TNUMBER: return String(lua.lua_tonumber(L, i));
    case lua.LUA_TSTRING: return lua.lua_tojsstring(L, i);
    default: return lauxlib.luaL_argerror(L, i, L$("nombre, texte, booléen ou nil attendu"));
  }
}

/** Lua-callable functions of the `sheet` table, by name. */
function functions(h: MacroHost): Record<string, (L: LuaState) => number> {
  const str = (L: LuaState, s: string) => (lua.lua_pushstring(L, L$(s)), 1);
  return {
    getValue: (L) => (pushValue(L, h.getValue(ref(L))), 1),
    getDisplay: (L) => str(L, h.getDisplay(ref(L))),
    getRaw: (L) => str(L, h.getRaw(ref(L))),
    getRangeValues: (L) => {
      const vals = h.getRangeValues(ref(L));
      lua.lua_createtable(L, vals.length, 0);
      vals.forEach((v, i) => { pushNumber(L, v); lua.lua_rawseti(L, -2, i + 1); });
      return 1;
    },
    setCell: (L) => { const r = ref(L); h.setCell(r, toRaw(L, base(L) + 1)); return 0; },
    selection: (L) => str(L, h.selection()),
    select: (L) => { h.select(ref(L)); return 0; },
    name: (L) => str(L, h.sheetName()),
  };
}

/** Names of the `sheet` functions (used by autocompletion tests to stay in sync). */
export const SHEET_FUNCTIONS = Object.keys(functions({} as MacroHost));

/** Create the global `sheet` table bound to `h`. */
export function bindSheet(L: LuaState, h: MacroHost): void {
  lua.lua_newtable(L);
  for (const [name, fn] of Object.entries(functions(h))) {
    lua.lua_pushcfunction(L, fn);
    lua.lua_setfield(L, -2, L$(name));
  }
  lua.lua_setglobal(L, L$("sheet"));
}
