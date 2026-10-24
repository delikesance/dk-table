/** Toolbar wired to the app handle (formatting, undo/redo, file commands). */
import { createToolbar, type Toolbar } from "./toolbar";
import type { App } from "../appTypes";

/** Create the toolbar in `host`, routing every action to `app`. */
export function createAppToolbar(host: HTMLElement, app: App): Toolbar {
  return createToolbar(host, {
    onUndo: () => app.undo(), onRedo: () => app.redo(),
    onBold: () => app.style({ bold: !app.activeStyle().bold }),
    onItalic: () => app.style({ italic: !app.activeStyle().italic }),
    onAlign: (align) => app.style({ align }),
    onFormat: () => {},
    onFill: (fill) => app.style({ fill }),
    onOpen: () => app.hooks.command?.("open"),
    onSave: () => app.hooks.command?.("save"),
  });
}
