/** Text commands of a dk doc by name (menu Format, shortcuts): marks, block types, lists, quote. */
import { toggleMark, setBlockType, wrapIn } from "prosemirror-commands";
import { wrapInList } from "prosemirror-schema-list";
import type { Command } from "prosemirror-state";
import { docSchema as s } from "./schema";

/** Names accepted by `DocEditor.command`. */
export type DocFormat = "strong" | "em" | "underline" | "p" | "h1" | "h2" | "h3" | "bullet" | "ordered" | "quote";

/** The command behind each name. */
export const docCommands: Record<DocFormat, Command> = {
  strong: toggleMark(s.marks.strong),
  em: toggleMark(s.marks.em),
  underline: toggleMark(s.marks.underline),
  p: setBlockType(s.nodes.paragraph),
  h1: setBlockType(s.nodes.heading, { level: 1 }),
  h2: setBlockType(s.nodes.heading, { level: 2 }),
  h3: setBlockType(s.nodes.heading, { level: 3 }),
  bullet: wrapInList(s.nodes.bullet_list),
  ordered: wrapInList(s.nodes.ordered_list),
  quote: wrapIn(s.nodes.blockquote),
};
