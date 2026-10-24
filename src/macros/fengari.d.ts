/** Minimal typing for the untyped `fengari` package (Lua 5.3 VM in pure JS). */
declare module "fengari" {
  /** Lua state handle. */
  export type LuaState = object;
  export const lua: any;
  export const lauxlib: any;
  export const lualib: any;
  export function to_luastring(s: string): Uint8Array;
  export function to_jsstring(s: Uint8Array): string;
}
