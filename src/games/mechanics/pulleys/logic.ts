export type PullDirection = "down" | "up";

export type PulleyChoice = {
  strands: number;
  effortN: number;
  pullDirection?: PullDirection;
  ropeMeters?: number;
};

export type PulleyLevel = {
  id: number;
  title: string;
  cargoEmoji: string;
  cargoName: string;
  loadN: number;
  liftMeters: number;
  startStrands: number;
  startEffortN: number;
  startDirection: PullDirection;
  startRopeMeters: number;
  targetStrands: number;
  requiredDirection?: PullDirection;
  askRopeMeters?: boolean;
  maxEffortLimitN?: number;
  story: string;
  hint: string;
  win: string;
};

/** 理想滑轮组平衡拉力：F = G / n（忽略动滑轮自重与绳摩擦）。 */
export function requiredEffort(loadN: number, strands: number): number {
  const n = Math.max(1, Math.floor(strands));
  return Math.round((loadN / n) * 100) / 100;
}

/** 功的原理（省力必费距离）：绳端拉动距离 s = n * h。 */
export function ropePulledMeters(liftMeters: number, strands: number): number {
  const n = Math.max(1, Math.floor(strands));
  return Math.round(liftMeters * n * 100) / 100;
}

export function checkPulleyGoal(level: PulleyLevel, choice: PulleyChoice): boolean {
  if (choice.strands !== level.targetStrands) return false;
  const neededF = requiredEffort(level.loadN, level.targetStrands);
  if (Math.abs(choice.effortN - neededF) > 0.5) return false;
  if (level.maxEffortLimitN !== undefined && choice.effortN > level.maxEffortLimitN) {
    return false;
  }
  if (level.requiredDirection && choice.pullDirection !== level.requiredDirection) {
    return false;
  }
  if (level.askRopeMeters) {
    const neededRope = ropePulledMeters(level.liftMeters, level.targetStrands);
    if (choice.ropeMeters === undefined || Math.abs(choice.ropeMeters - neededRope) > 0.05) {
      return false;
    }
  }
  return true;
}

export const pulleyLevels: readonly PulleyLevel[] = [
  {
    id: 1,
    title: "升旗杆定滑轮",
    cargoEmoji: "🚩",
    cargoName: "国旗礼盒",
    loadN: 60,
    liftMeters: 1,
    startStrands: 1,
    startEffortN: 40,
    startDirection: "up",
    startRopeMeters: 1,
    targetStrands: 1,
    requiredDirection: "down",
    story: "操场升旗时，升旗手站在地面【往下拉绳】，红旗却往蓝天升起！这是因为旗杆顶装了『定滑轮』。请选 1 股承重、改成【向下拉绳】，并调准刚好吊起 60N 礼盒的拉力！",
    hint: "定滑轮只有 1 股绳吊着重物，不省力但能改变用力方向！选『1 股』、『⬇️ 向下拉』，再把拉力滑块调到 60 N！",
    win: "红旗冉冉升起！定滑轮就像一个等臂杠杆：虽然 60N 重物还得用 60N 拉力，但不用爬上旗杆顶，站在地上往下拽就成啦！"
  },
  {
    id: 2,
    title: "双股动滑轮省一半力",
    cargoEmoji: "📦",
    cargoName: "科学器材箱",
    loadN: 120,
    liftMeters: 1,
    startStrands: 1,
    startEffortN: 70,
    startDirection: "up",
    startRopeMeters: 1,
    targetStrands: 2,
    askRopeMeters: true,
    maxEffortLimitN: 70,
    story: "器材箱重达 120N，可小念最大力气只有 70N！装上跟着箱子一起升高的『动滑轮』（2 股绳共同分担重量），调准平衡拉力，并算出箱子升 1m 要拉几米绳！",
    hint: "2 股绳平分 120N，每股只需 F = 120 ÷ 2 = 60N！不过省一半力就要多走一倍路：箱子升 1m，两边绳子各缩 1m，一共要拉 2m 绳子！",
    win: "小念一只手就吊起 120N 大木箱啦！省一半力，就要多拉一倍长的绳子——大自然从不白送功，这就是『功的原理』！"
  },
  {
    id: 3,
    title: "四股滑轮组吊钢琴",
    cargoEmoji: "🎹",
    cargoName: "三角钢琴",
    loadN: 240,
    liftMeters: 2,
    startStrands: 2,
    startEffortN: 80,
    startDirection: "down",
    startRopeMeters: 4,
    targetStrands: 4,
    askRopeMeters: true,
    story: "搬家大挑战：要把 240N 的三角钢琴用区区【60N 拉力】稳稳吊上二楼（升高 2m）！该穿几股承重绳？绳子自由端一共得拉出多少米？",
    hint: "240N ÷ 60N = 4 股承重绳！再算拉绳长度：s = n × h = 4 股 × 2m = 8m！把股数选 4、拉力调 60N、拉绳长度调 8m！",
    win: "240N 的大钢琴稳稳升空！阿基米德曾用复合滑轮组独自拉动满载大船——只要绕够承重股数，再重的东西也能四两拨千斤！"
  },
  {
    id: 4,
    title: "省力又顺手向下拉",
    cargoEmoji: "🗿",
    cargoName: "石雕摆件",
    loadN: 180,
    liftMeters: 1,
    startStrands: 2,
    startEffortN: 90,
    startDirection: "up",
    startRopeMeters: 3,
    targetStrands: 3,
    requiredDirection: "down",
    story: "工地吊装 180N 石雕：既要把拉力省到刚好【60N】，又要求工人站在地面安全地【⬇️ 向下拉绳】！快搭配出既省三分之二力、又能向下施力的滑轮组绕法！",
    hint: "180N ÷ 60N = 3 股承重绳！由定滑轮＋动滑轮组成的 3 股滑轮组，最后一段自由绳刚好从顶梁定滑轮绕下来，选『3 股』+『⬇️ 向下拉』+『60N』！",
    win: "完美工程师方案！把定滑轮（改方向）和动滑轮（省力气）合体成『滑轮组』，现代港口塔吊和工地起重机全都是它的放大版！"
  }
];
