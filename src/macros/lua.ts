/**
 * Lua macro runner (fengari, Lua 5.3 in pure JS). Runs code in a sandbox
 * (no io/package/debug, os limited to time/date/clock/difftime), captures
 * `print` output and stops runaway loops after `maxSteps` VM instructions.
 */
import "./envHide";
import { lua, lauxlib, lualib, to_luastring as L$ } from "fengari";
import type { LuaState } from "fengari";
import { bindSheet, type MacroHost } from "./api";
import "./envRestore";

export type { MacroHost } from "./api";

/** Outcome of a macro run. `error` is user-facing ("Ligne 3 : ..."). */
export interface RunResult {
  ok: boolean;
  output: string[];
  error?: string;
}

/** Options of `runMacro`. */
export interface RunOptions {
  /** VM instruction budget before the run is aborted (default 10 million). */
  maxSteps?: number;
}

const LIBS: [string, string][] = [
  ["_G", "luaopen_base"], ["table", "luaopen_table"], ["string", "luaopen_string"],
  ["math", "luaopen_math"], ["utf8", "luaopen_utf8"], ["coroutine", "luaopen_coroutine"], ["os", "luaopen_os"],
];
const OS_KEEP = new Set(["time", "date", "clock", "difftime"]);
const HOOK_EVERY = 1000;
export const LIMIT_MSG = "exécution interrompue, limite d'instructions atteinte";

/** Open the allowed standard libraries and remove unsafe entries. */
function openSandbox(L: LuaState): void {
  for (const [name, open] of LIBS) {
    lauxlib.luaL_requiref(L, L$(name), lualib[open], 1);
    lua.lua_pop(L, 1);
  }
  for (const g of ["dofile", "loadfile", "require"]) {
    lua.lua_pushnil(L);
    lua.lua_setglobal(L, L$(g));
  }
  lua.lua_getglobal(L, L$("os"));
  const drop: string[] = [];
  lua.lua_pushnil(L);
  while (lua.lua_next(L, -2) !== 0) {
    const k = lua.lua_tojsstring(L, -2);
    if (!OS_KEEP.has(k)) drop.push(k);
    lua.lua_pop(L, 1);
  }
  for (const k of drop) { lua.lua_pushnil(L); lua.lua_setfield(L, -2, L$(k)); }
  lua.lua_pop(L, 1);
}

/** Replace `print` so that each call appends one tab-joined line to `out`. */
function bindPrint(L: LuaState, out: string[]): void {
  lua.lua_pushcfunction(L, (S: LuaState) => {
    const n = lua.lua_gettop(S), parts: string[] = [];
    for (let i = 1; i <= n; i++) { parts.push(lua.lua_tojsstring(S, lauxlib.luaL_tolstring(S, i) && -1)); lua.lua_pop(S, 1); }
    out.push(parts.join("\t"));
    return 0;
  });
  lua.lua_setglobal(L, L$("print"));
}

/** "macro:3: boom" -> "Ligne 3 : boom"; other messages are kept. */
export function formatError(msg: string): string {
  const m = /^macro:(\d+): ([\s\S]*)$/.exec(msg);
  return m ? `Ligne ${m[1]} : ${m[2]}` : msg;
}

/** Run Lua `code` against `host`. Never throws. */
export function runMacro(code: string, host: MacroHost, opts: RunOptions = {}): RunResult {
  const max = opts.maxSteps ?? 10_000_000;
  const output: string[] = [];
  const L = lauxlib.luaL_newstate();
  openSandbox(L);
  bindPrint(L, output);
  bindSheet(L, host);
  let steps = 0;
  lua.lua_sethook(L, (S: LuaState) => {
    steps += HOOK_EVERY;
    if (steps > max) lauxlib.luaL_error(S, L$(LIMIT_MSG));
  }, lua.LUA_MASKCOUNT, HOOK_EVERY);
  let status = lauxlib.luaL_loadbufferx(L, L$(code), null, L$("=macro"), L$("t"));
  if (status === lua.LUA_OK) status = lua.lua_pcall(L, 0, 0, 0);
  if (status === lua.LUA_OK) return { ok: true, output };
  const raw = lua.lua_type(L, -1) === lua.LUA_TSTRING ? lua.lua_tojsstring(L, -1) : "erreur";
  return { ok: false, output, error: formatError(raw) };
}
