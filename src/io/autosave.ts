/**
 * Logique d'enregistrement automatique (pure, sans DOM ni Tauri).
 * Debounce après la dernière modification, une seule sauvegarde en vol,
 * nouvelle passe si une modification arrive pendant l'écriture.
 */

/** États observables de l'enregistrement automatique. */
export type AutosaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/** Options de `createAutosave`. */
export interface AutosaveOptions {
  /** Écrit le document (appelée uniquement si `isEligible()` est vrai). */
  save: () => Promise<void>;
  /** Délai de debounce en ms après la dernière `touch()` (défaut 1000). */
  delay?: number;
  /** Vrai si le document a un chemin et est modifié (dirty). */
  isEligible: () => boolean;
  /** Notifié à chaque changement d'état. */
  onState?: (state: AutosaveState) => void;
}

/** Contrôleur renvoyé par `createAutosave`. */
export interface Autosave {
  /** Signale une modification: (re)planifie la sauvegarde. */
  touch(): void;
  /** Sauvegarde tout de suite si une sauvegarde est en attente (ou en cours). */
  flush(): Promise<void>;
  /** Annule la sauvegarde planifiée (n'interrompt pas une écriture en cours). */
  cancel(): void;
  /** État courant. */
  state(): AutosaveState;
}

/**
 * Crée un contrôleur d'autosave. Les erreurs de `save` passent l'état à
 * 'error' sans exception non gérée; les timers sont ceux de l'environnement
 * (setTimeout global, donc substituables par des fake timers).
 */
export function createAutosave(opts: AutosaveOptions): Autosave {
  const delay = opts.delay ?? 1000;
  let current: AutosaveState = 'idle';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;
  let again = false;

  const set = (s: AutosaveState): void => {
    current = s;
    opts.onState?.(s);
  };
  const clear = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  /** Une passe d'écriture; enchaîne une passe si touch() pendant l'écriture. */
  async function run(): Promise<void> {
    clear();
    if (!opts.isEligible()) {
      if (current !== 'idle') set('idle');
      return;
    }
    set('saving');
    inFlight = (async () => {
      try {
        await opts.save();
        set('saved');
      } catch {
        set('error');
      }
    })();
    await inFlight;
    inFlight = null;
    if (again) {
      again = false;
      await run();
    }
  }

  return {
    touch() {
      if (inFlight) {
        again = true;
        return;
      }
      clear();
      set('pending');
      timer = setTimeout(() => void run(), delay);
    },
    async flush() {
      if (inFlight) return inFlight;
      if (timer !== null) await run();
    },
    cancel() {
      clear();
      again = false;
      if (current === 'pending') set('idle');
    },
    state: () => current,
  };
}
