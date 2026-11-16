export type BridgeNode = {
  id: string;
  x: number;
  y: number;
  support?: "pin" | "roller";
};

export type BridgeBar = {
  id: string;
  from: string;
  to: string;
  kind: "deck" | "chord" | "post" | "diagonal";
};

export type BridgeBay = {
  id: string;
  label: string;
  /** 该跨形成闭合四边形所需的选装弦杆/立柱 ID（固定杆件无需列入）。 */
  requiredChords: readonly string[];
  /** 该跨内部可选的斜撑杆 ID（至少激活 1 根即可把四边形分解为两个刚性三角形）。 */
  diagonals: readonly string[];
  /** 车队驶过该跨时的横向区间 [0..1]，用于塌陷动画触发。 */
  progressSpan: readonly [number, number];
  /** 未构成三角形时发生平行四边形侧移塌陷的节点 ID。 */
  sagNodeIds: readonly string[];
};

export type BridgeLevel = {
  id: number;
  title: string;
  budget: number;
  optimalBars: number;
  truckTons: number;
  nodes: readonly BridgeNode[];
  fixedBars: readonly BridgeBar[];
  slots: readonly BridgeBar[];
  bays: readonly BridgeBay[];
  startBars: readonly string[];
  story: string;
  hint: string;
  win: string;
};

export type BridgeEvalResult = {
  stable: boolean;
  withinBudget: boolean;
  passed: boolean;
  usedBars: number;
  budget: number;
  optimalBars: number;
  saggedBays: string[];
  triangulatedCount: number;
  totalBays: number;
  stars: number;
};

function toBarSet(activeBars: ReadonlySet<string> | readonly string[]): Set<string> {
  return activeBars instanceof Set ? new Set(activeBars) : new Set(activeBars);
}

/**
 * 麦克斯韦桁架刚性判据（面板三角化）：
 * 四边形跨格的所有边界弦杆齐全，且至少有 1 根对角斜撑把矩形锁定为两个三角形。
 */
export function isBayTriangulated(
  bay: BridgeBay,
  activeBars: ReadonlySet<string> | readonly string[]
): boolean {
  const set = toBarSet(activeBars);
  for (const req of bay.requiredChords) {
    if (!set.has(req)) return false;
  }
  return bay.diagonals.some((diagId) => set.has(diagId));
}

export function evaluateBridge(
  level: BridgeLevel,
  activeBars: ReadonlySet<string> | readonly string[]
): BridgeEvalResult {
  const rawSet = toBarSet(activeBars);
  const validSlotIds = new Set(level.slots.map((s) => s.id));
  const usedBars = Array.from(rawSet).filter((id) => validSlotIds.has(id)).length;
  const withinBudget = usedBars <= level.budget;

  const saggedBays: string[] = [];
  for (const bay of level.bays) {
    if (!isBayTriangulated(bay, rawSet)) {
      saggedBays.push(bay.id);
    }
  }

  const triangulatedCount = level.bays.length - saggedBays.length;
  const stable = saggedBays.length === 0;
  const passed = stable && withinBudget;
  const stars = !passed ? 0 : usedBars <= level.optimalBars ? 3 : 2;

  return {
    stable,
    withinBudget,
    passed,
    usedBars,
    budget: level.budget,
    optimalBars: level.optimalBars,
    saggedBays,
    triangulatedCount,
    totalBays: level.bays.length,
    stars
  };
}

