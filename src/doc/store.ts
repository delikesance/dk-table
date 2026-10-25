/** In-memory list of the workbook's rich-text documents (persisted as `DktDoc.docs`). */
import type { DocText } from "../io/types";
import { uid } from "../ui/model";

/** Store of documents: add / rename / remove / reorder / content, with a change hook. */
export interface DocStore {
  list(): DocText[];
  get(id: string): DocText | undefined;
  /** New empty document named "Document N"; returns it. */
  add(): DocText;
  rename(id: string, name: string): void;
  setText(id: string, md: string): void;
  remove(id: string): void;
  /** Keep the documents in the order of `ids` (unknown ids ignored). */
  reorder(ids: string[]): void;
  /** Replace the whole list from a persisted file (no change notification). */
  load(docs: DocText[] | undefined): void;
  /** Persistable copy, or undefined when there is no document (keeps files lean). */
  toDocs(): DocText[] | undefined;
  /** Called after every user modification (not after `load`). */
  onChange(cb: () => void): void;
}

/** Create an empty document store. */
export function createDocStore(): DocStore {
  let docs: DocText[] = [];
  let cb: () => void = () => {};
  const changed = (): void => cb();
  return {
    list: () => docs,
    get: (id) => docs.find((d) => d.id === id),
    add() {
      const d: DocText = { id: uid(), name: `Document ${docs.length + 1}`, md: "" };
      docs = [...docs, d];
      changed();
      return d;
    },
    rename(id, name) {
      docs = docs.map((d) => (d.id === id ? { ...d, name } : d));
      changed();
    },
    setText(id, md) {
      docs = docs.map((d) => (d.id === id ? { ...d, md } : d));
      changed();
    },
    remove(id) {
      docs = docs.filter((d) => d.id !== id);
      changed();
    },
    reorder(ids) {
      docs = ids.map((i) => docs.find((d) => d.id === i)!).filter(Boolean);
      changed();
    },
    load(next) { docs = structuredClone(next ?? []); },
    toDocs: () => (docs.length ? structuredClone(docs) : undefined),
    onChange(f) { cb = f; },
  };
}
