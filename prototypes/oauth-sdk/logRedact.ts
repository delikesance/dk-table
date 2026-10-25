/**
 * Nettoyage des logs techniques: secrets masques, codes ANSI retires, texte tronque.
 *
 * Quoi : `createRedactor(env)` -> `red(texte)` / `red.deep(valeur)`; masque les valeurs des variables
 *        d'environnement sensibles (TOKEN, KEY, SECRET, PASSWORD, CREDENTIAL, OAUTH; >= 6 car.) et des motifs
 *        connus (sk-ant-, sk-, ghp_, github_pat_, Bearer, JWT, NOM_SENSIBLE=valeur). `stripAnsi`, `clip`.
 * Pourquoi : un journal detaille ne doit jamais fuiter le jeton OAuth ni une variable d'environnement.
 * Usage : `const red = createRedactor(process.env); red("sk-ant-...") === "[masqué]"`.
 */
const MASK = "[masqué]";
const SENSITIVE = /TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|OAUTH/i;
const PATTERNS: RegExp[] = [
  /sk-ant-[\w-]{8,}/g, /\bsk-[A-Za-z0-9]{20,}/g, /\bgh[pousr]_[A-Za-z0-9]{20,}/g, /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, /Bearer\s+[\w.~+/-]{8,}=*/g,
];
const ASSIGN = /\b([A-Z0-9_]*(?:TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL|OAUTH)[A-Z0-9_]*"?\s*[=:]\s*"?)[^\s",}]{4,}/g;
const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

/** Retire les sequences d'echappement ANSI (couleurs, curseur). */
export const stripAnsi = (t: string): string => t.replace(ANSI, "");

/** Coupe `t` a `max` caracteres: debut + fin, avec le nombre de caracteres omis. */
export function clip(t: string, max: number): string {
  if (t.length <= max) return t;
  const head = Math.ceil(max * 0.6), tail = max - head;
  return `${t.slice(0, head)}… [${t.length - max} car. omis] …${t.slice(t.length - tail)}`;
}

/** Fonction de masquage liee a un environnement (ses valeurs sensibles sont masquees telles quelles). */
export interface Redactor { (t: string): string; deep<T>(v: T): T }

/** Cree le masqueur; `env` n'est jamais conserve en clair au-dela des valeurs sensibles. */
export function createRedactor(env: Record<string, string | undefined> = {}): Redactor {
  const secrets = Object.entries(env).filter(([k, v]) => SENSITIVE.test(k) && (v ?? "").length >= 6).map(([, v]) => v as string)
    .sort((a, b) => b.length - a.length);
  const red = ((t: string): string => {
    let s = String(t);
    for (const v of secrets) s = s.split(v).join(MASK);
    for (const re of PATTERNS) s = s.replace(re, MASK);
    return s.replace(ASSIGN, `$1${MASK}`);
  }) as Redactor;
  red.deep = <T,>(v: T): T => {
    if (typeof v === "string") return red(v) as T;
    if (Array.isArray(v)) return v.map((x) => red.deep(x)) as T;
    if (v instanceof Error) return { name: v.name, message: red(v.message), stack: red(v.stack ?? "") } as T;
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, red.deep(x)])) as T;
    return v;
  };
  return red;
}
