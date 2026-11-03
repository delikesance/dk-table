/** Shared types for the `.dktable` document format. */
import type { CfRule } from "../engine/cf/types";
import type { ValRule } from "../engine/validation/types";
import type { Scenario } from "../engine/scenario";

/** One cell: only the raw user input is persisted (values are recomputed). */
export interface DocCell {
  raw: string;
}

/** Visual/format style of one cell; `format` is a number-format code (e.g. "0.00"). */
export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  fill?: string;
  /** Text color, `#rgb` or `#rrggbb`. */
  color?: string;
  format?: string;
  underline?: boolean;
  /** Wrap text inside the cell (row height stays fixed). */
  wrap?: boolean;
  /** Drawn cell edges (top/right/bottom/left). */
  borders?: Borders;
}

/** Per-cell border edges; absent/false = no border on that side. */
export interface Borders { t?: boolean; r?: boolean; b?: boolean; l?: boolean }

/** One sheet; `cells` keys are A1 refs ("B3"), only non-empty cells stored. */
export interface DocSheet {
  id: string;
  name: string;
  cols: number;
  rows: number;
  cells: Record<string, DocCell>;
  /** Optional per-cell styles (absent in older files). */
  styles?: Record<string, CellStyle>;
  /** Optional frozen panes: number of top rows / left columns kept visible (absent = none). */
  freeze?: { rows: number; cols: number };
  /** Optional custom column widths in px by column letters (`{A: 140}`); absent = default width. */
  colWidths?: Record<string, number>;
  /** Optional conditional formatting rules, by priority (absent = none). */
  cf?: CfRule[];
  /** Data-validation rules (checked on typing, paste, fill and import); absent = none. */
  validation?: ValRule[];
  /** Merged cell ranges ("B2:D3", top-left cell = anchor); absent = none. */
  merges?: string[];
  /** Saved views (filter, sort, group, hidden columns); absent = none. */
  views?: SheetView[];
}

/** One Lua macro stored with the document (see src/macros). */
export interface DocMacro {
  id: string;
  name: string;
  code: string;
}

/** Fonction nommée stockée avec le document (voir src/engine/userfnStore.ts). */
export interface DocFn {
  name: string;
  params: string[];
  body: string;
}

/** Document (dk doc) stored in the workbook; `md` is its Markdown text, sheets cited by id (see src/doc/md). */
export interface DocText {
  id: string;
  name: string;
  md: string;
}

/** One cell change of the history journal (`""` = empty); `t` = epoch ms of the save that recorded it. */
export interface HistoryEntry { t: number; sheet: string; key: string; from: string; to: string }
/** Named snapshot: raw cells of every sheet at one moment. */
export interface Snapshot { id: string; name: string; t: number; sheets: { id: string; name: string; cells: Record<string, string> }[] }
/** Local history stored in the file (see io/history.ts). */
export interface History { log: HistoryEntry[]; snaps: Snapshot[] }

/** Saved view of a sheet, database style (see io/views.ts). */
export interface SheetView {
  id: string;
  name: string;
  /** Filter: column letter -> accepted displayed values (absent column = no filter). */
  filter: Record<string, string[]>;
  /** Sort keys, in priority order. */
  sort: { col: string; desc: boolean }[];
  /** Column to group by (rows with the same value are kept together), if any. */
  group?: string;
  /** Hidden column letters. */
  hidden: string[];
}

/** Whole document persisted as JSON. */
export interface DktDoc {
  version: 1;
  sheets: DocSheet[];
  /** Id of the active sheet, if any. */
  active?: string;
  /** Lua macros of the workbook (optional, absent in older files). */
  macros?: DocMacro[];
  /** Fonctions nommées du classeur (optionnel, absent dans les anciens fichiers). */
  functions?: DocFn[];
  /** Gestionnaire de scénarios (jeux nommés de valeurs d'entrée) ; absent = aucun. */
  scenarios?: Scenario[];
  /** Mode décimal exact (arrondi 15 chiffres significatifs) ; absent = IEEE 754. */
  decimal?: boolean;
  /** Mode de calcul (manuel, itératif) ; absent = automatique (`io/calcFormat.ts`). */
  calc?: { manual: boolean; iterative: boolean; maxIter: number; maxChange: number };
  /** Rich-text documents of the workbook, shown as tabs after the sheets (optional). */
  docs?: DocText[];
  /** Journal par cellule + instantanés nommés (optionnel). */
  history?: History;
}

/** Current `.dktable` format version. */
export const FORMAT_VERSION = 1;
