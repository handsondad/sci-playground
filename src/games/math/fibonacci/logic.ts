export const GOLDEN_ANGLE = 137.5;

export type SeedPoint = {
  index: number;
  x: number;
  y: number;
  r: number;
  thetaRad: number;
};

export type FibonacciLevel = {
  id: number;
  title: string;
  startAngle: number;
  minAngle: number;
  maxAngle: number;
  stepAngle: number;
  targetAngle: number;
  angleTol: number;
  minPacking?: number;
  requireSequence?: boolean;
  spokesHint?: number;
  story: string;
  hint: string;
  win: string;
};

/** 生成前 count 项斐波那契数列：1, 1, 2, 3, 5, 8, 13, 21... */
export function fibSequence(count: number): number[] {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return [];
  if (n === 1) return [1];
  const seq = [1, 1];
  for (let i = 2; i < n; i++) {
    seq.push(seq[i - 1] + seq[i - 2]);
  }
  return seq;
}

/**
 * Vogel 向日葵叶序模型：
 * 第 k 颗种子 (1..count) 极坐标 r = scale * sqrt(k), theta = k * angleDeg。
 */
export function seedPositions(count: number, angleDeg: number, scale = 9.8): SeedPoint[] {
  const total = Math.max(0, Math.floor(count));
  const radPerSeed = (angleDeg * Math.PI) / 180;
  const points: SeedPoint[] = [];
  for (let k = 1; k <= total; k++) {
    const r = scale * Math.sqrt(k);
    const thetaRad = k * radPerSeed;
    points.push({
      index: k,
      x: r * Math.cos(thetaRad),
      y: r * Math.sin(thetaRad),
      r,
      thetaRad
    });
  }
  return points;
}

function minSeedSeparation(angleDeg: number, sampleCount = 110): number {
  const pts = seedPositions(sampleCount, angleDeg, 1);
  let minD2 = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const ax = pts[i].x;
    const ay = pts[i].y;
    for (let j = i + 1; j < pts.length; j++) {
      const dx = ax - pts[j].x;
      const dy = ay - pts[j].y;
      const d2 = dx * dx + dy * dy;
      if (d2 < minD2) minD2 = d2;
    }
  }
  return minD2 === Infinity ? 0 : Math.sqrt(minD2);
}

const IDEAL_GOLDEN_DEG = 360 * (1 - 2 / (1 + Math.sqrt(5)));
const IDEAL_MIN_SEP = minSeedSeparation(IDEAL_GOLDEN_DEG, 110);

/**
 * 计算花盘密铺饱满度 (0..100)：
 * 衡量种子之间的最小最近邻间距与黄金分割角理想密铺间距之比。
 * 有理分数角会让种子排成直条辐射线相互挤撞、留出大片空白扇区，得分极低；
 * 黄金角 137.5° 附近无周期重叠，饱满度可达 96%~99%。
 */
export function packingScore(angleDeg: number): number {
  if (IDEAL_MIN_SEP <= 0) return 0;
  const sep = minSeedSeparation(angleDeg, 110);
  const ratio = sep / IDEAL_MIN_SEP;
  return Math.max(0, Math.min(100, Math.round(ratio * 99)));
}

export function checkFibonacciGoal(
  level: FibonacciLevel,
  angleDeg: number,
  filledPair?: readonly [number | null, number | null]
): boolean {
  if (Math.abs(angleDeg - level.targetAngle) > level.angleTol) return false;
  if (level.minPacking !== undefined && packingScore(angleDeg) < level.minPacking) return false;
  if (level.requireSequence) {
    if (!filledPair) return false;
    const expected = fibSequence(8); // [1, 1, 2, 3, 5, 8, 13, 21]
    if (filledPair[0] !== expected[6] || filledPair[1] !== expected[7]) return false;
  }
  return true;
}

export const fibonacciLevels: readonly FibonacciLevel[] = [
  {
    id: 1,
    title: "分数排成辐射线",
    startAngle: 90,
    minAngle: 60,
    maxAngle: 150,
    stepAngle: 5,
    targetAngle: 120,
    angleTol: 0.6,
    spokesHint: 3,
    story: "如果向日葵每长出一颗新种子，只死板地转 1/4 圈（90°）或 1/3 圈（120°）会怎样？先把发散角调到 120°（整整 1/3 圈），看看 140 颗种子排成了几条孤零零的直条纹！",
    hint: "360° ÷ 3 = 120°！把发散角滑块推到 120.0°，第 4 颗种子就会严丝合缝挡在第 1 颗正后方，挤成 3 条大叉子！",
    win: "哇，全挤在 3 条直线上啦！中间空出三大块扇形白地，外圈种子却挤扁了——要真这么长，向日葵连一半瓜子都装不下！"
  },
  {
    id: 2,
    title: "假黄金角的缝隙",
    startAngle: 144,
    minAngle: 60,
    maxAngle: 155,
    stepAngle: 2,
    targetAngle: 72,
    angleTol: 0.6,
    spokesHint: 5,
    story: "现在盘面上是 144°（正好 2/5 圈），种子排成了 5 条旋臂！那如果改成 1/5 圈呢？请把发散角调到 72°，观察有理数角为什么永远逃不开『周期重合』的魔咒！",
    hint: "360° ÷ 5 = 72°！把滑块拉回 72.0°，每长 5 颗种子又转回同一条射线，还是逃不掉 5 条风车缝隙！",
    win: "破案啦！不管 1/5 圈（72°）还是 2/5 圈（144°），只要角度能写成整数分数 p/q 圈，种子就一定会排成 q 条辐射线浪费空间！"
  },
  {
    id: 3,
    title: "黄金角密铺奇迹",
    startAngle: 132.0,
    minAngle: 130.0,
    maxAngle: 145.0,
    stepAngle: 0.5,
    targetAngle: GOLDEN_ANGLE,
    angleTol: 0.3,
    minPacking: 96,
    story: "亿万年演化帮植物找到了最无理的『黄金角』：360° × (1 − 1/φ) ≈ 137.5°！精细微调滑块找到它，让花盘饱满度突破 96%，同时点亮顺时针 8 条、逆时针 13 条螺旋线！",
    hint: "注意看饱满度数字：135° 会有 8 条缝，140° 也不够密；慢慢滑到正正好好 137.5°，整盘瓜子瞬间严丝合缝！",
    win: "太震撼啦！137.5° 黄金角让每一颗新瓜子都精准钻进最宽敞的空当里，顺时针 8 条、逆时针 13 条螺旋自然浮现！"
  },
  {
    id: 4,
    title: "斐波那契数列填空",
    startAngle: 136.0,
    minAngle: 130.0,
    maxAngle: 145.0,
    stepAngle: 0.5,
    targetAngle: GOLDEN_ANGLE,
    angleTol: 0.3,
    minPacking: 96,
    requireSequence: true,
    story: "去数松果、菠萝、雏菊和向日葵的左右螺旋条数，总会撞见同一串神秘数字：1, 1, 2, 3, 5, 8, [ ? ], [ ? ]！请保持 137.5° 黄金角，并点击数字卡补全后面两项！",
    hint: "斐波那契数列的秘密：每一项都等于前两项相加！5 + 8 = 13，那 8 + 13 等于多少呢？别忘了发散角也要调回 137.5° 哦！",
    win: "满分通关！5+8=13、8+13=21，再大号的大盘向日葵还会出现 34 条配 55 条、甚至 89 条配 144 条——数学就长在大自然的花心里！"
  }
];
