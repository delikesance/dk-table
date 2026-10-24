/**
 * Branche la barre de menus sur l'application : fichiers (fileops, ou le hook `command` pour
 * ouvrir/enregistrer/récents, comme les raccourcis), dialogues (Paramètres, À propos),
 * macros (magasin `app.macros`, relu à chaque ouverture du menu Scripts), palette.
 */
import type { App } from "../appTypes";
import type { MenuDeps } from "./spec";
import { exportCsv, exportFec, importCsv, newDocument, saveFile } from "../fileops";
import { openSettings } from "../dialogs/settings";
import { openAbout } from "../dialogs/about";
import { autosum } from "../autosum";

/** Dépendances réelles de `buildMenuSpec` pour `app` ; `openPalette` vient de la palette montée. */
export function menuDeps(app: App, openPalette: () => void): MenuDeps {
  return {
    file: {
      onNew: () => newDocument(app),
      onOpen: () => app.hooks.command?.("open"),
      recents: () => app.recents(),
      onOpenRecent: (p) => app.hooks.command?.(`recent:${p}`),
      onSave: () => app.hooks.command?.("save"),
      onSaveAs: () => void saveFile(app, true),
      onImportCsv: () => void importCsv(app),
      onExportCsv: () => void exportCsv(app),
      onExportFec: () => void exportFec(app),
    },
    openSettings,
    openMacros: () => void app.openMacros(),
    macros: () => app.macros.list().map(({ id, name }) => ({ id, name })),
    runMacro: (id) => void app.runMacro(id),
    openPalette,
    openAbout,
    autosum: () => void autosum(app),
  };
}
