export function edgeKey(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function covers(edges: readonly [number, number][], path: readonly number[]): boolean {
  if (path.length !== edges.length + 1) return false;
  const left = new Set(edges.map(([a, b]) => edgeKey(a, b)));
  for (let i = 1; i < path.length; i++) {
    if (!left.delete(edgeKey(path[i - 1], path[i]))) return false;
  }
  return left.size === 0;
}

export function oddNodes(count: number, edges: readonly [number, number][]): number[] {
  const degree = new Array<number>(count).fill(0);
  for (const [a, b] of edges) {
    degree[a] += 1;
    degree[b] += 1;
  }
  return degree.map((n, i) => (n % 2 === 1 ? i : -1)).filter((i) => i >= 0);
}

export type Board = {
  id: number;
  title: string;
  hint: string;
  nodes: readonly { x: number; y: number }[];
  edges: readonly [number, number][];
  solution: readonly number[];
};

export const boards: readonly Board[] = [
  {
    id: 1, title: "三角形",
    hint: "每个点都连着偶数条线，从哪儿开始都行。",
    nodes: [{ x: 50, y: 16 }, { x: 18, y: 78 }, { x: 82, y: 78 }],
    edges: [[0, 1], [1, 2], [2, 0]],
    solution: [0, 1, 2, 0]
  },
  {
    id: 2, title: "正方形",
    hint: "沿着框走一圈，笔不用抬起来。",
    nodes: [{ x: 22, y: 22 }, { x: 78, y: 22 }, { x: 78, y: 78 }, { x: 22, y: 78 }],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0]],
    solution: [0, 1, 2, 3, 0]
  },
  {
    id: 3, title: "加一条对角线",
    hint: "有两个点连着三条线。一笔画必须从这两个点之一出发。",
    nodes: [{ x: 22, y: 22 }, { x: 78, y: 22 }, { x: 78, y: 78 }, { x: 22, y: 78 }],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]],
    solution: [0, 1, 2, 3, 0, 2]
  },
  {
    id: 4, title: "十字路口",
    hint: "中间的点连着四条路。两个尽头是单数，从亮着的点出发。",
    nodes: [{ x: 50, y: 50 }, { x: 50, y: 14 }, { x: 86, y: 50 }, { x: 50, y: 86 }, { x: 14, y: 50 }],
    edges: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2]],
    solution: [3, 0, 1, 2, 0, 4]
  },
  {
    id: 5, title: "小房子",
    hint: "房顶有个尖。还是先找连着单数条线的点。",
    nodes: [{ x: 24, y: 78 }, { x: 76, y: 78 }, { x: 76, y: 46 }, { x: 24, y: 46 }, { x: 50, y: 16 }],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [3, 4], [0, 2]],
    solution: [0, 1, 2, 4, 3, 0, 2, 3]
  }
];
