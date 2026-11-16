export type LeverItem = {
  id: string;
  mass: number;
  emoji: string;
  label: string;
  mystery?: boolean;
};

export type PlacedItem = LeverItem & {
  pos: number; // -4..-1 or 1..4
};

export type LeverLevel = {
  id: number;
  title: string;
  fixed: readonly PlacedItem[];
  tray: readonly LeverItem[];
  mysteryChoices?: readonly number[];
  mysteryAnswer?: number;
  story: string;
  hint: string;
  win: string;
};

export function leftTorque(items: readonly PlacedItem[]): number {
  return items.filter((x) => x.pos < 0).reduce((s, x) => s + Math.abs(x.pos) * x.mass, 0);
}

export function rightTorque(items: readonly PlacedItem[]): number {
  return items.filter((x) => x.pos > 0).reduce((s, x) => s + x.pos * x.mass, 0);
}

export function netTorque(items: readonly PlacedItem[]): number {
  return rightTorque(items) - leftTorque(items);
}

export function isBalanced(items: readonly PlacedItem[]): boolean {
  return items.length > 0 && netTorque(items) === 0;
}

export function tiltDegrees(items: readonly PlacedItem[]): number {
  const diff = netTorque(items);
  if (diff === 0) return 0;
  return Math.max(-16, Math.min(16, diff * 0.45));
}

export const leverLevels: readonly LeverLevel[] = [
  {
    id: 1,
    title: "对称跷跷板",
    fixed: [{ id: "dog-l", pos: -2, mass: 10, emoji: "🐕", label: "柴犬 10kg" }],
    tray: [{ id: "dog-r", mass: 10, emoji: "🐩", label: "贵宾 10kg" }],
    story: "左边第 2 格坐着 10kg 的小柴犬。把右边同样 10kg 的小贵宾放到第几格，抽掉木桩后跷跷板能稳稳水平？",
    hint: "重量相等时，离中心支点的格数也要相等！左力矩是 10×2=20，把小贵宾放到右边 +2 格（10×2=20）就平衡啦。",
    win: "稳稳当当！重量一样时，两边离支点一样远才能打成平手。"
  },
  {
    id: 2,
    title: "小狐狸撬熊猫",
    fixed: [{ id: "panda", pos: -1, mass: 30, emoji: "🐼", label: "熊猫 30kg" }],
    tray: [{ id: "fox", mass: 10, emoji: "🦊", label: "狐狸 10kg" }],
    story: "30kg 的大熊猫坐在左边第 1 格！你只有一只 10kg 的小狐狸，挂在右边哪一格能独自把大熊猫撬平？",
    hint: "阿基米德的杠杆秘密：力矩 = 重量 × 格数！大熊猫的左力矩是 30×1=30，10kg 的小狐狸只要站到 +3 格，10×3 也是 30！",
    win: "『给我一个支点，我能撬起地球！』离支点远 3 倍，10kg 也能稳稳顶住 30kg！"
  },
  {
    id: 3,
    title: "双砝码合力",
    fixed: [{ id: "chest", pos: -3, mass: 20, emoji: "🧰", label: "宝箱 20kg" }],
    tray: [
      { id: "w1", mass: 10, emoji: "🧱", label: "铜砖 10kg" },
      { id: "w2", mass: 10, emoji: "🪨", label: "铁石 10kg" }
    ],
    story: "左边第 3 格挂着 20kg 宝箱（左力矩 60）！每个挂钩只能挂一件物品，把手里的两块 10kg 重物挂到右边哪两个不同格子能凑够 60？",
    hint: "右边最远只有 +4 格（10×4=40），还差 60−40=20！再把另一块 10kg 挂在 +2 格（10×2=20），40+20=60 刚好平衡！",
    win: "漂亮！多个物体的力矩可以直接相加：10×2 + 10×4 = 20×3 = 60！"
  },
  {
    id: 4,
    title: "神秘盲盒称重",
    fixed: [{ id: "gift", pos: -2, mass: 15, emoji: "🎁", label: "神秘礼盒 ?kg", mystery: true }],
    tray: [
      { id: "m10", mass: 10, emoji: "⚖️", label: "砝码 10kg" },
      { id: "m5", mass: 5, emoji: "🪙", label: "砝码 5kg" }
    ],
    mysteryChoices: [10, 15, 20, 25],
    mysteryAnswer: 15,
    story: "古人杆秤的原理！左边第 2 格挂着一个不知重量的神秘礼盒。先用 10kg 和 5kg 砝码把杠杆调平，再算出礼盒重几千克！",
    hint: "试试把 10kg 挂在 +2 格（力矩 20）、5kg 挂在 +2 旁边的 +2 占满了？那就把 10kg 挂 +3（30）或者 10kg 挂 +2、5kg 挂 +2 不行时挂 10kg 在 +3 格试试！哇，单靠 +3 格的 10kg（力矩 30）就平了！30 ÷ 2 格 = 15kg！",
    win: "神算子！右力矩 30 除以左边第 2 格，一除就算出神秘礼盒正好是 15kg！菜市场的杆秤就是靠一砣小秤砣称出大西瓜的。"
  }
];
