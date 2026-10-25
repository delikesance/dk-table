/**
 * Dédoublonnage des findings: empreinte déterministe `fichier + symptôme normalisé`
 * stockée dans l'issue (`<!-- fp:abc123 -->`). Empreinte déjà vue (ouvertes, fermées,
 * `auto:rejected`) -> on saute. Cas flou (même fichier cité) -> question JSON à haiku.
 */
import type { AgentRunner } from "./agent";
import type { GhClient, Issue } from "./github";
import type { Finding } from "./roles/audit";

/** Normalise le symptôme: minuscules, nombres masqués, ponctuation et espaces réduits. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\d+/g, "#").replace(/[^a-z#\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Empreinte FNV-1a 32 bits (hex) de `fichier|symptôme normalisé`. */
export function fingerprint(file: string, symptom: string): string {
  const s = `${file.replace(/\\/g, "/").toLowerCase()}|${normalize(symptom)}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}

/** Marqueur HTML à placer dans le corps de l'issue. */
export const marker = (fp: string): string => `<!-- fp:${fp} -->`;

/** Empreintes présentes dans un texte. */
export function extractFps(text: string): string[] {
  return [...text.matchAll(/<!-- fp:([0-9a-f]+) -->/g)].map((m) => m[1]);
}

/** Résultat du dédoublonnage. */
export interface DedupeResult {
  fresh: Finding[];
  skipped: { finding: Finding; reason: string }[];
}

/** Demande à haiku si `f` double l'issue `c`. */
async function isDuplicate(runner: AgentRunner, f: Finding, c: Issue): Promise<boolean> {
  const r = await runner.run({
    role: "reviewer",
    model: "haiku",
    prompt:
      `Ce finding est-il un doublon de l'issue #${c.number} ? Réponds en JSON {"duplicate":bool,"of":number}.\n` +
      `Finding: ${f.file}: ${f.symptom}\nIssue: ${c.title}\n${c.body.slice(0, 500)}`,
    schema: { type: "object", properties: { duplicate: { type: "boolean" }, of: { type: "number" } }, required: ["duplicate"] },
  });
  return r.ok && (r.output as { duplicate?: boolean } | null)?.duplicate === true;
}

/** Filtre les findings déjà connus (exact par empreinte, flou par haiku). */
export async function dedupe(findings: Finding[], gh: GhClient, runner: AgentRunner): Promise<DedupeResult> {
  const known = [...(await gh.listIssues("label:auto:bug")), ...(await gh.listIssues("label:auto:rejected"))];
  const seen = new Set(known.flatMap((i) => extractFps(i.body)));
  const res: DedupeResult = { fresh: [], skipped: [] };
  for (const f of findings) {
    const fp = fingerprint(f.file, f.symptom);
    if (seen.has(fp)) {
      res.skipped.push({ finding: f, reason: "empreinte connue" });
      continue;
    }
    let dup: Issue | undefined;
    for (const c of known.filter((i) => `${i.title}\n${i.body}`.includes(f.file))) {
      if (await isDuplicate(runner, f, c)) { dup = c; break; }
    }
    if (dup) { res.skipped.push({ finding: f, reason: `doublon de #${dup.number}` }); continue; }
    seen.add(fp);
    res.fresh.push(f);
  }
  return res;
}
