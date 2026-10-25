/** Conversion d'une requête (`query.ts`) en macro Lua; voir `docs/query.md`. */
import { parseKey } from "./address";
import { stepLabel, type Step } from "./query";

const q = (s: string) => JSON.stringify(s);

/** Macro Lua équivalente : lit `range`, rejoue les étapes, écrit le résultat à droite de la plage. Pivot : commentaire. */
export function queryToLua(steps: Step[], range: string): string {
  const [a, b] = range.split(":");
  const p = parseKey(a), e = parseKey(b ?? a);
  if (!p || !e) return `-- plage invalide: ${range}\n`;
  const L = [
    `-- Requête rejouable sur ${range}`,
    `local function col(n) local s = "" while n > 0 do local m = (n - 1) % 26 s = string.char(65 + m) .. s n = (n - m - 1) // 26 end return s end`,
    `local t = {}`,
    `for r = ${p.row}, ${e.row} do local row = {} for c = ${p.col}, ${e.col} do row[#row + 1] = sheet.getRaw(col(c) .. r) end t[#t + 1] = row end`,
    `local head = t[1]`,
    `local function idx(name) for i, h in ipairs(head) do if h == name then return i end end error("colonne inconnue: " .. name) end`,
  ];
  steps.forEach((s, i) => {
    L.push(`-- ${i + 1}. ${stepLabel(s)}`);
    if (s.kind === "filter") {
      const cmp = { "=": "v == w", "!=": "v ~= w", ">": "tonumber(v) > tonumber(w)", "<": "tonumber(v) < tonumber(w)", contient: "string.find(string.lower(v), string.lower(w), 1, true)" }[s.op];
      L.push(`do local k, w, o = idx(${q(s.col)}), ${q(s.value)}, {t[1]} for i = 2, #t do local v = t[i][k] if ${cmp} then o[#o + 1] = t[i] end end t = o end`);
    } else if (s.kind === "dedupe") {
      const cols = s.cols ? `{${s.cols.map((c) => `idx(${q(c)})`).join(", ")}}` : `(function() local a = {} for i = 1, #head do a[i] = i end return a end)()`;
      L.push(`do local ks, seen, o = ${cols}, {}, {t[1]} for i = 2, #t do local key = {} for _, k in ipairs(ks) do key[#key + 1] = t[i][k] end key = table.concat(key, "\0") if not seen[key] then seen[key] = true o[#o + 1] = t[i] end end t = o end`);
    } else if (s.kind === "split") {
      L.push(`do local k, o = idx(${q(s.col)}), {} for i = 2, #t do local parts = {} for p in string.gmatch(t[i][k] .. ${q(s.delim)}, "(.-)" .. ${q(s.delim.replace(/[^%w]/g, "%$&")) }) do parts[#parts + 1] = p end o[i] = parts end local n = 1 for i = 2, #t do n = math.max(n, #o[i]) end local r = {} for i = 1, #t do local row = {} for j = 1, k - 1 do row[#row + 1] = t[i][j] end for j = 1, n do row[#row + 1] = i == 1 and (t[1][k] .. " " .. j) or (o[i][j] or "") end for j = k + 1, #t[i] do row[#row + 1] = t[i][j] end r[i] = row end t = r head = t[1] end`);
    } else if (s.spec.col || s.spec.calc) {
      L.push(`-- étape non convertible (pivot avec colonnes ou champ calculé): utiliser le dialogue Tableau croisé`);
    } else {
      L.push(`do local k, v, agg = idx(${q(s.spec.row)}), idx(${q(s.spec.value)}), ${q(s.spec.agg)} local keys, acc = {}, {} local function num(x) return tonumber((string.gsub(x, ",", "."))) end local function fmt(a) local r if agg == "SUM" then r = a.sum elseif agg == "COUNT" then r = a.count elseif a.n > 0 then r = a.sum / a.n else return "" end if r == math.floor(r) then return tostring(math.tointeger(r)) end return tostring(r) end local tot = {sum = 0, n = 0, count = 0} for i = 2, #t do local key, x = t[i][k], t[i][v] local a = acc[key] if not a then a = {sum = 0, n = 0, count = 0} acc[key] = a keys[#keys + 1] = key end for _, z in ipairs({a, tot}) do if x ~= "" then z.count = z.count + 1 end if num(x) then z.sum = z.sum + num(x) z.n = z.n + 1 end end end table.sort(keys, function(p, r) if tonumber(p) and tonumber(r) then return tonumber(p) < tonumber(r) end return p < r end) local o = {{t[1][k], agg .. " " .. t[1][v]}} for _, key in ipairs(keys) do o[#o + 1] = {key, fmt(acc[key])} end o[#o + 1] = {"Total", fmt(tot)} t = o end`);
    }
    L.push(`head = t[1]`);
  });
  L.push(`local c0 = ${e.col + 2}`, `for i, row in ipairs(t) do for j, v in ipairs(row) do sheet.setCell(col(c0 + j - 1) .. (${p.row} + i - 1), v) end end`);
  return L.join("\n") + "\n";
}
