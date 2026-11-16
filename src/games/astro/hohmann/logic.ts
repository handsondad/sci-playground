/**
 * 「霍曼火星变轨」纯天体力学逻辑层（活力公式 + 开普勒第三定律发射窗口）
 * 灵感源自经典轨道力学互动实验 Hohmann Transfer。
 */

export type HohmannState = {
  deltaVKmS: number;   // 地球出发轨道切向点火速度增量 (-3.5 ~ +5.2 km/s)
  windowDeg: number;   // 发射瞬间目标行星相对地球的领先相位角 (-90° ~ +90°)
};

export type TransferSummary = {
  rTargetAu: number;
  semiMajorAu: number;
  aphelionOrPerihelionAu: number;
  transferYears: number;
  transferDays: number;
  targetSweepDeg: number;
  targetFinalDeg: number;
  angularErrorDeg: number;
  radialErrorAu: number;
};

export type HohmannLevel = {
  id: number;
  title: string;
  targetName: string;
  targetColor: string;
  targetRadiusAu: number;
  lockWindow?: boolean;
  story: string;
  dadTip: string;
  cheer: string;
  explain: string;
  start: HohmannState;
  radialTolAu: number;
  angleTolDeg: number;
  sampleSolution: HohmannState;
};

export const EARTH_SPEED_KMS = 29.78;

/**
 * 计算从 1.00 AU 地球圆轨道切向点火 Δv 后的霍曼转移椭圆参数与会合误差。
 * 飞船沿半个椭圆从 θ=0° 飞抵对侧拱点 θ=180°。
 */
export function computeHohmannTransfer(level: HohmannLevel, state: HohmannState): TransferSummary {
  const vDepart = EARTH_SPEED_KMS + state.deltaVKmS;
  const ratioSq = (vDepart / EARTH_SPEED_KMS) ** 2;
  // 活力公式 v²/v_E² = 2/r₁ - 1/a (r₁ = 1 AU) => 1/a = 2 - ratioSq
  const invA = Math.max(0.18, 2 - ratioSq);
  const semiMajorAu = 1 / invA;
  const apsisAu = Math.max(0.25, 2 * semiMajorAu - 1);

  // 开普勒第三定律：半椭圆飞行时间 t = 0.5 * a^(3/2) 年
  const transferYears = 0.5 * Math.pow(semiMajorAu, 1.5);
  const transferDays = Math.round(transferYears * 365.25);

  // 目标行星公转周期 T_target = r_target^(3/2) 年
  const targetPeriodYears = Math.pow(level.targetRadiusAu, 1.5);
  const targetSweepDeg = (transferYears / targetPeriodYears) * 360;
  const targetFinalDeg = state.windowDeg + targetSweepDeg;

  // 飞船抵达 θ = 180° 拱点时，目标行星与 180° 的夹角误差（折算到 -180..+180）
  let diff = ((targetFinalDeg - 180) % 360 + 540) % 360 - 180;
  const angularErrorDeg = Math.abs(diff);
  const radialErrorAu = Math.abs(apsisAu - level.targetRadiusAu);

  return {
    rTargetAu: level.targetRadiusAu,
    semiMajorAu,
    aphelionOrPerihelionAu: apsisAu,
    transferYears,
    transferDays,
    targetSweepDeg,
    targetFinalDeg,
    angularErrorDeg,
    radialErrorAu
  };
}

export function checkHohmannGoal(level: HohmannLevel, state: HohmannState): boolean {
  const res = computeHohmannTransfer(level, state);
  return res.radialErrorAu <= level.radialTolAu && res.angularErrorDeg <= level.angleTolDeg;
}

