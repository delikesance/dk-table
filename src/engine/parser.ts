/** Formula tokenizer and recursive-descent parser: text "=..." to AST, plus `collectRefs` for dependency wiring. */
import type { Node } from "./types";
import { normKey, parseKey } from "./address";

/** Token: kind + text. */
interface Tok {
  k: "num" | "str" | "id" | "op" | "end" | "sheet";
  v: string;
}

/** Split a formula body into tokens; throws on illegal characters. */
function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
    if (num) { out.push({ k: "num", v: num[0] }); i += num[0].length; continue; }
    if (c === '"') {
      let s = "";
      i++;
      for (;;) {
        if (i >= src.length) throw new Error("unterminated string");
        if (src[i] === '"') {
          if (src[i + 1] === '"') { s += '"'; i += 2; continue; }
          i++;
          break;
        }
        s += src[i++];
      }
      out.push({ k: "str", v: s });
      continue;
    }
    const sh = sheetPrefix(src, i);
    if (sh) { out.push({ k: "sheet", v: sh.name }); i = sh.end; continue; }
    // Absolute/mixed ref ($A$1, $A1, A$1): the "$" only marks absolute parts, it is dropped here.
    const abs = /^\$?[A-Za-z]{1,3}\$?\d+(?![A-Za-z0-9_.$])/.exec(src.slice(i));
    if (abs && abs[0].includes("$")) { out.push({ k: "id", v: abs[0].replace(/\$/g, "") }); i += abs[0].length; continue; }
    const id = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i));
    if (id) { out.push({ k: "id", v: id[0] }); i += id[0].length; continue; }
    const op = /^(<>|<=|>=|[-+*/^%&=<>(),:;])/.exec(src.slice(i));
    if (!op) throw new Error("bad char " + c);
    out.push({ k: "op", v: op[0] });
    i += op[0].length;
  }
  out.push({ k: "end", v: "" });
  return out;
}

/**
 * Sheet qualifier at `i`: `Name!` (letters incl. accents, digits, _ .) or `'Any name'!`
 * ('' escapes a quote). Returns the name and the index after "!", or null if none.
 */
function sheetPrefix(src: string, i: number): { name: string; end: number } | null {
  if (src[i] === "'") {
    let name = "";
    for (let j = i + 1; j < src.length; j++) {
      if (src[j] !== "'") { name += src[j]; continue; }
      if (src[j + 1] === "'") { name += "'"; j++; continue; }
      if (src[j + 1] !== "!" || !name) break;
      return { name, end: j + 2 };
    }
    throw new Error("bad sheet name");
  }
  const m = /^([\p{L}_][\p{L}\p{N}_.]*)!/u.exec(src.slice(i));
  return m ? { name: m[1], end: i + m[0].length } : null;
}

/** Recursive-descent parser over the token list. */
class Parser {
  private p = 0;
  constructor(private t: Tok[]) {}
  private peek = () => this.t[this.p];
  private isOp = (...v: string[]) => this.peek().k === "op" && v.includes(this.peek().v);
  private eat(v: string) {
    if (!this.isOp(v)) throw new Error("expected " + v);
    this.p++;
  }

  /** Parse a complete expression and require end of input. */
  parseAll(): Node {
    const n = this.cmp();
    if (this.peek().k !== "end") throw new Error("trailing input");
    return n;
  }

  private bin(next: () => Node, ops: string[]): Node {
    let l = next();
    while (this.isOp(...ops)) {
      const op = this.t[this.p++].v;
      l = { t: "bin", op, l, r: next() };
    }
    return l;
  }
  private cmp = (): Node => this.bin(() => this.cat(), ["=", "<>", "<", ">", "<=", ">="]);
  private cat = (): Node => this.bin(() => this.add(), ["&"]);
  private add = (): Node => this.bin(() => this.mul(), ["+", "-"]);
  private mul = (): Node => this.bin(() => this.pow(), ["*", "/"]);
  private pow = (): Node => this.bin(() => this.unary(), ["^"]);

  private unary(): Node {
    if (this.isOp("-")) { this.p++; return { t: "neg", e: this.unary() }; }
    if (this.isOp("+")) { this.p++; return this.unary(); }
    let n = this.primary();
    while (this.isOp("%")) { this.p++; n = { t: "pct", e: n }; }
    return n;
  }

  private primary(): Node {
    const tk = this.t[this.p++];
    if (tk.k === "num") return { t: "num", v: Number(tk.v) };
    if (tk.k === "str") return { t: "str", v: tk.v };
    if (tk.k === "op" && tk.v === "(") {
      const n = this.cmp();
      this.eat(")");
      return n;
    }
    if (tk.k === "id") return this.ident(tk.v);
    if (tk.k === "sheet") return this.qualified(tk.v);
    throw new Error("unexpected token");
  }

  private ident(name: string): Node {
    if (this.isOp("(")) {
      this.p++;
      const args: Node[] = [];
      if (!this.isOp(")")) {
        args.push(this.cmp());
        while (this.isOp(",", ";")) { this.p++; args.push(this.cmp()); }
      }
      this.eat(")");
      return { t: "call", name: name.toUpperCase(), args };
    }
    const up = name.toUpperCase();
    if (up === "TRUE" || up === "FALSE") return { t: "bool", v: up === "TRUE" };
    if (!parseKey(up)) return { t: "err", code: "#NAME?" };
    if (this.isOp(":")) {
      this.p++;
      const e = this.t[this.p++];
      if (e.k !== "id" || !parseKey(e.v.toUpperCase())) throw new Error("bad range");
      return { t: "range", a: up, b: normKey(e.v) };
    }
    return { t: "ref", key: up };
  }

  /** After a `Sheet!` token: a cell (`xref`) or a range (`xrange`) of that sheet. */
  private qualified(sheet: string): Node {
    const cell = (): string => {
      const e = this.t[this.p++];
      if (e.k !== "id" || !parseKey(e.v)) throw new Error("bad sheet ref");
      return normKey(e.v);
    };
    const a = cell();
    if (!this.isOp(":")) return { t: "xref", sheet, key: a };
    this.p++;
    return { t: "xrange", sheet, a, b: cell() };
  }
}

/** Parse the text after "=" into an AST; throws Error on syntax errors. */
export function parseFormula(body: string): Node {
  return new Parser(tokenize(body)).parseAll();
}

/** Collect every ref/range node (local or sheet-qualified) in an AST (for dependency tracking). */
export function collectRefs(n: Node, out: Node[] = []): Node[] {
  if (n.t === "ref" || n.t === "range" || n.t === "xref" || n.t === "xrange") out.push(n);
  else if (n.t === "neg" || n.t === "pct") collectRefs(n.e, out);
  else if (n.t === "bin") { collectRefs(n.l, out); collectRefs(n.r, out); }
  else if (n.t === "call") n.args.forEach((a) => collectRefs(a, out));
  return out;
}