export const bridgeLevels: readonly BridgeLevel[] = [
  {
    id: 1,
    title: "单跨木桥加固",
    budget: 1,
    optimalBars: 1,
    truckTons: 12,
    nodes: [
      { id: "b0", x: 105, y: 186, support: "pin" },
      { id: "b1", x: 255, y: 186, support: "roller" },
      { id: "t0", x: 105, y: 96 },
      { id: "t1", x: 255, y: 96 }
    ],
    fixedBars: [
      { id: "deck0", from: "b0", to: "b1", kind: "deck" },
      { id: "post0", from: "b0", to: "t0", kind: "post" },
      { id: "post1", from: "b1", to: "t1", kind: "post" },
      { id: "top0", from: "t0", to: "t1", kind: "chord" }
    ],
    slots: [
      { id: "d0a", from: "t0", to: "b1", kind: "diagonal" },
      { id: "d0b", from: "b0", to: "t1", kind: "diagonal" }
    ],
    bays: [
      {
        id: "bay0",
        label: "主河道单跨",
        requiredChords: [],
        diagonals: ["d0a", "d0b"],
        progressSpan: [0.22, 0.78],
        sagNodeIds: ["t0", "t1"]
      }
    ],
    startBars: [],
    story: "看！四根杆钉成的正方形桥框，卡车一压就会歪成平行四边形塌进河里！预算只有 1 根钢斜撑，点一下虚线把它变成最稳固的『三角形』吧！",
    hint: "四边形的四条边就算长度不变，角度也会像折扇一样歪斜；只要在两条对角虚线里任选 1 根点亮，正方形立刻分成两个锁死角度的三角形！",
    win: "稳稳过河！三根杆件一旦首尾相连，只要杆不折断，三个内角就绝对变不了——这就是『三角形具有稳定性』的几何秘密！"
  },
  {
    id: 2,
    title: "双跨铁桥省钢材",
    budget: 2,
    optimalBars: 2,
    truckTons: 20,
    nodes: [
      { id: "b0", x: 64, y: 188, support: "pin" },
      { id: "b1", x: 180, y: 188 },
      { id: "b2", x: 296, y: 188, support: "roller" },
      { id: "t0", x: 64, y: 104 },
      { id: "t1", x: 180, y: 104 },
      { id: "t2", x: 296, y: 104 }
    ],
    fixedBars: [
      { id: "deck0", from: "b0", to: "b1", kind: "deck" },
      { id: "deck1", from: "b1", to: "b2", kind: "deck" },
      { id: "post0", from: "b0", to: "t0", kind: "post" },
      { id: "post1", from: "b1", to: "t1", kind: "post" },
      { id: "post2", from: "b2", to: "t2", kind: "post" },
      { id: "top0", from: "t0", to: "t1", kind: "chord" },
      { id: "top1", from: "t1", to: "t2", kind: "chord" }
    ],
    slots: [
      { id: "d0a", from: "t0", to: "b1", kind: "diagonal" },
      { id: "d0b", from: "b0", to: "t1", kind: "diagonal" },
      { id: "d1a", from: "t1", to: "b2", kind: "diagonal" },
      { id: "d1b", from: "b1", to: "t2", kind: "diagonal" }
    ],
    bays: [
      {
        id: "bay0",
        label: "左跨桥格",
        requiredChords: [],
        diagonals: ["d0a", "d0b"],
        progressSpan: [0.16, 0.5],
        sagNodeIds: ["t0", "b1", "t1"]
      },
      {
        id: "bay1",
        label: "右跨桥格",
        requiredChords: [],
        diagonals: ["d1a", "d1b"],
        progressSpan: [0.5, 0.84],
        sagNodeIds: ["b1", "t1", "t2"]
      }
    ],
    startBars: ["d0a", "d0b"],
    story: "小念把 2 根钢材全打成『X 交叉』装在左跨，结果右跨还是软趴趴的空方框！请重新分配这 2 根斜撑，托住 20 吨重卡！",
    hint: "先把左跨多余的 1 根斜撑点掉拆下来，移去右跨虚线槽！左右两跨各装 1 根斜撑（比如经典的对称八字或倒八字普拉特桁架），两格就全锁紧啦！",
    win: "省料又结实！铁路钢桥从不把钢材浪费在同一个格子的多余交叉上，每一跨一根斜撑，就能把整座桥连成刚体！"
  },
  {
    id: 3,
    title: "三跨沃伦桁架大桥",
    budget: 5,
    optimalBars: 4,
    truckTons: 32,
    nodes: [
      { id: "b0", x: 42, y: 192, support: "pin" },
      { id: "b1", x: 134, y: 192 },
      { id: "b2", x: 226, y: 192 },
      { id: "b3", x: 318, y: 192, support: "roller" },
      { id: "t0", x: 42, y: 108 },
      { id: "t1", x: 134, y: 108 },
      { id: "t2", x: 226, y: 108 },
      { id: "t3", x: 318, y: 108 }
    ],
    fixedBars: [
      { id: "deck0", from: "b0", to: "b1", kind: "deck" },
      { id: "deck1", from: "b1", to: "b2", kind: "deck" },
      { id: "deck2", from: "b2", to: "b3", kind: "deck" },
      { id: "post0", from: "b0", to: "t0", kind: "post" },
      { id: "post1", from: "b1", to: "t1", kind: "post" },
      { id: "post2", from: "b2", to: "t2", kind: "post" },
      { id: "post3", from: "b3", to: "t3", kind: "post" },
      { id: "top0", from: "t0", to: "t1", kind: "chord" },
      { id: "top2", from: "t2", to: "t3", kind: "chord" }
    ],
    slots: [
      { id: "top1", from: "t1", to: "t2", kind: "chord" },
      { id: "d0a", from: "b0", to: "t1", kind: "diagonal" },
      { id: "d0b", from: "t0", to: "b1", kind: "diagonal" },
      { id: "d1a", from: "t1", to: "b2", kind: "diagonal" },
      { id: "d1b", from: "b1", to: "t2", kind: "diagonal" },
      { id: "d2a", from: "b2", to: "t3", kind: "diagonal" },
      { id: "d2b", from: "t2", to: "b3", kind: "diagonal" }
    ],
    bays: [
      {
        id: "bay0",
        label: "西岸边跨",
        requiredChords: [],
        diagonals: ["d0a", "d0b"],
        progressSpan: [0.12, 0.38],
        sagNodeIds: ["t0", "b1", "t1"]
      },
      {
        id: "bay1",
        label: "江心主跨",
        requiredChords: ["top1"],
        diagonals: ["d1a", "d1b"],
        progressSpan: [0.38, 0.64],
        sagNodeIds: ["b1", "b2", "t1", "t2"]
      },
      {
        id: "bay2",
        label: "东岸边跨",
        requiredChords: [],
        diagonals: ["d2a", "d2b"],
        progressSpan: [0.64, 0.88],
        sagNodeIds: ["b2", "t2", "t3"]
      }
    ],
    startBars: [],
    story: "跨江三跨大桥中间连『上弦顶梁』都还没封顶！如果顶梁断开，光加斜撑也围不出闭合三角形。用最少 4 根钢材拿满三星过江吧！",
    hint: "先点亮江心顶部的水平『上弦杆』把中跨封口，再给左、中、右三跨各加 1 根斜撑——总共只需 4 根钢材就能拼出经典沃伦桁架！",
    win: "江心合龙成功！桥顶的『上弦杆』承受挤压力，桥底的『下弦杆』承受拉力，中间的『腹杆斜撑』传递剪力，三兄弟缺一不可！"
  },
  {
    id: 4,
    title: "重载双层峡谷桥",
    budget: 4,
    optimalBars: 4,
    truckTons: 48,
    nodes: [
      { id: "u0", x: 66, y: 98, support: "pin" },
      { id: "u1", x: 180, y: 98 },
      { id: "u2", x: 294, y: 98, support: "roller" },
      { id: "m0", x: 66, y: 158 },
      { id: "m1", x: 180, y: 158 },
      { id: "m2", x: 294, y: 158 },
      { id: "l0", x: 66, y: 218, support: "pin" },
      { id: "l1", x: 180, y: 218 },
      { id: "l2", x: 294, y: 218, support: "roller" }
    ],
    fixedBars: [
      { id: "ud0", from: "u0", to: "u1", kind: "deck" },
      { id: "ud1", from: "u1", to: "u2", kind: "deck" },
      { id: "mc0", from: "m0", to: "m1", kind: "chord" },
      { id: "mc1", from: "m1", to: "m2", kind: "chord" },
      { id: "lc0", from: "l0", to: "l1", kind: "chord" },
      { id: "lc1", from: "l1", to: "l2", kind: "chord" },
      { id: "vp0", from: "u0", to: "m0", kind: "post" },
      { id: "vp1", from: "u1", to: "m1", kind: "post" },
      { id: "vp2", from: "u2", to: "m2", kind: "post" },
      { id: "lp0", from: "m0", to: "l0", kind: "post" },
      { id: "lp1", from: "m1", to: "l1", kind: "post" },
      { id: "lp2", from: "m2", to: "l2", kind: "post" }
    ],
    slots: [
      { id: "du0a", from: "u0", to: "m1", kind: "diagonal" },
      { id: "du0b", from: "m0", to: "u1", kind: "diagonal" },
      { id: "du1a", from: "u1", to: "m2", kind: "diagonal" },
      { id: "du1b", from: "m1", to: "u2", kind: "diagonal" },
      { id: "dl0a", from: "m0", to: "l1", kind: "diagonal" },
      { id: "dl0b", from: "l0", to: "m1", kind: "diagonal" },
      { id: "dl1a", from: "m1", to: "l2", kind: "diagonal" },
      { id: "dl1b", from: "l1", to: "m2", kind: "diagonal" }
    ],
    bays: [
      {
        id: "upperL",
        label: "上层左桥面格",
        requiredChords: [],
        diagonals: ["du0a", "du0b"],
        progressSpan: [0.18, 0.5],
        sagNodeIds: ["u1", "m1"]
      },
      {
        id: "upperR",
        label: "上层右桥面格",
        requiredChords: [],
        diagonals: ["du1a", "du1b"],
        progressSpan: [0.5, 0.82],
        sagNodeIds: ["u1", "m1"]
      },
      {
        id: "lowerL",
        label: "下层左峡谷格",
        requiredChords: [],
        diagonals: ["dl0a", "dl0b"],
        progressSpan: [0.22, 0.52],
        sagNodeIds: ["m1", "l1"]
      },
      {
        id: "lowerR",
        label: "下层右峡谷格",
        requiredChords: [],
        diagonals: ["dl1a", "dl1b"],
        progressSpan: [0.48, 0.78],
        sagNodeIds: ["m1", "l1"]
      }
    ],
    startBars: ["du0a", "du0b"],
    story: "深谷双层公铁大桥没有江心桥墩，上下两层共 4 个矩形桥格托起 48 吨矿山巨卡！钢材预算严格限额 4 根，把左上格浪费的双交叉拆开，让 4 个桥格全部三角化拿满三星吧！",
    hint: "预算只有 4 根钢材，刚好够『左上、右上、左下、右下』4 个方格每格分配 1 根斜撑！先把左上格多余的 1 根斜撑点掉，再把剩下 3 格各点亮 1 根斜撑（拼成帅气的菱形或K字桁架）即可！",
    win: "总工程师级别！武汉与南京长江大桥的双层钢桁梁，正是靠上下层每一个节间严丝合缝的三角形腹杆，上跑汽车、下跑火车稳如泰山！"
  }
];
