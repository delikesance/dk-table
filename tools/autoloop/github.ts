/**
 * Accès GitHub injectable: `GhClient` (liste/création d'issues), implémentation
 * réelle via la CLI `gh` (execFile, jamais de shell) et `FakeGhClient` pour les tests.
 * La création n'est appelée qu'en mode live (voir cycle.ts).
 */

/** Issue GitHub simplifiée. */
export interface Issue {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
}

/** Client GitHub minimal. */
export interface GhClient {
  /** Issues ouvertes ET fermées correspondant à la recherche GitHub. */
  listIssues(search: string): Promise<Issue[]>;
  /** Crée une issue, renvoie son numéro. */
  createIssue(title: string, body: string, labels: string[]): Promise<number>;
}

/** Exécute un binaire sans shell et renvoie stdout. */
export type ExecFn = (file: string, args: string[]) => Promise<string>;

/** Exécuteur par défaut: `child_process.execFile` (chargé à la demande). */
export const defaultExec: ExecFn = async (file, args) => {
  const { execFile } = await import("node:child_process");
  return new Promise((resolve, reject) =>
    execFile(file, args, { maxBuffer: 16 * 1024 * 1024 }, (err, stdout) => (err ? reject(err) : resolve(String(stdout)))),
  );
};

/** Client réel basé sur `gh`. */
export class RealGhClient implements GhClient {
  constructor(private readonly exec: ExecFn = defaultExec) {}

  async listIssues(search: string): Promise<Issue[]> {
    const out = await this.exec("gh", [
      "issue", "list", "--search", search, "--state", "all",
      "--json", "number,title,body,state,labels", "--limit", "200",
    ]);
    const raw = JSON.parse(out) as { number: number; title: string; body: string; state: string; labels: { name: string }[] }[];
    return raw.map((i) => ({
      number: i.number, title: i.title, body: i.body ?? "",
      state: i.state.toLowerCase() === "closed" ? "closed" : "open", labels: i.labels.map((l) => l.name),
    }));
  }

  async createIssue(title: string, body: string, labels: string[]): Promise<number> {
    const args = ["issue", "create", "--title", title, "--body", body];
    for (const l of labels) args.push("--label", l);
    const out = await this.exec("gh", args);
    const m = /\/issues\/(\d+)/.exec(out);
    if (!m) throw new Error("gh issue create: numéro introuvable");
    return Number(m[1]);
  }
}

/** Client factice en mémoire; `created` liste les issues créées. */
export class FakeGhClient implements GhClient {
  readonly created: { title: string; body: string; labels: string[] }[] = [];

  constructor(private readonly issues: Issue[] = []) {}

  async listIssues(search: string): Promise<Issue[]> {
    const m = /label:(\S+)/.exec(search);
    return this.issues.filter((i) => !m || i.labels.includes(m[1]));
  }

  async createIssue(title: string, body: string, labels: string[]): Promise<number> {
    this.created.push({ title, body, labels });
    const n = Math.max(0, ...this.issues.map((i) => i.number)) + 1;
    this.issues.push({ number: n, title, body, state: "open", labels });
    return n;
  }
}
