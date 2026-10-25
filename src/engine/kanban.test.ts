/** Tests de engine/kanban.ts : colonnes par statut, « Sans statut », déplacement de carte, lignes masquées. */
import { describe, expect, it } from "vitest";
import { groupByStatus, moveCard, NO_STATUS } from "./kanban";

const GRID = [
  ["Tâche", "Statut"],
  ["A", "À faire"],
  ["B", "En cours"],
  ["C", ""],
  ["D", "À faire"],
];

describe("groupByStatus", () => {
  it("regroupe les lignes par valeur de la colonne de statut, dans l'ordre d'apparition", () => {
    const g = groupByStatus(GRID, 1, 0);
    expect(g.map((c) => c.status)).toEqual(["À faire", "En cours", NO_STATUS]);
    expect(g[0].cards.map((c) => c.row)).toEqual([2, 5]);
    expect(g[0].cards[0].title).toBe("A");
  });

  it("place les lignes sans statut dans la colonne « Sans statut »", () => {
    const g = groupByStatus(GRID, 1, 0);
    expect(g[2].cards.map((c) => c.row)).toEqual([4]);
    expect(g[2].empty).toBe(true);
  });

  it("ignore les lignes masquées par le filtre de la vue", () => {
    const g = groupByStatus(GRID, 1, 0, (row) => row === 2 || row === 3);
    expect(g.map((c) => c.status)).toEqual(["À faire", NO_STATUS]);
    expect(g[0].cards.map((c) => c.row)).toEqual([5]);
  });
});

describe("moveCard", () => {
  it("écrit le nouveau statut dans la cellule de la ligne", () => {
    expect(moveCard(2, 1, "En cours")).toEqual({ B2: "En cours" });
  });
  it("vide la cellule quand la cible est « Sans statut »", () => {
    expect(moveCard(4, 1, NO_STATUS)).toEqual({ B4: "" });
  });
});
