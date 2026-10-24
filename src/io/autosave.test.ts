/** Tests de la logique d'enregistrement automatique (timers factices). */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAutosave, type AutosaveState } from './autosave';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Fabrique un autosave avec save espion et journal d'états. */
function setup(opts: { eligible?: () => boolean; save?: () => Promise<void> } = {}) {
  const save = vi.fn(opts.save ?? (() => Promise.resolve()));
  const states: AutosaveState[] = [];
  const a = createAutosave({
    save,
    isEligible: opts.eligible ?? (() => true),
    onState: (s) => states.push(s),
  });
  return { a, save, states };
}

describe('autosave', () => {
  it('écrit une seule fois après 1000 ms sans nouvelle frappe', async () => {
    const { a, save } = setup();
    a.touch();
    await vi.advanceTimersByTimeAsync(999);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('touch replanifie le délai', async () => {
    const { a, save } = setup();
    a.touch();
    await vi.advanceTimersByTimeAsync(800);
    a.touch();
    await vi.advanceTimersByTimeAsync(800);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('non éligible: aucune écriture', async () => {
    const { a, save, states } = setup({ eligible: () => false });
    a.touch();
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).not.toHaveBeenCalled();
    expect(a.state()).toBe('idle');
    expect(states).not.toContain('saving');
  });

  it('flush sauvegarde immédiatement si en attente', async () => {
    const { a, save } = setup();
    a.touch();
    await a.flush();
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('flush sans attente ne fait rien', async () => {
    const { a, save } = setup();
    await a.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it('cancel annule la sauvegarde en attente', async () => {
    const { a, save } = setup();
    a.touch();
    a.cancel();
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).not.toHaveBeenCalled();
    expect(a.state()).toBe('idle');
  });

  it("erreur de save -> état 'error' sans exception", async () => {
    const { a } = setup({ save: () => Promise.reject(new Error('disk')) });
    a.touch();
    await vi.advanceTimersByTimeAsync(1000);
    expect(a.state()).toBe('error');
  });

  it('touch pendant saving -> exactement 2 sauvegardes, jamais concurrentes', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let release!: () => void;
    const { a, save } = setup({
      save: () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return new Promise<void>((r) => {
          release = () => { inFlight--; r(); };
        });
      },
    });
    a.touch();
    await vi.advanceTimersByTimeAsync(1000);
    expect(a.state()).toBe('saving');
    a.touch();
    await vi.advanceTimersByTimeAsync(1500);
    expect(save).toHaveBeenCalledTimes(1);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);
    release();
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(2);
    expect(maxInFlight).toBe(1);
    expect(a.state()).toBe('saved');
  });

  it('transitions: idle -> pending -> saving -> saved', async () => {
    const { a, states } = setup();
    expect(a.state()).toBe('idle');
    a.touch();
    expect(a.state()).toBe('pending');
    await vi.advanceTimersByTimeAsync(1000);
    expect(states).toEqual(['pending', 'saving', 'saved']);
    expect(a.state()).toBe('saved');
  });
});
