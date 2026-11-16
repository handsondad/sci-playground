export type ScaleResult = "left" | "right" | "equal";

export type WeighingLevel = {
  id: number;
  title: string;
  itemName: string;
  itemEmoji: string;
  count: number;
  maxWeighings: number;
  story: string;
  hint: string;
  win: string;
};

/**
 * 信息论三分下界：从 count 个外观相同的物品中找出唯一偏重次品，
 * 天平每次称重有『左沉、右沉、平手』3 种结果，最少需要 ⌈log₃(count)⌉ 次称重保证必中。
 */
export function minWeighingsForHeavy(count: number): number {
  if (count <= 1) return 0;
  let weighings = 0;
  let capacity = 1;
  while (capacity < count) {
    capacity *= 3;
    weighings += 1;
  }
  return weighings;
}

/**
 * 比较天平左右托盘轻重：普通物品重 10，唯一偏重次品 heavyId 重 11。
 * 返回 "left"（左盘更沉）、"right"（右盘更沉）或 "equal"（两边一样重）。
 */
export function comparePans(
  leftIds: readonly number[],
  rightIds: readonly number[],
  heavyId: number
): ScaleResult {
  const leftWeight = leftIds.reduce((sum, id) => sum + (id === heavyId ? 11 : 10), 0);
  const rightWeight = rightIds.reduce((sum, id) => sum + (id === heavyId ? 11 : 10), 0);
  if (leftWeight > rightWeight) return "left";
  if (rightWeight > leftWeight) return "right";
  return "equal";
}

/**
 * 公平对手策略（防蒙对）：在当前所有尚未排除的嫌疑候选集中，
 * 选出让剩余嫌疑集合最大的天平分支（并列时按 roundSeed 轮换），保证三分法必胜而乱放不会侥幸过关。
 */
export function resolveAdversaryStep(
  candidates: readonly number[],
  leftIds: readonly number[],
  rightIds: readonly number[],
  roundSeed: number
): { result: ScaleResult; nextCandidates: number[]; chosenHeavyId: number } {
  const groups: Record<ScaleResult, number[]> = {
    left: [],
    right: [],
    equal: []
  };
  for (const cand of candidates) {
    const res = comparePans(leftIds, rightIds, cand);
    groups[res].push(cand);
  }
  const order: ScaleResult[] = ["left", "right", "equal"];
  const maxLen = Math.max(groups.left.length, groups.right.length, groups.equal.length);
  const tied = order.filter((k) => groups[k].length === maxLen && groups[k].length > 0);
  const pickedOutcome = tied[Math.abs(roundSeed) % tied.length] ?? "equal";
  const nextCandidates = groups[pickedOutcome];
  const chosenHeavyId = nextCandidates[Math.abs(roundSeed) % nextCandidates.length] ?? candidates[0] ?? 1;
  return { result: pickedOutcome, nextCandidates, chosenHeavyId };
}

export const weighingLevels: readonly WeighingLevel[] = [
  {
    id: 1,
    title: "三枚金币一锤定音",
    itemName: "金币",
    itemEmoji: "🪙",
    count: 3,
    maxWeighings: 1,
    story: "国王赏了 3 枚一模一样的金币，其中混着 1 枚偏重的实心特制币！天平只准称【1 次】，怎么摆才能百分百锁定那枚重金币？",
    hint: "别把 3 枚全往上堆！左边放 1 枚、右边放 1 枚、桌外留 1 枚：哪边沉就是哪边，要是天平平手，桌外留着的那第 3 枚就必是重币！",
    win: "漂亮！天平虽然只有两个托盘，却能测出『左沉、右沉、平手』三种信号，一次称重刚好管住 3 枚金币！"
  },
  {
    id: 2,
    title: "九枚金币两次必中",
    itemName: "金币",
    itemEmoji: "🪙",
    count: 9,
    maxWeighings: 2,
    story: "金币增加到 9 枚，依然藏着 1 枚偏重币！如果第一次放 4 vs 4，万一某边沉了还剩 4 枚，第二次根本不够测！怎样分组才能稳稳【2 次】必中？",
    hint: "用三分查找！第一次左盘放 3 枚、右盘放 3 枚、桌外留 3 枚，一下子就把 9 枚缩成 3 枚嫌疑币；第二次再从那 3 枚里放 1 vs 1 就锁定啦！",
    win: "9 → 3 → 1！三分查找比对半二分还要快，3² = 9，短短两次称重就从九枚金币里精准擒获次品！"
  },
  {
    id: 3,
    title: "八枚珍珠找重珠",
    itemName: "珍珠",
    itemEmoji: "🫧",
    count: 8,
    maxWeighings: 2,
    story: "最容易掉坑的经典面试题：8 颗南海珍珠里有 1 颗偏重！直觉总想平分成『4 颗对 4 颗』，可限称【2 次】，第一次到底该放几对几？",
    hint: "千万别放 4 vs 4（沉的那边剩 4 颗，1 次称不完）！第一次照样放【3 颗 vs 3 颗】，桌外留 2 颗：每堆都不超过 3 颗，第 2 次 1 vs 1 稳操胜券！",
    win: "破除平分直觉啦！把 8 分成 3-3-2 比分成 4-4 信息量更大，因为平手这个第三分支也帮我们分担了 2 颗珍珠！"
  },
  {
    id: 4,
    title: "十二枚零件挑战",
    itemName: "钛合金零件",
    itemEmoji: "⚙️",
    count: 12,
    maxWeighings: 3,
    story: "航天车间里有 12 枚精密钛合金齿轮，已知其中 1 枚偏重。天平最多只允许称【3 次】（因为 3²=9 < 12 ≤ 27=3³），请用三分法把它找出来！",
    hint: "12 枚正好分成 4-4-4 三组：第一次左 4 右 4（留 4）锁进 4 枚；第二次在嫌疑 4 枚里放 1 vs 1（留 2）或 2 vs 2；第三次 1 vs 1 一举抓获！",
    win: "信息论大师毕业！每次称重最多把嫌疑范围缩小到 1/3，3 次天平理论上最多能从 3³ = 27 枚已知偏重的零件里百发百中！"
  }
];
