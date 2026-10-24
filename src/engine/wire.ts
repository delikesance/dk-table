/**
 * Wires the fn-*.ts modules into the function registry (side-effect import,
 * loaded by sheet.ts). Kept apart from functions.ts to avoid an import cycle:
 * the modules import helpers (collectNums, types) from functions.ts.
 * IFS/SWITCH are lazy special forms (lazy.ts, called by the evaluator), not registered here.
 */
import { registerBuiltin, registerFunction } from "./functions";
import { mathFunctions } from "./fn-math";
import { math2Functions } from "./fn-math2";
import { statsFunctions } from "./fn-stats";
import { textFunctions } from "./fn-text";
import { text2Functions } from "./fn-text2";
import { logicFunctions } from "./fn-logic";
import { infoFunctions } from "./fn-info";
import { condFunctions } from "./fn-cond";
import { cond2Functions } from "./fn-cond2";
import { lookupFunctions } from "./fn-lookup";
import { dateFunctions } from "./fn-date";
import { date2Functions } from "./fn-date2";
import { financeFunctions } from "./fn-finance";
import { amortFunctions } from "./fn-amort";
import { acctFunctions } from "./fn-acct";
import { subtotalFunctions } from "./fn-subtotal";

for (const table of [mathFunctions, math2Functions, statsFunctions, textFunctions, text2Functions,
  logicFunctions, infoFunctions, date2Functions, amortFunctions, acctFunctions, subtotalFunctions])
  for (const [n, f] of Object.entries(table)) registerBuiltin(n, f);
// Matrix-aware groups: ranges arrive as Value[][] (rows).
for (const table of [condFunctions, cond2Functions, lookupFunctions])
  for (const [n, f] of Object.entries(table)) registerBuiltin(n, f, { matrix: true });
for (const table of [dateFunctions, financeFunctions])
  for (const [n, f] of Object.entries(table)) registerFunction(n, f);
