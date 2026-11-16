export type FoehnStats = {
  seaTempC: number;
  dewPointC: number;
  peakMeters: number;
  /** 抬升凝结高度 LCL (m) */
  lclMeters: number;
  /** 是否在迎风坡达到露点成云致雨 */
  hasRain: boolean;
  /** 云雨层垂直厚度 (m) */
  cloudDepthMeters: number;
  /** 山顶气温 (°C) */
  peakTempC: number;
  /** 背风坡山脚气温 (°C) */
  leeTempC: number;
  /** 背风坡相对海风净升温 (°C) */
  foehnDeltaC: number;
  /** 迎风坡估算年地形雨量 (mm) */
  windwardRainMm: number;
  /** 翻越垭口后留存进背风盆地的相对水汽 (%) */
  basinMoisturePct: number;
};

export type RainLevel = {
  id: number;
  title: string;
  story: string;
  nianLine: string;
  hint: string;
  win: string;
  seaTempC: number;
  startDewC: number;
  startPeakM: number;
  goalLabel: string;
  mode: "make-rain" | "rain-shadow" | "foehn-heat" | "oasis-pass";
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * 地形雨与焚风效应绝热升降温物理模型：
 * - 未饱和干绝热直减率：1.0 °C / 100m
 * - 饱和湿绝热直减率：0.6 °C / 100m（水汽凝结释放潜热！）
 * - 背风坡水汽已拧干，全程按干绝热 +1.0 °C / 100m 下沉增温。
 */
export function computeFoehn(
  seaTempC: number,
  dewPointC: number,
  peakMeters: number
): FoehnStats {
  const effDew = Math.min(seaTempC, dewPointC);
  const peak = Math.max(200, peakMeters);
  const lclMeters = Math.round(Math.max(0, (seaTempC - effDew) * 100));

  if (peak <= lclMeters) {
    const peakTempC = round1(seaTempC - (peak / 100) * 1.0);
    const leeTempC = round1(peakTempC + (peak / 100) * 1.0);
    const baseHumidity = Math.round(Math.max(25, Math.min(95, 100 - (seaTempC - effDew) * 4.5)));
    return {
      seaTempC,
      dewPointC: effDew,
      peakMeters: peak,
      lclMeters,
      hasRain: false,
      cloudDepthMeters: 0,
      peakTempC,
      leeTempC,
      foehnDeltaC: round1(leeTempC - seaTempC),
      windwardRainMm: 0,
      basinMoisturePct: baseHumidity
    };
  }

  const cloudDepthMeters = peak - lclMeters;
  const peakTempC = round1(effDew - (cloudDepthMeters / 100) * 0.6);
  const leeTempC = round1(peakTempC + (peak / 100) * 1.0);
  const foehnDeltaC = round1(leeTempC - seaTempC);
  const windwardRainMm = Math.round(cloudDepthMeters * 0.95);
  const startHumidity = Math.max(30, Math.min(95, 100 - (seaTempC - effDew) * 4.2));
  const wrungLoss = cloudDepthMeters * 0.032;
  const basinMoisturePct = Math.round(Math.max(8, Math.min(90, startHumidity - wrungLoss)));

  return {
    seaTempC,
    dewPointC: effDew,
    peakMeters: peak,
    lclMeters,
    hasRain: true,
    cloudDepthMeters,
    peakTempC,
    leeTempC,
    foehnDeltaC,
    windwardRainMm,
    basinMoisturePct
  };
}

/** 检验当前露点与山脉高度是否满足本关气候目标。 */
export function checkRainGoal(
  level: RainLevel,
  seaTempC: number,
  dewPointC: number,
  peakMeters: number
): boolean {
  const s = computeFoehn(seaTempC, dewPointC, peakMeters);
  switch (level.mode) {
    case "make-rain":
      return s.hasRain && s.windwardRainMm >= 450;
    case "rain-shadow":
      return s.windwardRainMm >= 1200 && s.basinMoisturePct <= 28;
    case "foehn-heat":
      return s.leeTempC >= 27;
    case "oasis-pass":
      return s.hasRain && s.windwardRainMm >= 150 && s.basinMoisturePct >= 52 && s.leeTempC <= 23.6;
  }
}

export const rainLevels: readonly RainLevel[] = [
  {
    id: 1,
    title: "矮丘无雨过境",
    seaTempC: 20,
    startDewC: 10,
    startPeakM: 700,
    mode: "make-rain",
    goalLabel: "迎风坡凝结成云，年地形雨 ≥ 450 mm",
    story:
      "20°C 的海风吹上 700m 的矮丘，每爬升 100m 降温 1.0°C，到山顶才降到 13°C——还没冷到 10°C 露点就翻下山去了，一滴雨也没下！快抬高山峰或增加水汽，滋润半山腰的云雾茶园！",
    nianLine: "原来空气像一块湿海绵，必须爬到够冷的『凝结高度』才会挤出云朵和雨滴呀！",
    hint: "海风 20°C、露点 10°C 时，抬升凝结高度 LCL = (20−10)×100 = 1000m！把山峰海拔调到 1500m 以上（或调高露点温度），云雨立刻降临！",
    win: "云雾茶园喝饱雨水啦！台湾阿里山和武夷山的迎风山腰终年云雾缭绕出好茶，靠的就是地形抬升凝结！"
  },
  {
    id: 2,
    title: "迎风翠绿背风荒漠",
    seaTempC: 20,
    startDewC: 9,
    startPeakM: 1200,
    mode: "rain-shadow",
    goalLabel: "迎风坡雨量 ≥ 1200 mm 且背风坡水汽 ≤ 28%",
    story:
      "同一座雄伟山脉，为什么西坡长满参天阔叶林，翻过山脊的东坡却成了仙人掌与砾石戈壁？请调出对比鲜明的『迎风坡暴雨 + 背风坡雨影荒漠』！",
    nianLine: "大山像一堵高高的挡雨墙，把海风里的水分全截留在迎风坡了！",
    hint: "把海洋露点调高到 12~15°C（水汽充沛），再把山峰海拔拉高到 2600m ~ 3300m，把云层水汽彻底拧干在迎风坡！",
    win: "经典雨影效应成了！南美安第斯山脉西坡森林茂密，东侧巴塔哥尼亚高原却干旱少雨，全都是山脉拦截水汽的杰作！"
  },
  {
    id: 3,
    title: "阿尔卑斯干热焚风",
    seaTempC: 20,
    startDewC: 8,
    startPeakM: 1500,
    mode: "foehn-heat",
    goalLabel: "背风坡山脚吹出 ≥ 27.0 °C 干热焚风",
    story:
      "神奇物理谜题：20°C 的海风翻过 3000m 大山，为什么吹到背风坡山脚小镇竟然变成了 28°C 的滚烫『焚风』？秘密就在成云降雨时每 100m 只降 0.6°C（水汽凝结放热），下山却每 100m 狂升 1.0°C！亲手调出 ≥ 27°C 的焚风吧！",
    nianLine: "上山湿着走每百米少凉 0.4°C，下山干着走每百米全热回来，里外里就凭空赚了好几度热浪！",
    hint: "把山峰升到 3000m ~ 3500m，同时把海洋露点调到 10°C ~ 15°C（让迎风坡尽早进入 0.6°C/100m 湿绝热爬升），背风坡立刻突破 27°C！",
    win: "27°C+ 干热焚风现身！阿尔卑斯山和太行山东麓石家庄常在春天吹起焚风，一天之内气温猛蹿十来度，连山顶积雪都能瞬间吹化！"
  },
  {
    id: 4,
    title: "留住水汽进盆地",
    seaTempC: 20,
    startDewC: 14,
    startPeakM: 3300,
    mode: "oasis-pass",
    goalLabel: "垭口有雨 (≥ 150mm) 且盆地水汽 ≥ 52%、气温 ≤ 23.6°C",
    story:
      "3300m 的高墙把盆地堵得滴水不进！幸好山脉往往留有较低的天然缺口（如伊犁河谷山口）。请把山口高度降到合理区间，既在山口留下一场润泽小雨，又让过半湿润海风穿过垭口滋养内陆绿洲！",
    nianLine: "山不能太矮（不然一点雨不下），也不能太高（把水全拧干了），要找刚刚好的山口高度！",
    hint: "保持海洋露点在 13°C ~ 16°C，把山峰（山口）高度降到 900m ~ 1400m 左右，让云层薄薄下一点雨，大部分水汽就能溜进盆地滋润绿洲啦！",
    win: "塞外江南诞生啦！新疆伊犁河谷正是朝着大西洋暖湿西风敞开怀抱的喇叭口山地，才在万里内陆孕育出大片薰衣草田与草原绿洲！"
  }
];
