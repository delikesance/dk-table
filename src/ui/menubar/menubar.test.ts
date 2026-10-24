// @vitest-environment jsdom
/** Barre de menus à un niveau (refonte Hermes, H3) : 8 menus, aucun libellé en double, Scripts et thème branchés. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMenuSpec, type MenuDeps } from "./spec";
import { createMenuBar } from "../toolbar/menus";
import type { App } from "../appTypes";

const fakeApp = () => ({
  undo: vi.fn(), redo: vi.fn(), style: vi.fn(), activeStyle: () => ({}), addSheet: vi.fn(),
  sortColumn: vi.fn(), toggleSidebar: vi.fn(), editMany: vi.fn(), selectedKeys: () => ["A1"],
  borders: vi.fn(), insertRows: vi.fn(), insertCols: vi.fn(), deleteRows: vi.fn(), deleteCols: vi.fn(),
  setFreeze: vi.fn(), selection: () => "C3", cfRules: () => [], setCfRules: vi.fn(),
  activeDoc: () => ({ id: "s", name: "S", cols: 26, rows: 100, cells: {} }),
}) as unknown as App;
const deps = (macros: { id: string; name: string }[] = []): MenuDeps => ({
  file: { onNew: vi.fn(), onOpen: vi.fn(), onSave: vi.fn(), onSaveAs: vi.fn(), onImportCsv: vi.fn(), onExportCsv: vi.fn(), onExportFec: vi.fn() },
  openSettings: vi.fn(), openMacros: vi.fn(), macros: () => macros, runMacro: vi.fn(),
  openPalette: vi.fn(), openAbout: vi.fn(), autosum: vi.fn(),
});
const items = (spec: ReturnType<typeof buildMenuSpec>, menu: string) => {
  const m = spec.find((d) => d.label === menu)!;
  return typeof m.items === "function" ? m.items() : m.items;
};

beforeEach(() => { document.body.innerHTML = ""; localStorage.clear(); });

describe("contenu des menus", () => {
  it("8 menus dans l'ordre de la maquette validée", () => {
    expect(buildMenuSpec(fakeApp(), deps()).map((d) => d.label))
      .toEqual(["Fichier", "Édition", "Format", "Feuille", "Données", "Scripts", "Affichage", "Aide"]);
  });
  it("aucun libellé en double entre les menus", () => {
    const spec = buildMenuSpec(fakeApp(), deps([{ id: "m", name: "nettoyer" }]));
    const all = spec.flatMap((d) => items(spec, d.label).map((e) => e.label));
    expect(new Set(all).size).toBe(all.length);
  });
  it("un seul niveau : aucune entrée imbriquée hors Récents", () => {
    const spec = buildMenuSpec(fakeApp(), deps());
    const nested = spec.flatMap((d) => items(spec, d.label).filter((e) => e.sub).map((e) => e.label));
    expect(nested).toEqual(["Récents"]);
  });
  it("commandes structure, volets, souligné, renvoi et bordures rangées dans les menus", () => {
    const app = fakeApp();
    const spec = buildMenuSpec(app, deps());
    const labels = (m: string) => items(spec, m).map((e) => e.label);
    expect(labels("Format")).toEqual(expect.arrayContaining(["Souligné", "Renvoi à la ligne", "Bordures : toutes", "Bordures : aucune"]));
    expect(labels("Feuille")).toEqual(expect.arrayContaining(["Insérer une ligne au-dessus", "Insérer une colonne à gauche", "Supprimer les lignes", "Supprimer les colonnes"]));
    expect(labels("Affichage")).toEqual(expect.arrayContaining(["Figer la première ligne", "Figer la première colonne", "Figer jusqu'à la cellule active", "Libérer les volets"]));
    items(spec, "Affichage").find((e) => e.label === "Figer jusqu'à la cellule active")!.run!();
    expect(app.setFreeze).toHaveBeenCalledWith({ rows: 2, cols: 2 });
    items(spec, "Format").find((e) => e.label === "Bordures : contour")!.run!();
    expect(app.borders).toHaveBeenCalledWith("outer");
  });
  it("Format : Comptabilité juste après Monétaire", () => {
    const app = fakeApp();
    const f = items(buildMenuSpec(app, deps()), "Format");
    const i = f.findIndex((e) => e.label === "Monétaire");
    expect(f[i + 1].label).toBe("Comptabilité");
    f[i + 1].run!();
    expect(app.style).toHaveBeenCalledWith({ format: "accounting" });
  });
  it("Données : Insérer les en-têtes FEC (séparé) écrit A1:R1", () => {
    const app = fakeApp();
    const e = items(buildMenuSpec(app, deps()), "Données").find((x) => x.label === "Insérer les en-têtes FEC")!;
    expect(e.sep).toBe(true);
    e.run!();
    expect(app.editMany).toHaveBeenCalledWith(expect.objectContaining({ A1: "JournalCode", R1: "Idevise" }));
  });
  it("Fichier : Exporter FEC… juste après Exporter CSV", () => {
    const d = deps();
    const f = items(buildMenuSpec(fakeApp(), d), "Fichier");
    const i = f.findIndex((e) => e.label === "Exporter CSV");
    expect(f[i + 1].label).toBe("Exporter FEC…");
    f[i + 1].run!();
    expect(d.file.onExportFec).toHaveBeenCalled();
  });
  it("Format > Formatage conditionnel… ouvre le gestionnaire de règles", () => {
    items(buildMenuSpec(fakeApp(), deps()), "Format").find((e) => e.label === "Formatage conditionnel…")!.run!();
    expect(document.querySelector('.dk-dialog[data-id="cf"] h2')!.textContent).toBe("Formatage conditionnel");
  });
  it("Fichier > Paramètres… (Ctrl+,)", () => {
    const d = deps();
    const p = items(buildMenuSpec(fakeApp(), d), "Fichier").find((e) => e.label === "Paramètres…")!;
    expect(p.hint).toBe("Ctrl+,");
    p.run!();
    expect(d.openSettings).toHaveBeenCalled();
  });
  it("Scripts : éditeur (Alt+F11) puis une entrée par macro", () => {
    const d = deps([{ id: "a", name: "arrondir_soldes" }, { id: "b", name: "exporter_rapport" }]);
    const s = items(buildMenuSpec(fakeApp(), d), "Scripts");
    expect(s.map((e) => e.label)).toEqual(["Éditeur de macros", "arrondir_soldes", "exporter_rapport"]);
    expect(s[0].hint).toBe("Alt+F11");
    s[0].run!(); s[2].run!();
    expect(d.openMacros).toHaveBeenCalled();
    expect(d.runMacro).toHaveBeenCalledWith("b");
    expect(s[1].sep).toBe(true);
  });
  it("Affichage : thème coché selon la préférence, le choix pose data-theme", () => {
    const spec = buildMenuSpec(fakeApp(), deps());
    const t = items(spec, "Affichage").filter((e) => e.checked);
    expect(t.map((e) => e.label)).toEqual(["Thème automatique", "Thème clair", "Thème sombre"]);
    expect(t[0].checked!()).toBe(true);
    t[2].run!();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(t[2].checked!()).toBe(true);
  });
});

describe("rendu", () => {
  it("une barre .dk-menubar avec 8 déclencheurs titrés « Menu … »", () => {
    const bar = createMenuBar(buildMenuSpec(fakeApp(), deps()));
    document.body.append(bar);
    expect(bar.classList.contains("dk-menubar")).toBe(true);
    const t = [...bar.querySelectorAll<HTMLElement>(".dk-menu__trigger")];
    expect(t).toHaveLength(8);
    expect(t[0].title).toBe("Menu Fichier");
  });
  it("entrées cochables = menuitemradio + aria-checked, séparateurs marqués", () => {
    const bar = createMenuBar(buildMenuSpec(fakeApp(), deps()));
    document.body.append(bar);
    const aff = [...bar.querySelectorAll<HTMLButtonElement>(".dk-menu__trigger")].find((b) => b.title === "Menu Affichage")!;
    aff.click();
    const radios = bar.querySelectorAll('[role="menuitemradio"]');
    expect(radios).toHaveLength(3);
    expect(radios[0].getAttribute("aria-checked")).toBe("true");
    expect(bar.querySelector(".dk-menu__item--sep")).not.toBeNull();
  });
  it("les entrées dynamiques (macros) sont relues à chaque ouverture", () => {
    const list: { id: string; name: string }[] = [];
    const bar = createMenuBar(buildMenuSpec(fakeApp(), { ...deps(), macros: () => list }));
    document.body.append(bar);
    list.push({ id: "x", name: "nouvelle_macro" });
    [...bar.querySelectorAll<HTMLButtonElement>(".dk-menu__trigger")].find((b) => b.title === "Menu Scripts")!.click();
    expect(bar.textContent).toContain("nouvelle_macro");
  });
});
