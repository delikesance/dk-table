import { describe, it, expect } from 'vitest';
import { sortRows, detectHeader } from './sort';

describe('sortRows', () => {
  it('sorts A->Z and Z->A with permutation', () => {
    const b = [['b', '1'], ['A', '2'], ['c', '3']];
    const asc = sortRows(b, { col: 0 });
    expect(asc.rows.map((r) => r[0])).toEqual(['A', 'b', 'c']);
    expect(asc.order).toEqual([1, 0, 2]);
    const desc = sortRows(b, { col: 0, desc: true });
    expect(desc.rows.map((r) => r[0])).toEqual(['c', 'b', 'A']);
    expect(desc.order).toEqual([2, 0, 1]);
  });
  it('orders numbers < text < empties (empties last even desc)', () => {
    const b = [[''], ['x'], ['10'], ['2'], ['  ']];
    expect(sortRows(b, { col: 0 }).rows.map((r) => r[0])).toEqual(['2', '10', 'x', '', '  ']);
    expect(sortRows(b, { col: 0, desc: true }).rows.map((r) => r[0])).toEqual(['x', '10', '2', '', '  ']);
  });
  it('is stable on ties', () => {
    const b = [['a', '1'], ['A', '2'], ['a', '3']];
    expect(sortRows(b, { col: 0 }).order).toEqual([0, 1, 2]);
    expect(sortRows(b, { col: 0, desc: true }).order).toEqual([0, 1, 2]);
  });
  it('keeps header in place', () => {
    const b = [['n'], ['z'], ['a']];
    const r = sortRows(b, { col: 0, hasHeader: true });
    expect(r.rows.map((x) => x[0])).toEqual(['n', 'a', 'z']);
    expect(r.order).toEqual([0, 2, 1]);
  });
  it('handles empty block and does not mutate input', () => {
    expect(sortRows([], { col: 0 })).toEqual({ rows: [], order: [] });
    const b = [['b'], ['a']];
    sortRows(b, { col: 0 });
    expect(b).toEqual([['b'], ['a']]);
  });
});

describe('detectHeader', () => {
  it('true: text first row, number below in a text-headed column', () => {
    expect(detectHeader([['nom', 'age'], ['bob', '3']])).toBe(true);
  });
  it('false: numeric first row, no number below, empty header cell, short block', () => {
    expect(detectHeader([['1', 'a'], ['2', 'b']])).toBe(false);
    expect(detectHeader([['a', 'b'], ['c', 'd']])).toBe(false);
    expect(detectHeader([['a'], ['']])).toBe(false);
    expect(detectHeader([['a', ''], ['1', '2']])).toBe(false);
    expect(detectHeader([['a']])).toBe(false);
    expect(detectHeader([])).toBe(false);
  });
});
