/** Sidebar docs: loan and investment functions (fn-loan.ts, fn-invest.ts). */
import type { FnDoc } from "./sidebar/sidebar";

/** Loan / investment function docs (French, Excel argument order). */
export const FN_DOCS_FINANCE: FnDoc[] = [
  { name: "IPMT", signature: "IPMT(taux; pér; nper; va; vc; type)", description: "Part d'intérêts du remboursement de la période pér" },
  { name: "PPMT", signature: "PPMT(taux; pér; nper; va; vc; type)", description: "Part de capital du remboursement de la période pér" },
  { name: "PV", signature: "PV(taux; nper; vpm; vc; type)", description: "Valeur actuelle d'une suite de paiements" },
  { name: "FV", signature: "FV(taux; nper; vpm; va; type)", description: "Valeur future d'un placement" },
  { name: "RATE", signature: "RATE(nper; vpm; va; vc; type; estimation)", description: "Taux par période d'un prêt ou placement" },
  { name: "NPER", signature: "NPER(taux; vpm; va; vc; type)", description: "Nombre de périodes de remboursement" },
  { name: "CUMIPMT", signature: "CUMIPMT(taux; nper; va; début; fin; type)", description: "Intérêts cumulés entre deux périodes" },
  { name: "CUMPRINC", signature: "CUMPRINC(taux; nper; va; début; fin; type)", description: "Capital remboursé cumulé entre deux périodes" },
  { name: "MIRR", signature: "MIRR(A1:A5; taux_emprunt; taux_placement)", description: "Taux de rendement interne modifié" },
  { name: "XNPV", signature: "XNPV(taux; A1:A5; B1:B5)", description: "Valeur actuelle nette de flux datés" },
  { name: "XIRR", signature: "XIRR(A1:A5; B1:B5; estimation)", description: "Taux de rendement interne de flux datés" },
];
