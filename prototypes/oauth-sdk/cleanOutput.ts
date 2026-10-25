/**
 * Nettoyage de la sortie des commandes pour le journal de la boucle.
 *
 * Quoi : retire les codes ANSI (couleurs, curseur) et resume un echec de `npm test` : lignes FAIL/Error et bilan,
 *        au lieu des 500 derniers caracteres (qui ne montraient que le bruit de fin, jamais le test rouge).
 * Usage : `failureDigest(sortie)` -> texte brut de 1500 caracteres au plus.
 */

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[ -/]*[@-~]`, "g");

/** Retire les sequences d'echappement ANSI. */
export function stripAnsi(s: string): string {
  return s.replace(ANSI, "");
}

/** Lignes utiles d'un echec: test rouge, erreur, bilan; sinon la fin de la sortie. */
const KEY = /^\s*(FAIL|×|✗|✖|Error|AssertionError|TypeError|ReferenceError|Unhandled|Test Files|Tests\s|error TS)|\bfailed\b/;
const MAX = 1500;

/** Resume lisible d'une sortie en echec (sans ANSI, borne a 1500 caracteres). */
export function failureDigest(out: string): string {
  const lines = stripAnsi(out).split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim() !== "");
  const key = lines.filter((l) => KEY.test(l)).map((l) => l.replace(/^\s*FAIL\s+/, "FAIL  "));
  const text = (key.length ? key : lines.slice(-12)).join("\n");
  return text.length > MAX ? text.slice(0, MAX) : text;
}
