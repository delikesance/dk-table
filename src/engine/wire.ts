/**
 * Wires the fn-*.ts modules into the function registry (side-effect import,
 * loaded by sheet.ts). Kept apart from functions.ts to avoid an import cycle:
 * the modules import helpers (collectNums, types) from functions.ts.
 */
import { registerBuiltin, registerFunction } from "./functions";
import { mathFunctions } from "./fn-math";
import { textFunctions } from "./fn-text";
import { logicFunctions } from "./fn-logic";
import { condFunctions } from "./fn-cond";
import { lookupFunctions } from "./fn-lookup";
import { dateFunctions } from "./fn-date";
import { financeFunctions } from "./fn-finance";

for (const table of [mathFunctions, textFunctions, logicFunctions])
  for (const [n, f] of Object.entries(table)) registerBuiltin(n, f);
// Matrix-aware groups: ranges arrive as Value[][] (rows).
for (const table of [condFunctions, lookupFunctions])
  for (const [n, f] of Object.entries(table)) registerBuiltin(n, f, { matrix: true });
for (const table of [dateFunctions, financeFunctions])
  for (const [n, f] of Object.entries(table)) registerFunction(n, f);
