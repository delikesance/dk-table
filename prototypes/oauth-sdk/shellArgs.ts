/**
 * Arguments d'une commande lancee avec `shell: true` (Windows : cmd.exe).
 * Pourquoi : Node ne protege pas les arguments; `git commit -m "Boucle: design"` arrivait en
 *        `-m Boucle: design`, git echouait (pathspec) et le travail du worktree etait perdu.
 * Usage : `spawn(cmd, shellArgs(args), { shell: process.platform === "win32" })`.
 */
const SPECIAL = /[\s"&|<>^()%!]/;

/** Entoure d'un seul argument (guillemets echappes, `%` double) ceux qu'un cmd.exe couperait ou interpreterait. */
export function shellArgs(args: string[], platform: string = process.platform): string[] {
  if (platform !== "win32") return args;
  return args.map((a) => (a !== "" && !SPECIAL.test(a) ? a : `"${a.replace(/"/g, '\\"').replace(/%/g, "%%")}"`));
}
