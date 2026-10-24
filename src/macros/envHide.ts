/**
 * Import BEFORE `fengari`: Vite's dev client defines a fake `globalThis.process = { env: {} }`, which makes
 * fengari take its Node-only branches (`require("os")`, `process.versions`...) and crash in the browser.
 * The shim is hidden while fengari loads and put back by `envRestore.ts` (import AFTER `fengari`).
 * Production builds and Node (tests) have no such shim: both modules are then no-ops.
 */
const g = globalThis as { process?: { versions?: unknown } };

/** The hidden Vite shim, if any. */
export const hidden: { versions?: unknown } | undefined = g.process && !g.process.versions ? g.process : undefined;
if (hidden) delete g.process;
