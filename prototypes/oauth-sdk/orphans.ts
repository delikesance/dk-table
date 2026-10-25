/**
 * Nettoyage sur des worktrees orphelins d'un run interrompu.
 *
 * Quoi : `sweepWorktrees({ run, cwd, dev, keep })` examine les worktrees `.claude/worktrees/*` sur des branches `wt/*`
 *        (ou detaches de reference) qui ne sont pas dans `keep` (cartes a reprendre) :
 *        sale -> commit `WIP` sur sa branche puis retrait du dossier (`archived`); propre -> retrait (`removed`);
 *        commit impossible -> rien n'est supprime (`left`). Les worktrees retenus restent (`kept`).
 * Pourquoi : un crash laisse des dossiers de plusieurs centaines de Mo; le travail non fusionne ne doit jamais etre perdu.
 * Securite : aucune branche n'est supprimee; un worktree n'est retire qu'apres commit reussi de son contenu; tout ce qui
 *        n'est pas `wt/*` sous `.claude/worktrees/` est ignore.
 * Usage : `await sweepWorktrees({ run, cwd, dev: "developpement", keep: new Set(dirs) })`.
 */
import type { Run } from "./git";

/** Action sur un worktree. */
export type SweepAction = "kept" | "archived" | "removed" | "left";
/** Resultat par worktree. */
export interface Swept { dir: string; branch: string; action: SweepAction }

/** Options du nettoyage. */
export interface SweepOpts { run: Run; cwd: string; dev: string; keep: ReadonlySet<string> }

const norm = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "");

/** Examine les worktrees de la boucle et traite ceux qui ne sont pas retenus. */
export async function sweepWorktrees({ run, cwd, keep }: SweepOpts): Promise<Swept[]> {
  const git = (args: string[], at = cwd) => run("git", args, at);
  const list = await git(["worktree", "list", "--porcelain"]);
  if (list.code !== 0) return [];
  const kept = new Set([...keep].map(norm));
  const root = norm(cwd) + "/.claude/worktrees/";
  const out: Swept[] = [];
  for (const block of list.out.split(/\r?\n\r?\n/)) {
    const dir = /^worktree (.+)$/m.exec(block)?.[1].trim();
    const branch = /^branch refs\/heads\/(.+)$/m.exec(block)?.[1].trim() ?? "";
    if (!dir || !norm(dir).startsWith(root)) continue;
    const detached = /^detached$/m.test(block);
    if (!branch.startsWith("wt/") && !detached) continue;
    if (kept.has(norm(dir))) { out.push({ dir, branch, action: "kept" }); continue; }
    const st = await git(["status", "--porcelain"], dir);
    let action: SweepAction = "removed";
    if (st.out.trim() !== "") {
      if (detached) { out.push({ dir, branch, action: "left" }); continue; } // sans branche, pas d'archive recuperable
      await git(["add", "-A"], dir);
      const c = await git(["commit", "-m", "Boucle: WIP recupere (worktree orphelin d'un run interrompu)"], dir);
      if (c.code !== 0) { out.push({ dir, branch, action: "left" }); continue; }
      action = "archived";
    }
    const rm = await git(["worktree", "remove", "--force", dir]);
    out.push({ dir, branch, action: rm.code === 0 ? action : "left" });
  }
  return out;
}
