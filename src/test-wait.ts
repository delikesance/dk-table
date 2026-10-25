/**
 * Attente conditionnelle des tests d'interface (`vi.waitFor` avec un plafond adapté à une machine chargée).
 * Pourquoi : le défaut de vitest (1 s) échoue quand l'import à la demande de CodeMirror/Lua dure plus
 *        longtemps (Windows, plusieurs vitest en parallèle); une attente de condition ne coûte rien si elle arrive vite.
 * Usage : `await waitFor(() => expect(app.docEditor()).toBeDefined())`.
 */
import { vi } from "vitest";

/** Réessaie `fn` toutes les 10 ms jusqu'à 20 s. */
export const waitFor = <T>(fn: () => T | Promise<T>): Promise<T> => vi.waitFor(fn, { timeout: 20_000, interval: 10 }) as Promise<T>;
