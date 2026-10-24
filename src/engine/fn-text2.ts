/**
 * More text builtins: CONCATENATE, TEXTJOIN, PROPER, EXACT, SUBSTITUTE, REPLACE, FIND,
 * SEARCH (wildcards * ? ~), REPT, VALUE, CHAR, CODE. Errors propagate; bad positions/counts
 * give #VALUE!. Registered by wire.ts with `registerBuiltin`.
 */
import type { Arg, Builtin } from "./functions";
import { err, isErr, type Value } from "./types";
import { toBool, toNum, toText } from "./values";
import { cells, numArg, scalarOf, textArg } from "./fn-args";
import { wildcardSource } from "./fn-cond";

/** Read text/number args by spec ("t" text, "n" number, "t?" / "n?" optional with default) then call `f`. */
function sig(spec: string[], defs: Record<number, string | number>, f: (...a: (string | number)[]) => Value): Builtin {
  return (args) => {
    if (args.length > spec.length) return err("#VALUE!");
    const xs: (string | number)[] = [];
    for (let i = 0; i < spec.length; i++) {
      const d = defs[i];
      const v = spec[i] === "t" ? textArg(args, i, d as string | undefined) : numArg(args, i, d as number | undefined);
      if (typeof v !== "string" && typeof v !== "number") return v;
      xs.push(v);
    }
    return f(...xs);
  };
}

/** Concatenate every cell of every arg (CONCATENATE). */
const concatenate: Builtin = (args) => {
  let s = "";
  for (const v of args.flatMap(cells)) {
    if (isErr(v)) return v;
    s += toText(v);
  }
  return s;
};

/** TEXTJOIN(delimiter; ignore_empty; text1; ...): join with delimiter, optionally skipping "". */
const textjoin: Builtin = (args: Arg[]) => {
  if (args.length < 3) return err("#VALUE!");
  const d = textArg(args, 0);
  if (typeof d !== "string") return d;
  const ignore = toBool(scalarOf(args[1]) ?? "");
  if (typeof ignore !== "boolean") return ignore;
  const parts: string[] = [];
  for (const v of args.slice(2).flatMap(cells)) {
    if (isErr(v)) return v;
    const t = toText(v);
    if (!(ignore && t === "")) parts.push(t);
  }
  return parts.join(d);
};

/** 1-based position of `find` in `s` from `start` using `re` or plain indexOf; #VALUE! when absent. */
function locate(find: string, s: string, start: number, wildcard: boolean): Value {
  const from = Math.trunc(start);
  if (from < 1 || from > s.length + 1) return err("#VALUE!");
  const tail = s.slice(from - 1);
  const i = wildcard ? tail.search(new RegExp(wildcardSource(find), "i")) : tail.indexOf(find);
  return i < 0 ? err("#VALUE!") : i + from;
}

/** VALUE(text): number from text; accepts decimal comma and a trailing %. */
const value: Builtin = (args) => {
  if (args.length !== 1) return err("#VALUE!");
  const v = scalarOf(args[0]) as Value;
  if (typeof v === "number" || isErr(v)) return v;
  let t = toText(v).trim();
  const pct = t.endsWith("%");
  if (pct) t = t.slice(0, -1).trim();
  if (/^[-+]?\d+,\d+$/.test(t)) t = t.replace(",", ".");
  if (t === "") return err("#VALUE!");
  const n = toNum(t);
  return isErr(n) ? n : pct ? n / 100 : n;
};

/** Text builtins keyed by upper-case name. */
export const text2Functions: Record<string, Builtin> = {
  CONCATENATE: concatenate,
  TEXTJOIN: textjoin,
  PROPER: sig(["t"], {}, (s) =>
    String(s).toLowerCase().replace(/(^|[^\p{L}])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())),
  EXACT: sig(["t", "t"], {}, (a, b) => a === b),
  SUBSTITUTE: (args) => {
    if (args.length === 4) {
      const n = numArg(args, 3);
      if (typeof n !== "number") return n;
      if (n < 1) return err("#VALUE!");
      return sig(["t", "t", "t"], {}, (s, o, r) => {
        const [t, old] = [String(s), String(o)];
        let i = -1;
        for (let k = 0; k < Math.trunc(n); k++) if ((i = t.indexOf(old, i + 1)) < 0 || old === "") return t;
        return t.slice(0, i) + r + t.slice(i + old.length);
      })(args.slice(0, 3));
    }
    return sig(["t", "t", "t"], {}, (s, o, r) => (o === "" ? s : String(s).split(String(o)).join(String(r))))(args);
  },
  REPLACE: sig(["t", "n", "n", "t"], {}, (s, st, n, r) => {
    const [a, b] = [Math.trunc(st as number), Math.trunc(n as number)];
    if (a < 1 || b < 0) return err("#VALUE!");
    return String(s).slice(0, a - 1) + r + String(s).slice(a - 1 + b);
  }),
  FIND: sig(["t", "t", "n"], { 2: 1 }, (f, s, st) => locate(String(f), String(s), st as number, false)),
  SEARCH: sig(["t", "t", "n"], { 2: 1 }, (f, s, st) => locate(String(f), String(s), st as number, true)),
  REPT: sig(["t", "n"], {}, (s, n) => ((n as number) < 0 ? err("#VALUE!") : String(s).repeat(Math.trunc(n as number)))),
  VALUE: value,
  CHAR: sig(["n"], {}, (n) => {
    const c = Math.trunc(n as number);
    return c < 1 || c > 255 ? err("#VALUE!") : String.fromCharCode(c);
  }),
  CODE: sig(["t"], {}, (s) => (s === "" ? err("#VALUE!") : String(s).charCodeAt(0))),
};
