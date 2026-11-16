export const BLOCK_LEN = 120;

export type SubStackCheck = {
  /** 子叠体最底下那块砖的序号（0 = 贴着悬崖的底砖，n-1 = 最顶砖） */
  fromIndex: number;
  /** 该子叠体包含的上方积木块数 */
  blockCount: number;
  /** 子叠体联合重心横坐标（悬崖边缘 x = 0，向右悬空为正） */
  cmX: number;
  /** 下方承托面的右边缘横坐标（底砖承托于悬崖边 x = 0） */
  supportRightX: number;
  /** 安全裕度 = supportRightX - cmX（>= 0 表示重心落在支承面内，不会倾覆） */
  margin: number;
  stable: boolean;
};

export type StackStabilityResult = {
  stable: boolean;
  blockLen: number;
  rightEdges: number[];
  leftEdges: number[];
  centers: number[];
  checks: SubStackCheck[];
  /** 若失稳，记录最先发生倾覆的最上层子叠体起始下标；稳定则为 null */
  tippingFromIndex: number | null;
  overhangPx: number;
  overhangPct: number;
  topBlockClearOfCliff: boolean;
};

export type CantileverLevel = {
  id: number;
  title: string;
  blockCount: number;
  targetPct: number;
  maxTheoreticalPct: number;
  startOffsets: readonly number[];
  story: string;
  hint: string;
  win: string;
};

/**
 * 计算积木叠挑总悬出长度占单块砖长百分比。
 * offsets[i] 表示第 i 层积木（0 为底砖）相对于下方承托边缘向右伸出的像素偏移量。
 */
export function totalOverhangPct(offsets: readonly number[], blockLen: number = BLOCK_LEN): number {
  if (offsets.length === 0 || blockLen <= 0) return 0;
  let curRight = 0;
  let maxRight = 0;
  for (const off of offsets) {
    curRight += off;
    if (curRight > maxRight) maxRight = curRight;
  }
  return (maxRight / blockLen) * 100;
}

/**
 * 经典调和级数叠砖（Leaning Tower of Lire）静力平衡检验：
 * 从最顶层往下逐级检查顶上 k 块砖的联合重心 x_cm 是否不超出下方承托边 supportRightX。
 */
export function stackStability(
  offsets: readonly number[],
  blockLen: number = BLOCK_LEN
): StackStabilityResult {
  const n = offsets.length;
  const rightEdges: number[] = [];
  const leftEdges: number[] = [];
  const centers: number[] = [];

  let curRight = 0;
  for (let i = 0; i < n; i++) {
    curRight += offsets[i];
    rightEdges.push(curRight);
    leftEdges.push(curRight - blockLen);
    centers.push(curRight - blockLen / 2);
  }

  const checks: SubStackCheck[] = [];
  let tippingFromIndex: number | null = null;
  const eps = 1e-6;

  // 从上往下检查每一组顶部子叠体 [fromIndex .. n-1]
  for (let fromIndex = n - 1; fromIndex >= 0; fromIndex--) {
    let sumCm = 0;
    const count = n - fromIndex;
    for (let j = fromIndex; j < n; j++) {
      sumCm += centers[j];
    }
    const cmX = sumCm / count;
    const supportRightX = fromIndex === 0 ? 0 : rightEdges[fromIndex - 1];
    const margin = supportRightX - cmX;
    const subStable = margin >= -eps;

    if (!subStable && tippingFromIndex === null) {
      tippingFromIndex = fromIndex;
    }

    checks.push({
      fromIndex,
      blockCount: count,
      cmX,
      supportRightX,
      margin,
      stable: subStable
    });
  }

  const overhangPx = rightEdges.length > 0 ? Math.max(0, ...rightEdges) : 0;
  const overhangPct = totalOverhangPct(offsets, blockLen);
  const topBlockClearOfCliff = n > 0 ? leftEdges[n - 1] > eps : false;

  return {
    stable: tippingFromIndex === null,
    blockLen,
    rightEdges,
    leftEdges,
    centers,
    checks,
    tippingFromIndex,
    overhangPx,
    overhangPct,
    topBlockClearOfCliff
  };
}

export const cantileverLevels: readonly CantileverLevel[] = [
  {
    id: 1,
    title: "单砖探崖",
    blockCount: 1,
    targetPct: 48,
    maxTheoreticalPct: 50,
    startOffsets: [24],
    story: "不用一滴胶水，一块均匀石板（长 L = 120）最多能往悬崖外伸出多少而不掉下去？把第 1 块石板往右推到至少 48% 砖长处夺取红旗吧！",
    hint: "均匀石板的重心就在正中央（50% 处，即 60 像素）！只要伸出量不超过 60（比如调到 58 ~ 60），重心垂线还压在悬崖边上，就绝不会翻倒！",
    win: "压线平衡！单块石板的极限就是整块砖长的 1/2（50%）。再往外哪怕多挪 1 毫米，重力力矩就会把它掀翻下谷！"
  },
  {
    id: 2,
    title: "双砖叠挑",
    blockCount: 2,
    targetPct: 72,
    maxTheoreticalPct: 75,
    startOffsets: [20, 30],
    story: "加上第 2 块石板，总悬空长度就能突破半块砖！请层层推进两块石板，不翻倒地摸到悬崖外 72% 砖长的红旗！",
    hint: "诀窍是『从上往下算』：最上面第 2 层先相对底砖伸出近一半（58 ~ 60），底下第 1 层托着两块砖，最多还能再往悬崖外伸出 1/4 砖长（28 ~ 30），加起来就有 75% 啦！",
    win: "1/2 + 1/4 = 3/4（75%）！古桥的『叠涩挑梁』和木构飞檐，就是这样一层压一层把桥面一步步送向河心的！"
  },
  {
    id: 3,
    title: "三砖飞檐",
    blockCount: 3,
    targetPct: 88,
    maxTheoreticalPct: 91.7,
    startOffsets: [12, 18, 36],
    story: "三块石板叠挑，能探出接近一整块砖的距离吗？盯紧图上的绿色重心铅垂线，把总悬挑推过 88% 砖长！",
    hint: "按调和级数规律：顶砖第 3 层伸出约 58~60（L/2），中间第 2 层伸出约 28~30（L/4），最底第 1 层伸出约 18~20（L/6），三层合起来高达 90% 以上！",
    win: "1/2 + 1/4 + 1/6 ≈ 91.7%！每一组上方石板的联合重心都刚好踩在下一块石板的鼻尖上，分毫不差！"
  },
  {
    id: 4,
    title: "超越整块砖长奇迹",
    blockCount: 4,
    targetPct: 101,
    maxTheoreticalPct: 104.2,
    startOffsets: [10, 14, 22, 42],
    story: "终极奇迹挑战：不用一颗钉子，用 4 块砖探出【超过 101% 整块砖长】！也就是说，最上面那块砖跟悬崖连 1 毫米重叠都没有，完全悬在半空！",
    hint: "4 块砖的极限是 L/2 + L/4 + L/6 + L/8 = 60 + 30 + 20 + 15 = 125（104.2% L）！依次把第 4 层调到 59~60、第 3 层 29~30、第 2 层 19~20、第 1 层 14~15 试试！",
    win: "不可思议的力学神迹！因为调和级数 1/2 + 1/4 + 1/6 + 1/8 + … 没有上限，只要积木足够多且不碎裂，理论上不用胶水能跨过任意宽的大峡谷！"
  }
];
