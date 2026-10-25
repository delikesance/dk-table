import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { formatSpec, type DocFormat } from "./format";

/** Format commands act on the Markdown text. */
function run(doc: string, from: number, to: number, name: DocFormat): { doc: string; sel: [number, number] } {
  const s = EditorState.create({ doc, selection: EditorSelection.single(from, to) });
  const n = s.update(formatSpec(s, name)).state;
  return { doc: n.doc.toString(), sel: [n.selection.main.from, n.selection.main.to] };
}

describe("format", () => {
  it("wraps and unwraps the selection", () => {
    expect(run("un mot", 3, 6, "strong")).toEqual({ doc: "un **mot**", sel: [5, 8] });
    expect(run("un **mot**", 5, 8, "strong").doc).toBe("un mot");
    expect(run("un mot", 3, 6, "underline").doc).toBe("un <u>mot</u>");
  });
  it("opens an empty pair with the cursor inside", () => {
    expect(run("", 0, 0, "em")).toEqual({ doc: "**", sel: [1, 1] });
  });
  it("sets, changes and removes a title", () => {
    expect(run("Titre", 0, 0, "h2").doc).toBe("## Titre");
    expect(run("## Titre", 0, 0, "h1").doc).toBe("# Titre");
    expect(run("## Titre", 0, 0, "h2").doc).toBe("Titre");
    expect(run("## Titre", 0, 0, "p").doc).toBe("Titre");
  });
  it("makes lists and quotes on every selected line, and removes them", () => {
    expect(run("a\nb", 0, 3, "bullet").doc).toBe("- a\n- b");
    expect(run("a\nb", 0, 3, "ordered").doc).toBe("1. a\n2. b");
    expect(run("- a\n- b", 0, 7, "bullet").doc).toBe("a\nb");
    expect(run("- a", 0, 0, "ordered").doc).toBe("1. a");
    expect(run("a", 0, 0, "quote").doc).toBe("> a");
    expect(run("> a", 0, 0, "quote").doc).toBe("a");
  });
});
