export type Towers = number[][];

/** 三关的盘子层数。 */
export const SIZES = [3, 4, 5] as const;

export function startTowers(n: number): Towers {
  return [Array.from({ length: n }, (_, i) => n - i), [], []];
}

export function canPlace(towers: Towers, from: number, to: number) {
  if (from === to) return false;
  const source = towers[from];
  if (!source.length) return false;
  const disk = source[source.length - 1];
  const target = towers[to];
  return target.length === 0 || target[target.length - 1] > disk;
}

export function moveDisk(towers: Towers, from: number, to: number): Towers | null {
  if (!canPlace(towers, from, to)) return null;
  const next = towers.map((peg) => peg.slice());
  next[to].push(next[from].pop()!);
  return next;
}

export function solved(towers: Towers, n: number) {
  return towers[2].length === n;
}

export const fewest = (n: number) => 2 ** n - 1;
