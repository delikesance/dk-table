/**
 * Masquage des secrets avant tout log: motifs `sk-ant-…` et valeur de
 * CLAUDE_CODE_OAUTH_TOKEN.
 */

/** Variables d'env dont la valeur est secrète. */
const SECRET_VARS = ["CLAUDE_CODE_OAUTH_TOKEN"];

/** Longueur minimale d'une valeur masquée (évite de masquer des fragments triviaux). */
const MIN_SECRET_LEN = 8;

/** Remplace les secrets de `text` par `[REDACTED]`. */
export function redact(text: string, env: Record<string, string | undefined> = {}): string {
  let out = text.replace(/sk-ant-[A-Za-z0-9_-]+/g, "[REDACTED]");
  for (const name of SECRET_VARS) {
    const v = env[name];
    if (v && v.length >= MIN_SECRET_LEN) out = out.split(v).join("[REDACTED]");
  }
  return out;
}
