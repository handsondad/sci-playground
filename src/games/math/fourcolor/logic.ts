export type RegionShape = {
  id: number;
  name: string;
  d: string;
  lx: number;
  ly: number;
};

export type MapLevel = {
  id: number;
  title: string;
  paletteSize: number;
  parColors: number;
  regions: readonly RegionShape[];
  edges: readonly (readonly [number, number])[];
  solution: readonly number[];
  story: string;
  hint: string;
  win: string;
};

export const MAP_COLORS = [
  { id: 0, name: "珊瑚红", hex: "#ff6b6b", soft: "#ffe3e3" },
  { id: 1, name: "柠檬黄", hex: "#fcc419", soft: "#fff3bf" },
  { id: 2, name: "晴空蓝", hex: "#4d96ff", soft: "#dbeafe" },
  { id: 3, name: "薄荷绿", hex: "#3bb273", soft: "#d3f9d8" }
] as const;

/** 找出所有相邻且涂了同一种非空颜色的边界对。 */
export function conflicts(
  edges: readonly (readonly [number, number])[],
  colors: readonly number[]
): [number, number][] {
  const bad: [number, number][] = [];
  for (const [a, b] of edges) {
    if (colors[a] >= 0 && colors[a] === colors[b]) {
      bad.push([a, b]);
    }
  }
  return bad;
}

export function isValidColoring(
  regionCount: number,
  edges: readonly (readonly [number, number])[],
  colors: readonly number[]
): boolean {
  if (colors.length !== regionCount) return false;
  if (colors.some((c) => c < 0)) return false;
  return conflicts(edges, colors).length === 0;
}

export function usedColorCount(colors: readonly number[]): number {
  return new Set(colors.filter((c) => c >= 0)).size;
}

export const mapLevels: readonly MapLevel[] = [
  {
    id: 1,
    title: "田字四国",
    paletteSize: 4,
    parColors: 2,
    regions: [
      { id: 0, name: "北风郡", d: "M 30 30 L 180 30 L 180 135 L 30 135 Z", lx: 105, ly: 84 },
      { id: 1, name: "东曦郡", d: "M 180 30 L 330 30 L 330 135 L 180 135 Z", lx: 255, ly: 84 },
      { id: 2, name: "西林郡", d: "M 30 135 L 180 135 L 180 240 L 30 240 Z", lx: 105, ly: 188 },
      { id: 3, name: "南湾郡", d: "M 180 135 L 330 135 L 330 240 L 180 240 Z", lx: 255, ly: 188 }
    ],
    edges: [[0, 1], [0, 2], [1, 3], [2, 3]],
    solution: [0, 1, 1, 0],
    story: "制图师的难题：相邻（共用一条边）的两个地区不能涂同一种颜色，只在十字路口点对点挨着的不算相邻！试试用尽量少的颜色涂满田字四国。",
    hint: "左上和右下只隔着中心一个十字点，不算共边相邻！像国际象棋棋盘那样斜对角涂同色，只用 2 种颜色就够拿三星！",
    win: "只靠 2 种颜色就分得清清楚楚！只在顶点碰一下不算相邻，这是地图涂色的第一条黄金规则。"
  },
  {
    id: 2,
    title: "五瓣花环岛",
    paletteSize: 4,
    parColors: 3,
    regions: [
      { id: 0, name: "晨星湾", d: "M 180 20 L 295 82 L 222 126 L 138 126 L 65 82 Z", lx: 180, ly: 78 },
      { id: 1, name: "珊瑚岸", d: "M 295 82 L 325 196 L 236 186 L 222 126 Z", lx: 274, ly: 148 },
      { id: 2, name: "椰林角", d: "M 325 196 L 180 252 L 180 198 L 236 186 Z", lx: 236, ly: 214 },
      { id: 3, name: "白沙屿", d: "M 180 252 L 35 196 L 124 186 L 180 198 Z", lx: 124, ly: 214 },
      { id: 4, name: "海风崖", d: "M 35 196 L 65 82 L 138 126 L 124 186 Z", lx: 86, ly: 148 }
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]],
    solution: [0, 1, 0, 1, 2],
    story: "五个岛区围着中间的泻湖连成一圈！2 种颜色交替涂到第 5 块会发生什么？动手试试最少需要几种颜色。",
    hint: "5 是奇数，红黄红黄轮流涂到第 5 块时，它左边是黄、右边是红，只好请出第 3 种颜色救场！",
    win: "奇数环至少要 3 种颜色！那什么地图会逼我们用上第 4 种颜色呢？去下一关瞧瞧！"
  },
  {
    id: 3,
    title: "中央王城",
    paletteSize: 4,
    parColors: 4,
    regions: [
      { id: 0, name: "王城", d: "M 180 86 L 242 178 L 118 178 Z", lx: 180, ly: 148 },
      { id: 1, name: "北境", d: "M 42 26 L 318 26 L 180 135 Z", lx: 180, ly: 56 },
      { id: 2, name: "西境", d: "M 42 26 L 180 135 L 180 246 L 42 226 Z", lx: 92, ly: 162 },
      { id: 3, name: "东境", d: "M 318 26 L 318 226 L 180 246 L 180 135 Z", lx: 268, ly: 162 }
    ],
    edges: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]],
    solution: [0, 1, 2, 3],
    story: "注意看：北境、西境、东境两两共边，而正中央的王城又同时压在它们三家交界上！四个国家两两相邻，3 种颜色还够用吗？",
    hint: "四个地区两两挨着，就像四个小朋友每两个人都牵着手，每个人必须穿不同颜色的衣服——把 4 种颜色各用一次就过关啦！",
    win: "四个两两相邻的地区迫使第 4 种颜色登场！神奇的是：平面上绝不可能画出 5 个两两共边的地区！"
  },
  {
    id: 4,
    title: "星辰七国",
    paletteSize: 4,
    parColors: 4,
    regions: [
      { id: 0, name: "日曜都", d: "M 180 94 L 228 130 L 210 184 L 150 184 L 132 130 Z", lx: 180, ly: 144 },
      { id: 1, name: "朔风国", d: "M 110 22 L 250 22 L 228 130 L 180 94 L 132 130 Z", lx: 180, ly: 58 },
      { id: 2, name: "朝霞国", d: "M 250 22 L 336 92 L 286 176 L 210 184 L 228 130 Z", lx: 278, ly: 118 },
      { id: 3, name: "碧涛国", d: "M 286 176 L 320 246 L 180 254 L 180 184 L 210 184 Z", lx: 246, ly: 218 },
      { id: 4, name: "翠谷国", d: "M 180 184 L 180 254 L 40 246 L 74 176 L 150 184 Z", lx: 114, ly: 218 },
      { id: 5, name: "暮云国", d: "M 110 22 L 132 130 L 150 184 L 74 176 L 24 92 Z", lx: 82, ly: 118 }
    ],
    edges: [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
      [1, 2], [2, 3], [3, 4], [4, 5], [5, 1]
    ],
    solution: [3, 0, 1, 0, 1, 2],
    story: "终极挑战！中央的日曜都被外圈五个王国团团围住（外圈本身还是一个五瓣奇环！）。用四色画笔解开这幅王城大地图吧！",
    hint: "先把中央的日曜都涂上薄荷绿，外圈五国就只剩红、黄、蓝 3 种颜色轮流涂奇数环——合起来正好 4 种颜色！",
    win: "大功告成！1976 年数学家阿佩尔和哈肯借助计算机验算了上千种构型，终于证明了著名的『四色定理』：任何平面地图最多只要 4 种颜色！"
  }
];
