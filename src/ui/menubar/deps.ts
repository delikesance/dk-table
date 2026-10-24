/**
 * Branche la barre de menus sur l'application : fichiers (fileops, ou le hook `command` pour
 * ouvrir/enregistrer/récents, comme les raccourcis), dialogues (Paramètres, À propos),
 * macros, palette. Les macros listées viendront du magasin de macros (PR macros Lua) ; d'ici là,
 * « Éditeur de macros » ouvre la boîte d'exécution existante et la liste est vide.
 */
import type { App } from "../appTypes";
import type { MenuDeps } from "./spec";
import { exportCsv, importCsv, newDocument, saveFile } from "../fileops";
import { openMacroDialog } from "../../macros/dialog";
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
    },
    openSettings,
    openMacros: () => openMacroDialog(app),
    macros: () => [],
    runMacro: () => {},
    openPalette,
    openAbout,
    autosum: () => void autosum(app),
  };
}
