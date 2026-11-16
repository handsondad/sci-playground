export type PlanetRef = {
  name: string;
  au: number;
  color: string;
  radiusPx: number;
};

export const INNER_PLANETS: readonly PlanetRef[] = [
  { name: "水星", au: 0.39, color: "#94a3b8", radiusPx: 4 },
  { name: "金星", au: 0.72, color: "#f59e0b", radiusPx: 5.5 },
  { name: "地球", au: 1.0, color: "#38bdf8", radiusPx: 6 },
  { name: "火星", au: 1.52, color: "#ef4444", radiusPx: 5 }
];

export type KeplerLevel = {
  id: number;
  title: string;
  startAu: number;
  targetYears: number;
  tolYears: number;
  story: string;
  hint: string;
  win: string;
};

/** 开普勒第三定律：T(地球年) = a(AU)^(3/2)。 */
export function periodYears(au: number): number {
  return Math.pow(Math.max(0.1, au), 1.5);
}

export function periodDays(au: number): number {
  return Math.round(periodYears(au) * 365.25);
}

export function matchesOrbit(au: number, targetYears: number, tolYears: number): boolean {
  return Math.abs(periodYears(au) - targetYears) <= tolYears;
}

export const keplerLevels: readonly KeplerLevel[] = [
  {
    id: 1,
    title: "追上快脚水星",
    startAu: 1.15,
    targetYears: 0.24,
    tolYears: 0.04,
    story: "离太阳越近，引力越强、跑得越急、圈子也越小！把『太阳帆探测器』收进内圈，调到公转一圈只需约 88 天（0.24 地球年）的水星轨道伴飞吧！",
    hint: "水星离太阳只有约 0.39 AU（不到地球轨道半径的四成）！把轨道半径滑块调到 0.38 ~ 0.40 AU 验证。",
    win: "追上水星啦！地球刚过完一个春天，水星已经火急火燎地绕太阳跑完一整年了！"
  },
  {
    id: 2,
    title: "红色火星伴飞",
    startAu: 0.8,
    targetYears: 1.88,
    tolYears: 0.09,
    story: "祝融号与天问一号要去探访火星！火星的一年差不多相当于地球的 1.88 年（约 687 天），请把探测器推到火星轨道半径上同步运行。",
    hint: "看着星空图上的红色火星虚线环，把轨道半径推到 1.50 ~ 1.55 AU 左右，周期就会对准 687 天！",
    win: "成功泊入火星轨道！火星离太阳只有地球的 1.52 倍远，但因为路更长、跑得又更慢，一年足足有 687 天！"
  },
  {
    id: 3,
    title: "两年一圈共振轨",
    startAu: 2.0,
    targetYears: 2.0,
    tolYears: 0.08,
    story: "开普勒第三定律大考验：想让探测器刚好每【2.00 个地球年（730 天）】绕太阳一圈，小念猜轨道半径是 2.00 AU，结果慢得要 2.83 年！真正的半径是多少？",
    hint: "开普勒发现 T² = a³！既然周期 T=2 年，那么 T²=4，轨道半径 a 应该等于 4 开三次方（∛4 ≈ 1.59 AU）！调到 1.58 ~ 1.60 AU 试试！",
    win: "T² = a³ 完美应验！1.59³ ≈ 4.02 = 2.00²！开普勒算了整整十年第谷的观星账本，才从火星轨道里挖出这条宇宙铁律！"
  },
  {
    id: 4,
    title: "小行星带前哨",
    startAu: 1.0,
    targetYears: 2.83,
    tolYears: 0.12,
    story: "最后一站前往火星外侧的小行星带边缘！找一条公转周期大约为 2.83 地球年（约 1033 天）的巡天轨道驻守吧！",
    hint: "还记得刚才 2.00 AU 算出来的周期吗？2³ = 8，√8 ≈ 2.83 年！把轨道半径调到 2.00 AU 就正中靶心！",
    win: "深空前哨就位！从水星到海王星，甚至银河系外围绕恒星转的系外行星，全都乖乖遵守同一条开普勒第三定律！"
  }
];
