export type QuakeConfig = {
  quakeHz: number;
  secondaryQuakeHz?: number;
  groundMotionCm: number;
  baseBuildingHz: number;
  /** 斜撑刚度增强百分比 0..100 */
  bracingPct: number;
  /** 地基叠层橡胶隔震支座开关 */
  baseIsolated: boolean;
  /** 结构附加阻尼比 0.04..0.24 */
  dampingRatio: number;
  /** 顶楼黄金调谐质量阻尼球（TMD）开关 */
  tmdEnabled: boolean;
  /** 顶楼黄金阻尼球调谐摆频 0.4..2.4 Hz */
  tmdHz: number;
};

export type QuakeLevel = {
  id: number;
  title: string;
  limitCm: number;
  minReductionPct?: number;
  controls: {
    bracing?: boolean;
    isolator?: boolean;
    damping?: boolean;
    tmd?: boolean;
  };
  initial: QuakeConfig;
  story: string;
  hint: string;
  win: string;
};

export type QuakeSafetyResult = {
  safe: boolean;
  swayCm: number;
  baselineSwayCm: number;
  limitCm: number;
  buildingHz: number;
  reductionPct: number;
  resonanceWarning: boolean;
};

/** 计算考虑斜撑刚度与隔震支座后的大楼一阶固有频率（Hz）。 */
export function effectiveBuildingHz(config: QuakeConfig): number {
  const stiffFactor = Math.sqrt(1 + 1.35 * (Math.max(0, Math.min(100, config.bracingPct)) / 100));
  const isoFactor = config.baseIsolated ? 0.42 : 1.0;
  return Math.round(config.baseBuildingHz * stiffFactor * isoFactor * 100) / 100;
}

