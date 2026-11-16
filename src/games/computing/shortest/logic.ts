export type IslandNode = {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
};

export type IslandEdge = {
  from: string;
  to: string;
  cost: number;
  terrain: "stone" | "mud" | "cliff";
};

export type ShortestLevel = {
  id: number;
  title: string;
  start: string;
  end: string;
  nodes: readonly IslandNode[];
  edges: readonly IslandEdge[];
  optimalPath: readonly string[];
  story: string;
  hint: string;
  win: string;
};

/** 计算给定路径的总耗时；若只有起点则耗时为 0，若路径中存在不相连的跳跃则返回 Infinity。 */
export function pathCost(
  edges: readonly Pick<IslandEdge, "from" | "to" | "cost">[],
  path: readonly string[]
): number {
  if (path.length <= 1) return 0;
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    let bestStep = Infinity;
    for (const e of edges) {
      if ((e.from === a && e.to === b) || (e.from === b && e.to === a)) {
        if (e.cost < bestStep) bestStep = e.cost;
      }
    }
    if (!Number.isFinite(bestStep)) return Infinity;
    total += bestStep;
  }
  return total;
}

/** 纯函数 Dijkstra 算法：计算无向非负权图中从 start 到 end 的最短路径总权重（不可达返回 Infinity）。 */
export function dijkstraShortestCost(
  nodes: readonly ({ id: string } | string)[],
  edges: readonly Pick<IslandEdge, "from" | "to" | "cost">[],
  start: string,
  end: string
): number {
  const ids = nodes.map((n) => (typeof n === "string" ? n : n.id));
  const dist: Record<string, number> = {};
  const visited = new Set<string>();
  for (const id of ids) dist[id] = Infinity;
  if (!(start in dist) || !(end in dist)) return Infinity;
  dist[start] = 0;

  while (visited.size < ids.length) {
    let cur: string | null = null;
    let best = Infinity;
    for (const id of ids) {
      if (!visited.has(id) && dist[id] < best) {
        best = dist[id];
        cur = id;
      }
    }
    if (cur === null) break;
    if (cur === end) return dist[end];
    visited.add(cur);

    for (const e of edges) {
      if (e.cost < 0) continue;
      const neighbor = e.from === cur ? e.to : e.to === cur ? e.from : null;
      if (neighbor !== null && !visited.has(neighbor) && neighbor in dist) {
        const cand = dist[cur] + e.cost;
        if (cand < dist[neighbor]) {
          dist[neighbor] = cand;
        }
      }
    }
  }

  return dist[end];
}

/** 返回与当前节点直接相连的所有邻居节点 ID。 */
export function neighborsOf(edges: readonly Pick<IslandEdge, "from" | "to">[], nodeId: string): string[] {
  const out: string[] = [];
  for (const e of edges) {
    if (e.from === nodeId && !out.includes(e.to)) out.push(e.to);
    if (e.to === nodeId && !out.includes(e.from)) out.push(e.from);
  }
  return out;
}

