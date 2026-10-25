/**
 * Prouveur de cartes : reecrit rapports et TODO.md dans l'arbre principal apres une fusion verte.
 *
 * Quoi : `createProver({ cwd, cards })` -> `(proof) => Promise<string[]>` (ids dont le rapport a ete ecrit), a passer a
 *        `flow.mergeIfGreen(..., { prove })`. Pour chaque carte : lit `docs/rapports/<id>.md` (absent -> ignoree, le
 *        reconciliateur signale « rapport manquant »), applique les preuves reelles (proveReport.ts), coche TODO.md si termine.
 * Pourquoi : seul le code ecrit Statut/Preuves/case TODO; un seul ecrivain, sous le verrou de fusion, donc plus de conflit.
 * Usage : `createProver({ cwd, cards: [{ id, title }] })`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Proof } from "./card";
import { applyProof, tickTodo } from "./proveReport";

/** Entrees du prouveur (fichiers injectables pour les tests). */
export interface ProverOpts {
  cwd: string;
  cards: { id: string; title: string }[];
  read?: (path: string) => string | null;
  write?: (path: string, text: string) => void;
  exists?: (path: string) => boolean;
}

/** Construit le prouveur d'un lot de cartes. */
export function createProver(o: ProverOpts): (proof: Proof) => Promise<string[]> {
  const read = o.read ?? ((p) => { try { return readFileSync(p, "utf-8"); } catch { return null; } });
  const write = o.write ?? ((p, t) => writeFileSync(p, t));
  const exists = o.exists ?? existsSync;
  return async (proof) => {
    const done: string[] = [];
    let todo = read(join(o.cwd, "TODO.md"));
    const todoBefore = todo;
    for (const c of o.cards) {
      const path = join(o.cwd, "docs", "rapports", `${c.id}.md`);
      const md = read(path);
      if (!md) continue;
      const r = applyProof(md, proof, (p) => exists(join(o.cwd, p)));
      write(path, r.md);
      done.push(c.id);
      if (r.status === "termine" && todo !== null) todo = tickTodo(todo, c.title, c.id);
    }
    if (todo !== null && todo !== todoBefore) write(join(o.cwd, "TODO.md"), todo);
    return done;
  };
}