export const hohmannLevels: readonly HohmannLevel[] = [
  {
    id: 1,
    title: "点火够着火星轨道",
    targetName: "火星",
    targetColor: "#f97316",
    targetRadiusAu: 1.524,
    lockWindow: true,
    story: "天问探测器准备从 1.00 AU 的地球轨道奔向 1.52 AU 的火星！出发窗口已帮你锁在黄金 44°，请调节火箭点火加速量 Δv，让紫色椭圆轨道的远日点刚好搭上红色火星轨道！",
    dadTip: "点火太轻够不着火星，太猛又冲过头！把点火加速量调到 +2.9 ~ +3.0 km/s 之间试试！",
    cheer: "轨道严丝合缝！只靠地球边上一脚油门，飞船就滑行了 259 天精准摸到火星！",
    explain: "1925 年德国工程师霍曼发现最省燃料的星际航线不是直着冲，而是搭一条一头切地球、一头切火星的『霍曼转移椭圆』，一路靠太阳引力惯性滑行！",
    start: { deltaVKmS: 1.2, windowDeg: 44 },
    radialTolAu: 0.06,
    angleTolDeg: 12,
    sampleSolution: { deltaVKmS: 2.95, windowDeg: 44 }
  },
  {
    id: 2,
    title: "26 个月等一扇窗",
    targetName: "火星",
    targetColor: "#f97316",
    targetRadiusAu: 1.524,
    story: "为什么全世界的火星探测器都挤在每隔 26 个月才开一次的『发射窗口』扎堆升空？这次连火星出发时的领先角也交给你调，算好提前量，别等飞船到了火星却不在那儿！",
    dadTip: "飞船飞半圈要 259 天，这期间外圈慢吞吞的火星大约转过 136°！所以出发时火星必须提前在地球前方 +44° 左右（Δv 仍调 +2.95 km/s）！",
    cheer: "精准太空会师！飞船跨越上亿公里赶到对岸时，火星刚好笑眯眯地走到那儿接你！",
    explain: "飞船去对岸 180° 处会合，火星这段时间走了 136°，180° 减 136° 等于 44°！地球和火星每 780 天（约 26 个月）才会重新摆出一次 +44° 夹角，错过就得再等两年多！",
    start: { deltaVKmS: 2.95, windowDeg: -10 },
    radialTolAu: 0.07,
    angleTolDeg: 9,
    sampleSolution: { deltaVKmS: 2.95, windowDeg: 44 }
  },
  {
    id: 3,
    title: "刹车才能去金星",
    targetName: "金星",
    targetColor: "#facc15",
    targetRadiusAu: 0.723,
    story: "想飞往太阳内侧 0.72 AU 的金星，火箭应该往前加速，还是反向点火『踩刹车』？而且内圈的金星跑得比地球快得多，出发时它该在地球前面还是后面？",
    dadTip: "反直觉时刻：往内圈掉必须反向减速（Δv 约 -2.5 km/s）！金星公转飞快，146 天能跑 234°，所以出发时金星要落后地球 -54° 左右从后面追上来！",
    cheer: "哇！太空里踩一脚刹车居然往太阳怀里掉，身后的金星还一路狂奔追上来握手啦！",
    explain: "在轨道力学里，减速会让离心趋势小于太阳引力，飞船就会向内坠入更低的近日点椭圆；而内圈行星角速度更快，必须让它在起跑线后方追赶飞船！",
    start: { deltaVKmS: 1.0, windowDeg: 25 },
    radialTolAu: 0.05,
    angleTolDeg: 10,
    sampleSolution: { deltaVKmS: -2.5, windowDeg: -54 }
  },
  {
    id: 4,
    title: "远征小行星带",
    targetName: "灶神星",
    targetColor: "#38bdf8",
    targetRadiusAu: 2.0,
    story: "终极深空导航：前往距离太阳 2.00 AU 的小行星带探访灶神星！独立推算所需的更大点火速度 Δv 与更宽的发射提前角，一次成功交会！",
    dadTip: "目标在 2.00 AU，先把 Δv 推高到 +4.6 km/s 让椭圆远日点够着 2.00 AU；灶神星转得更慢，把领先窗口角调大到 +63° 左右！",
    cheer: "深空领航员诞生！跨越三亿公里准确泊入灶神星轨道！",
    explain: "无论去月球、金星、火星还是木星，人类深空探测器的第一课都是用活力公式定轨道大小、用开普勒第三定律掐准星际时钟！",
    start: { deltaVKmS: 2.4, windowDeg: 20 },
    radialTolAu: 0.08,
    angleTolDeg: 9,
    sampleSolution: { deltaVKmS: 4.6, windowDeg: 63 }
  }
];
