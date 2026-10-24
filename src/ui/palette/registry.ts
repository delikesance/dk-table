/** Command registry shared by the command palette. */

/** A command runnable from the palette. */
export interface Command {
  id: string;
  label: string;
  keywords?: string[];
  /** Display-only shortcut, e.g. "Ctrl+B". */
  shortcut?: string;
  run: () => void;
}

/** Registry of commands plus most-recently-used tracking. */
export interface Registry {
  /** Adds (or replaces by id) a command; returns an unregister function. */
  register(cmd: Command): () => void;
  /** Commands in registration order. */
  list(): Command[];
  /** Marks a command as just used (moves it to the front of recents). */
  markUsed(id: string): void;
  /** 0 = most recent, -1 = never used. */
  recentRank(id: string): number;
}

const MAX_RECENT = 20;

/** Creates an isolated registry (used by tests; the app uses `defaultRegistry`). */
export function createRegistry(): Registry {
  const cmds = new Map<string, Command>();
  let recent: string[] = [];
  return {
    register(cmd) {
      cmds.set(cmd.id, cmd);
      return () => {
        if (cmds.get(cmd.id) === cmd) cmds.delete(cmd.id);
      };
    },
    list: () => [...cmds.values()],
    markUsed(id) {
      recent = [id, ...recent.filter((r) => r !== id)].slice(0, MAX_RECENT);
    },
    recentRank: (id) => recent.indexOf(id),
  };
}

/** Application-wide registry. */
export const defaultRegistry: Registry = createRegistry();

/** Registers a command on the default registry; returns an unregister function. */
export function registerCommand(cmd: Command): () => void {
  return defaultRegistry.register(cmd);
}
