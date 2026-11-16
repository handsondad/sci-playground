export type Dir = "N" | "E" | "S" | "W";
export type Mirror = "/" | "\\";

const step: Record<Dir, { c: number; r: number }> = {
  N: { c: 0, r: -1 }, E: { c: 1, r: 0 }, S: { c: 0, r: 1 }, W: { c: -1, r: 0 }
};

/** `/` 和 `\` 把光线折向哪。格子坐标向下为南。 */
export function reflect(mirror: Mirror, dir: Dir): Dir {
  if (mirror === "/") {
    const next: Record<Dir, Dir> = { E: "N", N: "E", W: "S", S: "W" };
    return next[dir];
  }
  const next: Record<Dir, Dir> = { E: "S", S: "E", W: "N", N: "W" };
  return next[dir];
}

export type Beam = { hit: boolean; cells: { c: number; r: number }[] };

export function cast(spec: {
  cols: number;
  rows: number;
  start: { c: number; r: number; dir: Dir };
  goal: { c: number; r: number };
  walls?: readonly string[];
  mirrors: Readonly<Record<string, Mirror>>;
}): Beam {
  const walls = new Set(spec.walls ?? []);
  const seen = new Set<string>();
  let c = spec.start.c;
  let r = spec.start.r;
  let dir = spec.start.dir;
  const cells: { c: number; r: number }[] = [];
  for (let guard = 0; guard < spec.cols * spec.rows * 4; guard++) {
    if (c < 0 || r < 0 || c >= spec.cols || r >= spec.rows) return { hit: false, cells };
    const key = `${c},${r}`;
    const stamp = `${key}:${dir}`;
    if (seen.has(stamp)) return { hit: false, cells };
    seen.add(stamp);
    if (walls.has(key)) return { hit: false, cells };
    cells.push({ c, r });
    if (c === spec.goal.c && r === spec.goal.r) return { hit: true, cells };
    const mirror = spec.mirrors[key];
    if (mirror) dir = reflect(mirror, dir);
    c += step[dir].c;
    r += step[dir].r;
  }
  return { hit: false, cells };
}

export type MirrorLevel = {
  id: number;
  title: string;
  story: string;
  cols: number;
  rows: number;
  start: { c: number; r: number; dir: Dir };
  goal: { c: number; r: number };
  walls: readonly string[];
  solution: Readonly<Record<string, Mirror>>;
};

export const mirrorLevels: readonly MirrorLevel[] = [
  {
    id: 1, title: "拐一次",
    story: "激光要照到红宝石。点格子，放下一面镜子。",
    cols: 5, rows: 4,
    start: { c: 0, r: 2, dir: "E" },
    goal: { c: 3, r: 0 },
    walls: ["4,2"],
    solution: { "3,2": "/" }
  },
  {
    id: 2, title: "再拐一次",
    story: "一面镜子不够。光先往北，再往东。",
    cols: 5, rows: 4,
    start: { c: 0, r: 2, dir: "E" },
    goal: { c: 4, r: 0 },
    walls: ["4,2"],
    solution: { "2,2": "/", "2,0": "/" }
  },
  {
    id: 3, title: "反斜杠",
    story: "这面镜子是反斜杠，光会往下折。",
    cols: 5, rows: 4,
    start: { c: 0, r: 0, dir: "E" },
    goal: { c: 4, r: 3 },
    walls: ["4,0"],
    solution: { "2,0": "\\", "2,3": "\\" }
  },
  {
    id: 4, title: "绕开墙",
    story: "直线上有墙。光得绕下去，再绕回来。",
    cols: 6, rows: 5,
    start: { c: 0, r: 1, dir: "E" },
    goal: { c: 5, r: 1 },
    walls: ["2,1", "3,1"],
    solution: { "1,1": "\\", "1,3": "\\", "4,3": "/", "4,1": "/" }
  }
];
