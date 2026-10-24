/** Import AFTER `fengari`: puts back the dev `process` shim hidden by `envHide.ts`. */
import { hidden } from "./envHide";

if (hidden) (globalThis as { process?: unknown }).process = hidden;
