/**
 * Diagnostic de run: resume texte des anomalies et de leur cause probable, a coller dans le chat.
 *
 * Quoi : `diagnose(entrees)` -> markdown court (< 6000 car.): duree, cout total/par modele, anomalies (warn/error) avec
 *        composant, carte, cause probable (motifs connus), retours en arriere de cartes.
 * Pourquoi : identifier un probleme sans relire le journal; aucun secret (les lignes sont deja masquees par logger.ts).
 * Usage : `diagnose(await readRun(dir, run))`.
 */
import type { LogEntry } from "./logRead";

/** Motifs -> cause probable (premier qui correspond). */
const CAUSES: [RegExp, string][] = [
  [/introduit par la branche/i, "régression introduite par la carte (ses tests ou ceux d'un autre fichier sont rouges)"],
  [/lie aux fichiers modifies/i, "test déjà rouge sur la base mais lié aux fichiers de la carte : à corriger avant fusion"],
  [/timed out|timeout|etimedout/i, "machine chargée ou lente (timeouts) : réduire BOUCLE_PARALLEL ou lancer moins de suites en même temps"],
  [/conflict|conflit/i, "conflit de fusion entre cartes touchant les mêmes fichiers"],
  [/npm ci/i, "installation des dépendances impossible (réseau, verrou, disque)"],
  [/ENOENT|not found|introuvable/i, "commande introuvable ou fichier absent (PATH, installation)"],
  [/EACCES|EPERM|permission/i, "permissions insuffisantes sur un fichier ou dossier"],
  [/budget|plafond|exhausted/i, "budget épuisé ou insuffisant pour l'appel"],
  [/arbre fusionn/i, "l'état fusionné n'est pas celui qui a été testé (développement a bougé) : fusion annulée"],
  [/tsc|TS\d{4}/i, "erreur de typage introduite par la carte"],
];
const cause = (e: LogEntry): string => {
  const text = [e.msg, e.reason, (e.err as { message?: string } | undefined)?.message, e.out].filter(Boolean).join(" ");
  return CAUSES.find(([re]) => re.test(text))?.[1] ?? "cause à chercher dans le journal (voir /logs)";
};
const eur = (n: number) => n.toFixed(2).replace(".", ",");
const short = (s: unknown, n = 160) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);

/** Texte de diagnostic d'un run. */
export function diagnose(es: LogEntry[]): string {
  const run = es[0]?.run ?? "?", dur = Math.round(Math.max(0, ...es.map((e) => e.ms)) / 1000);
  const byModel = new Map<string, number>();
  for (const e of es) if (typeof e.costUsd === "number") byModel.set(String(e.model ?? "?"), (byModel.get(String(e.model ?? "?")) ?? 0) + e.costUsd);
  const total = [...byModel.values()].reduce((a, b) => a + b, 0);
  const sum = (k: string) => es.filter((e) => e.msg === "resultat").reduce((n, e) => n + (typeof e[k] === "number" ? (e[k] as number) : 0), 0);
  const locks = es.filter((e) => e.comp === "verrou");
  const lockWait = new Map<string, number>();
  for (const e of locks) lockWait.set(String(e.lock), (lockWait.get(String(e.lock)) ?? 0) + (typeof e.waitMs === "number" ? e.waitMs : 0));
  const bad = es.filter((e) => e.level === "warn" || e.level === "error");
  const back = es.filter((e) => e.msg === "transition" && e.from === "termine" && e.to !== "termine");
  const out = [`# Diagnostic du run ${run}`, "", `- Durée : ${dur} s · lignes : ${es.length} · erreurs : ${es.filter((e) => e.level === "error").length} · avertissements : ${es.filter((e) => e.level === "warn").length}`,
    `- Coût (USD, estimé) : ${eur(total)}${[...byModel].map(([m, c]) => ` · ${m} ${eur(c)}`).join("")}`,
    `- Tokens : entrée ${sum("inTokens")} · sortie ${sum("outTokens")} · cache lu ${sum("cacheRead")} · cache créé ${sum("cacheCreation")} · contexte injecté ~${Math.ceil(sum("ctxChars") / 4)} (approx.)`,
    `- Attente de verrous (s) :${lockWait.size ? [...lockWait].map(([n, ms]) => ` ${n} ${(ms / 1000).toFixed(1)}`).join(" ·") : " aucune mesure"}`, ""];
  if (!bad.length && !back.length) out.push("Aucune anomalie.");
  else {
    out.push(`## Anomalies (${bad.length})`);
    for (const e of bad.slice(0, 15)) {
      out.push(`${bad.indexOf(e) + 1}. [${e.level}] ${e.comp}${e.card || e.agent ? ` · ${e.card ?? e.agent}` : ""} · ${short(e.msg, 100)}${e.reason ? ` — ${short(e.reason)}` : ""}`,
        `   cause probable : ${cause(e)}${e.ts ? ` (${String(e.ts).slice(11, 19)})` : ""}`);
    }
    if (bad.length > 15) out.push(`… et ${bad.length - 15} autres (voir /logs?level=warn).`);
    if (back.length) {
      out.push("", "## Cartes revenues en arrière");
      for (const e of back.slice(0, 10)) out.push(`- ${e.card} : ${e.from} → ${e.to}${e.cause ? ` (${short(e.cause, 100)})` : ""}`);
    }
  }
  return out.join("\n");
}