function singleWaveSwayCm(freqHz: number, motionCm: number, config: QuakeConfig, fBldg: number): number {
  const r = freqHz / Math.max(0.15, fBldg);
  const zeta = Math.max(0.03, config.dampingRatio) + (config.baseIsolated ? 0.13 : 0);

  // 受迫振动动力放大系数
  const denom = Math.sqrt((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
  const daf = (r * r) / Math.max(0.05, denom);

  // 叠层橡胶隔震垫将大部分位移集中在地下隔震层，上部楼体层间变形大幅衰减
  const superIsoScale = config.baseIsolated ? 0.34 : 1.0;

  // 台北101式调谐质量阻尼球（TMD）：摆频对准激励频率时反相摆动抽走振动能量
  let tmdFactor = 1.0;
  if (config.tmdEnabled) {
    const detune = (config.tmdHz - freqHz) / 0.12;
    tmdFactor = 1 - 0.78 * Math.exp(-(detune * detune));
  }

  return motionCm * daf * superIsoScale * tmdFactor;
}

/**
 * 计算摩天楼顶层峰值摇晃幅度（cm）。
 * 若存在双频地震波，按工程抗震 SRSS（平方和开方）合成峰值响应。
 */
export function swayAmplitudeCm(config: QuakeConfig): number {
  const fBldg = effectiveBuildingHz(config);
  const primary = singleWaveSwayCm(config.quakeHz, config.groundMotionCm, config, fBldg);

  let total = primary;
  if (typeof config.secondaryQuakeHz === "number" && config.secondaryQuakeHz > 0) {
    const secondary = singleWaveSwayCm(
      config.secondaryQuakeHz,
      config.groundMotionCm * 0.82,
      config,
      fBldg
    );
    total = Math.sqrt(primary * primary + secondary * secondary);
  }

  return Math.round(total * 10) / 10;
}

export function checkQuakeSafety(level: QuakeLevel, config: QuakeConfig): QuakeSafetyResult {
  const buildingHz = effectiveBuildingHz(config);
  const swayCm = swayAmplitudeCm(config);
  const baselineSwayCm = swayAmplitudeCm(level.initial);
  const reductionPct =
    baselineSwayCm > 0 ? Math.max(0, Math.round(((baselineSwayCm - swayCm) / baselineSwayCm) * 100)) : 0;

  const nearPrimary = Math.abs(buildingHz - config.quakeHz) <= 0.15;
  const nearSecondary =
    typeof config.secondaryQuakeHz === "number" &&
    Math.abs(buildingHz - config.secondaryQuakeHz) <= 0.15;
  const resonanceWarning = (nearPrimary || nearSecondary) && swayCm > level.limitCm;

  const meetsReduction =
    typeof level.minReductionPct === "number" ? reductionPct >= level.minReductionPct : true;
  const safe = swayCm <= level.limitCm && meetsReduction;

  return {
    safe,
    swayCm,
    baselineSwayCm,
    limitCm: level.limitCm,
    buildingHz,
    reductionPct,
    resonanceWarning
  };
}

export const quakeLevels: readonly QuakeLevel[] = [
  {
    id: 1,
    title: "躲开共振频率",
    limitCm: 22,
    controls: { bracing: true, isolator: true },
    initial: {
      quakeHz: 2.0,
      groundMotionCm: 6.2,
      baseBuildingHz: 2.0,
      bracingPct: 0,
      baseIsolated: false,
      dampingRatio: 0.05,
      tmdEnabled: false,
      tmdHz: 1.2
    },
    story: "警报！这栋多层石楼的固有频率恰好是 2.0 Hz，正撞上 2.0 Hz 的高频岩石地震波，发生剧烈『共振』（摆幅高达 62 cm）！快错开固有频率把楼顶摆幅降到 ≤ 22 cm！",
    hint: "就像推秋千踩准节奏会越荡越高一样，只要改掉大楼固有频率就能破除共振！你可以开启『叠层橡胶隔震垫』把频率降到 0.84 Hz，或者拉满『钢斜撑刚度』把频率升到 3.0 Hz 以上！",
    win: "成功避开共振峰！1985 年墨西哥城大地震中，矮房和超高层都安然无恙，唯独固有频率撞上地震波的中高层剧烈摇晃——错开频率就是第一道保命符！"
  },
  {
    id: 2,
    title: "台北 101 黄金阻尼球",
    limitCm: 20,
    minReductionPct: 70,
    controls: { tmd: true },
    initial: {
      quakeHz: 0.8,
      groundMotionCm: 6.8,
      baseBuildingHz: 0.8,
      bracingPct: 0,
      baseIsolated: false,
      dampingRatio: 0.05,
      tmdEnabled: true,
      tmdHz: 1.8
    },
    story: "508 米超高层摩天楼天生柔软（固有频率 0.80 Hz），正遭遇 0.80 Hz 强台风与长周期地震波！调节顶楼 660 吨『黄金风阻尼球』摆频，把摇晃幅度压低 70% 以上（≤ 20 cm）！",
    hint: "阻尼球必须和大楼『同频反相』才能吃掉摇晃能量！把阻尼球调谐频率滑块精准拉到 0.78 ~ 0.82 Hz，看金球向反方向甩动稳住整座大厦！",
    win: "反相消振太神啦！台北 101 大厦 87~92 楼真的悬挂着一颗直径 5.5 米、重 660 吨的金色大钢球，大楼往左晃它就往右拽，瞬间吸走七成以上摆幅！"
  },
  {
    id: 3,
    title: "橡胶隔震支座",
    limitCm: 12,
    controls: { isolator: true, damping: true },
    initial: {
      quakeHz: 1.8,
      groundMotionCm: 7.5,
      baseBuildingHz: 1.8,
      bracingPct: 0,
      baseIsolated: false,
      dampingRatio: 0.04,
      tmdEnabled: false,
      tmdHz: 1.0
    },
    story: "急救医院手术室里有精密显微镜，楼顶摆幅必须严控在 ≤ 12 cm 以内！面对 1.80 Hz 猛烈强震，快开启地基『叠层橡胶隔震垫』并加大黏滞阻尼比吧！",
    hint: "先把『叠层橡胶隔震支座』开关点成开启（让地面自己左右滑，不带着大楼一起猛甩），再把『黏滞阻尼器阻尼比』调高到 0.14 以上即可稳如平地！",
    win: "手术台上的水杯都没洒！现代机场航站楼、博物馆和医院地基下都垫着几十块钢板夹橡胶的『隔震支座』，把地震硬生生挡在脚底板下面！"
  },
  {
    id: 4,
    title: "双频大地震考验",
    limitCm: 18,
    controls: { bracing: true, tmd: true },
    initial: {
      quakeHz: 0.9,
      secondaryQuakeHz: 1.75,
      groundMotionCm: 5.8,
      baseBuildingHz: 0.9,
      bracingPct: 0,
      baseIsolated: false,
      dampingRatio: 0.06,
      tmdEnabled: true,
      tmdHz: 1.5
    },
    story: "终极复合强震来袭！地底同时传来 0.90 Hz 主震波与 1.75 Hz 次生高频波！岩石地基无法加隔震垫，请联调『斜撑刚度』与『黄金阻尼球频率』，把最大位移压进 ≤ 18 cm！",
    hint: "两头夹击怎么办？第一步调斜撑刚度到 55% ~ 70%，让大楼固有频率停在约 1.20 ~ 1.25 Hz（刚好躲在 0.90 Hz 和 1.75 Hz 两个震峰正中间的安全谷底！）；第二步把阻尼球摆频对准 0.90 Hz（或 1.75 Hz）吸走残余震波！",
    win: "抗震大师满星通关！上海中心大厦与东京晴空塔正是结合了巨型斜撑外框与顶层阻尼系统，哪怕台风与强震双双来袭也能泰然屹立！"
  }
];