export const shortestLevels: readonly ShortestLevel[] = [
  {
    id: 1,
    title: "近道泥潭陷阱",
    start: "S",
    end: "T",
    nodes: [
      { id: "S", name: "起点码头", emoji: "⚓", x: 54, y: 144 },
      { id: "A", name: "青石拱桥", emoji: "🌉", x: 180, y: 54 },
      { id: "B", name: "椰林浅滩", emoji: "🌴", x: 180, y: 234 },
      { id: "T", name: "黄金宝箱", emoji: "💎", x: 306, y: 144 }
    ],
    edges: [
      { from: "S", to: "T", cost: 9, terrain: "mud" },
      { from: "S", to: "A", cost: 3, terrain: "stone" },
      { from: "A", to: "T", cost: 4, terrain: "stone" },
      { from: "S", to: "B", cost: 5, terrain: "stone" },
      { from: "B", to: "T", cost: 5, terrain: "stone" }
    ],
    optimalPath: ["S", "A", "T"],
    story: "从码头 S 到宝箱 T 有一条笔直的『近道』，可那是深一脚浅一脚的烂泥潭，走过去足足要 9 分钟！试试看，绕路反而能更快到达吗？",
    hint: "别被直线步数骗啦！走北边的青石拱桥 S → A（3 分钟）→ T（4 分钟），两步加起来只要 3 + 4 = 7 分钟！",
    win: "最少步数 ≠ 最短时间！导航软件给你规划『绕高架不堵车』的路线时，算的就是每段路的权重耗时！"
  },
  {
    id: 2,
    title: "海岛快递员",
    start: "S",
    end: "T",
    nodes: [
      { id: "S", name: "起点码头", emoji: "⚓", x: 46, y: 144 },
      { id: "A", name: "风车岛", emoji: "🏡", x: 134, y: 60 },
      { id: "B", name: "珊瑚礁", emoji: "🪸", x: 134, y: 228 },
      { id: "C", name: "石板渡", emoji: "⛩️", x: 232, y: 60 },
      { id: "D", name: "海鸥崖", emoji: "🪨", x: 232, y: 228 },
      { id: "T", name: "海角灯塔", emoji: "🗼", x: 316, y: 144 }
    ],
    edges: [
      { from: "S", to: "A", cost: 5, terrain: "mud" },
      { from: "S", to: "B", cost: 2, terrain: "stone" },
      { from: "B", to: "A", cost: 2, terrain: "stone" },
      { from: "A", to: "C", cost: 2, terrain: "stone" },
      { from: "B", to: "D", cost: 6, terrain: "mud" },
      { from: "C", to: "D", cost: 4, terrain: "stone" },
      { from: "C", to: "T", cost: 3, terrain: "stone" },
      { from: "D", to: "T", cost: 2, terrain: "stone" }
    ],
    optimalPath: ["S", "B", "A", "C", "T"],
    story: "6 座小岛航道纵横！直接去风车岛 A 要 5 分钟，但先去珊瑚礁 B 再折向 A 呢？请帮快递船找出从码头 S 到灯塔 T 总耗时最短的航线！",
    hint: "利用迪杰斯特拉『松弛法』：S → B（2）→ A（2）到风车岛只要 4 分钟（比直走 5 分钟还省 1 分钟！），接着 → C（2）→ T（3），总计 9 分钟！",
    win: "9 分钟准时送达！1956 年计算机科学家迪杰斯特拉坐在咖啡馆里只花 20 分钟想出的最短路算法，至今支撑着全世界的互联网路由！"
  },
  {
    id: 3,
    title: "贪心近视眼陷阱",
    start: "S",
    end: "T",
    nodes: [
      { id: "S", name: "探险营地", emoji: "⛺", x: 46, y: 144 },
      { id: "A", name: "蜜糖花谷", emoji: "🌼", x: 134, y: 56 },
      { id: "B", name: "万丈悬崖", emoji: "🏔️", x: 236, y: 56 },
      { id: "C", name: "青石驿站", emoji: "🏮", x: 134, y: 228 },
      { id: "D", name: "溪谷木桥", emoji: "🛶", x: 236, y: 228 },
      { id: "T", name: "神秘宝箱", emoji: "👑", x: 316, y: 144 }
    ],
    edges: [
      { from: "S", to: "A", cost: 1, terrain: "stone" },
      { from: "A", to: "B", cost: 1, terrain: "stone" },
      { from: "B", to: "T", cost: 12, terrain: "cliff" },
      { from: "B", to: "D", cost: 9, terrain: "cliff" },
      { from: "A", to: "C", cost: 6, terrain: "mud" },
      { from: "S", to: "C", cost: 4, terrain: "stone" },
      { from: "C", to: "D", cost: 3, terrain: "stone" },
      { from: "D", to: "T", cost: 3, terrain: "stone" }
    ],
    optimalPath: ["S", "C", "D", "T"],
    story: "北边花谷小路一上来只要【1 分钟】，接着又只要【1 分钟】！如果只看眼前最便宜的一步（贪心法），最后会被迫爬 12 分钟的大雪山！试试全局规划找出真正最快路线！",
    hint: "放弃眼前 1 分钟的蜜糖诱惑！往南走 S → C（4 分钟）→ D（3 分钟）→ T（3 分钟），全程平坦畅通，4 + 3 + 3 = 10 分钟就能抱走皇冠！",
    win: "识破贪心陷阱！只顾眼前便宜会掉进 14 分钟雪山坑，放眼全局的 Dijkstra 算法稳稳算出 10 分钟最优解！"
  },
  {
    id: 4,
    title: "双城物资补给网",
    start: "S",
    end: "T",
    nodes: [
      { id: "S", name: "补给母港", emoji: "🚢", x: 40, y: 144 },
      { id: "A", name: "北林哨所", emoji: "🌲", x: 118, y: 52 },
      { id: "B", name: "中枢古镇", emoji: "🏰", x: 152, y: 144 },
      { id: "C", name: "南沙渔村", emoji: "🐚", x: 118, y: 236 },
      { id: "D", name: "云端索桥", emoji: "⛓️", x: 236, y: 66 },
      { id: "E", name: "望海高台", emoji: "🔭", x: 236, y: 222 },
      { id: "T", name: "双城宝库", emoji: "🏆", x: 320, y: 144 }
    ],
    edges: [
      { from: "S", to: "A", cost: 4, terrain: "stone" },
      { from: "S", to: "B", cost: 6, terrain: "mud" },
      { from: "S", to: "C", cost: 3, terrain: "stone" },
      { from: "C", to: "B", cost: 2, terrain: "stone" },
      { from: "A", to: "B", cost: 2, terrain: "stone" },
      { from: "A", to: "D", cost: 6, terrain: "cliff" },
      { from: "B", to: "D", cost: 3, terrain: "stone" },
      { from: "B", to: "E", cost: 5, terrain: "mud" },
      { from: "C", to: "E", cost: 8, terrain: "mud" },
      { from: "D", to: "E", cost: 1, terrain: "stone" },
      { from: "D", to: "T", cost: 5, terrain: "mud" },
      { from: "E", to: "T", cost: 2, terrain: "stone" }
    ],
    optimalPath: ["S", "C", "B", "D", "E", "T"],
    story: "终极 7 岛物资大调配！连接母港 S 与双城宝库 T 的道路有 12 条之多，看似绕来绕去的折线里藏着唯一一条【11 分钟】黄金路线，你能一秒不差跑出来吗？",
    hint: "一步步算最早到达时间：S→C(3)→B(5，比直走6快)→D(8)→顺着 1 分钟索桥滑到 E(9)→最后冲刺 T(11)！总耗时 3+2+3+1+2 = 11 分钟！",
    win: "11 分钟黄金航线圆满贯通！从外卖骑手派单、高铁换乘到火星车避障寻路，背后全都有图论最短路算法的功劳！"
  }
];
