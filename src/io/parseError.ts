/** Error thrown by the `.dktable` parser (shared by `format.ts` and its validators). */
export class DktParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DktParseError";
  }
}

/** True for plain (non-array, non-null) objects. */
export function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
