/** Autocompletion catalogue for the Lua macro editor: sheet API, Lua globals, stdlib and keywords. */

/** One completion entry. `detail` is the signature, `ret` the return type shown on the right. */
export interface Doc {
  label: string;
  kind: "function" | "namespace" | "keyword" | "variable";
  detail: string;
  ret: string;
  info: string;
}

/** Parse compact "label|args|ret|info" lines into function docs. */
const fns = (lines: string[]): Doc[] => lines.map((l) => {
  const [label, args, ret, info] = l.split("|");
  return { label, kind: "function", detail: `${label}(${args})`, ret, info };
});

/** Members of each namespace table, by namespace name. */
export const DOCS: Record<string, Doc[]> = {
  sheet: fns([
    "getValue|ref|valeur|Valeur calculée d'une cellule (nombre, texte, booléen ; \"\" si vide).",
    "getDisplay|ref|string|Valeur affichée d'une cellule, erreurs comprises (#DIV/0!).",
    "getRaw|ref|string|Saisie brute d'une cellule, formule comprise (=SUM(A1:A3)).",
    "getRangeValues|range|table|Valeurs numériques d'une plage (\"A1:B5\"), ligne par ligne.",
    "setCell|ref, valeur|nil|Écrit une valeur ou une formule (\"=A1*2\") ; nil efface. Recalcule les dépendants.",
    "selection||string|Sélection courante (\"B2\" ou \"A1:C4\").",
    "select|ref|nil|Sélectionne une cellule.",
    "name||string|Nom de la feuille active.",
  ]),
  string: fns([
    "upper|s|string|Texte en majuscules.", "lower|s|string|Texte en minuscules.",
    "len|s|number|Longueur en octets.", "sub|s, i, j|string|Sous-chaîne de i à j.",
    "format|fmt, ...|string|Mise en forme (\"%.2f\", \"%d\", \"%s\").", "rep|s, n|string|Répète s n fois.",
    "find|s, motif|number|Position du motif.", "match|s, motif|string|Captures du motif.",
    "gmatch|s, motif|function|Itérateur sur les correspondances.", "gsub|s, motif, repl|string|Remplacement par motif.",
    "reverse|s|string|Texte inversé.", "byte|s, i|number|Code d'un caractère.", "char|...|string|Caractères depuis des codes.",
  ]),
  table: fns([
    "insert|t, [pos,] v|nil|Insère v en fin (ou à pos).", "remove|t, [pos]|valeur|Retire et renvoie un élément.",
    "concat|t, sep|string|Joint les éléments avec sep.", "sort|t, [comp]|nil|Trie sur place.",
    "unpack|t|...|Renvoie les éléments comme valeurs multiples.", "pack|...|table|Table des arguments (avec n).",
  ]),
  math: fns([
    "floor|x|number|Arrondi inférieur.", "ceil|x|number|Arrondi supérieur.", "abs|x|number|Valeur absolue.",
    "max|x, ...|number|Maximum.", "min|x, ...|number|Minimum.", "sqrt|x|number|Racine carrée.",
    "random|[m, n]|number|Nombre aléatoire.", "fmod|x, y|number|Reste de la division.", "exp|x|number|Exponentielle.",
    "log|x, [base]|number|Logarithme.", "tointeger|x|number|Conversion en entier.",
  ]).concat([
    { label: "pi", kind: "variable", detail: "math.pi", ret: "number", info: "Constante π." },
    { label: "huge", kind: "variable", detail: "math.huge", ret: "number", info: "Infini positif." },
  ]),
  os: fns([
    "time|[t]|number|Horodatage actuel en secondes.", "date|[fmt, t]|string|Date formatée (\"%d/%m/%Y\").",
    "clock||number|Temps processeur écoulé.", "difftime|t2, t1|number|Écart en secondes.",
  ]),
  utf8: fns(["char|...|string|Caractères UTF-8.", "len|s|number|Nombre de caractères UTF-8.", "codepoint|s, i|number|Point de code."]),
  coroutine: fns(["create|f|thread|Crée une coroutine.", "resume|co, ...|boolean|Reprend une coroutine.", "yield|...|...|Suspend la coroutine."]),
};

const NS_INFO: Record<string, string> = {
  sheet: "Feuille active : lecture et écriture des cellules.", string: "Fonctions de texte.", table: "Fonctions de tableaux.",
  math: "Fonctions mathématiques.", os: "Date et heure.", utf8: "Texte UTF-8.", coroutine: "Coroutines.",
};

const KEYWORDS = ("and break do else elseif end false for function goto if in local nil not or " +
  "repeat return then true until while").split(" ");

/** Top-level names: namespaces, global functions and keywords. */
export const GLOBALS: Doc[] = [
  ...Object.keys(DOCS).map((n): Doc => ({ label: n, kind: "namespace", detail: n, ret: "table", info: NS_INFO[n] })),
  ...fns([
    "print|...|nil|Écrit une ligne dans la sortie.", "pairs|t|function|Itère sur toutes les clés.",
    "ipairs|t|function|Itère sur les indices 1..n.", "tostring|v|string|Conversion en texte.",
    "tonumber|v, [base]|number|Conversion en nombre (nil si impossible).", "type|v|string|Type de la valeur.",
    "select|n, ...|...|Arguments à partir de n (ou \"#\").", "error|msg|nil|Arrête la macro avec un message.",
    "assert|v, [msg]|valeur|Erreur si v est faux.", "pcall|f, ...|boolean|Appel protégé.",
    "next|t, [k]|valeur|Clé suivante.", "setmetatable|t, mt|table|Définit la métatable.",
    "getmetatable|t|table|Métatable de t.", "rawget|t, k|valeur|Lecture sans métaméthode.",
    "rawset|t, k, v|table|Écriture sans métaméthode.", "rawlen|t|number|Longueur sans métaméthode.",
    "rawequal|a, b|boolean|Égalité sans métaméthode.", "load|code|function|Compile du code Lua.",
  ]),
  ...KEYWORDS.map((k): Doc => ({ label: k, kind: "keyword", detail: k, ret: "", info: "" })),
];
