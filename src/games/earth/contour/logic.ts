export type ContourMode = "route" | "camp" | "valley" | "slice";

export type ContourOption = {
  id: string;
  label: string;
  riseMeters: number;
  runMeters: number;
  elevMeters: number;
  featureTag: string;
  feedback: string;
  /** Profile heights (0..550m) sampled left-to-right for the synchronized elevation view */
  profile: readonly number[];
};

export type ContourLevel = {
  id: number;
  title: string;
  mode: ContourMode;
  story: string;
  nianLine: string;
  hint: string;
  win: string;
  options: readonly ContourOption[];
  correctId: string;
  startElev: number;
  targetElev: number;
  tolElev: number;
};

/** 坡度百分比 = 垂直高差 / 水平距离 × 100%，保留 1 位小数。 */
export function slopePercent(deltaElevMeters: number, runMeters: number): number {
  if (runMeters <= 0) return 999;
  return Math.round((Math.abs(deltaElevMeters) / runMeters) * 1000) / 10;
}

/** 根据盘山渠切割海拔计算断面特征（双峰鞍部在 300m 处连通）。 */
export function canalSliceInfo(elevMeters: number): {
  loops: 1 | 2;
  saddleGapMeters: number;
  statusLabel: string;
} {
  if (elevMeters > 320) {
    return {
      loops: 2,
      saddleGapMeters: elevMeters - 300,
      statusLabel: "高于鞍部（断成东西两个孤立圈）"
    };
  }
  if (elevMeters < 280) {
    return {
      loops: 1,
      saddleGapMeters: 300 - elevMeters,
      statusLabel: "低于鞍部（绕山脚大圈，渠道过长）"
    };
  }
  return {
    loops: 1,
    saddleGapMeters: Math.abs(elevMeters - 300),
    statusLabel: "正切 300m 鞍部（双峰连通最省工！）"
  };
}

/** 校验玩家的路线/营地/山谷选择，或第 4 关的等高断面高度。 */
export function checkContourChoice(
  level: ContourLevel,
  choice: string | number,
  sliceElevMeters?: number
): boolean {
  if (level.mode === "slice") {
    const val = typeof sliceElevMeters === "number" ? sliceElevMeters : Number(choice);
    if (Number.isNaN(val)) return false;
    return Math.abs(val - level.targetElev) <= level.tolElev;
  }
  return String(choice) === level.correctId;
}

export const contourLevels: readonly ContourLevel[] = [
  {
    id: 1,
    title: "缓坡省力登顶",
    mode: "route",
    story:
      "小念和爸爸背着野餐包准备登上 520m 的翠微主峰！地图上有西、北、东三条步道，哪条『等高线最稀疏』、坡度最平缓安全？千万避开等高线挤在一起的陡崖！",
    nianLine: "爸爸你看！西边那几圈黑线全都叠在一块儿还长了小锯齿，那是悬崖峭壁吗？",
    hint: "同一幅等高线图上，相邻两条线高差都是 100m：线越密坡越陡，线越稀疏水平路程越长、坡度越缓！选东坡步道试试。",
    win: "稳稳登顶啦！东坡等高线间距最宽，坡度只有约 33.6%，连背着西瓜和保温壶都能轻松走上去！",
    correctId: "east",
    startElev: 200,
    targetElev: 300,
    tolElev: 20,
    options: [
      {
        id: "west",
        label: "🧗 西线 · 断崖直攀",
        riseMeters: 420,
        runMeters: 230,
        elevMeters: 520,
        featureTag: "等高线重合陡崖",
        feedback: "太险啦！西侧 200m~400m 等高线几乎重叠成锯齿状陡崖，坡度超过 180%，只有专业攀岩队才敢上！",
        profile: [100, 115, 390, 465, 520, 430, 300]
      },
      {
        id: "north",
        label: "🥾 北线 · 急陡山梁",
        riseMeters: 420,
        runMeters: 480,
        elevMeters: 520,
        featureTag: "等高线偏密急坡",
        feedback: "北线虽然没有绝壁，但等高线挤得很紧，坡度接近 88%，爬几步就气喘吁吁啦，再找找更稀疏的一侧！",
        profile: [100, 195, 310, 415, 485, 520, 460]
      },
      {
        id: "east",
        label: "🎒 东线 · 稀疏缓坡",
        riseMeters: 420,
        runMeters: 1250,
        elevMeters: 520,
        featureTag: "等高线最稀疏缓坡",
        feedback: "太会看地图啦！东坡等高线一圈圈舒展宽松，水平走 1250m 才升高 420m，平缓省力！",
        profile: [520, 460, 395, 325, 255, 180, 100]
      }
    ]
  },
  {
    id: 2,
    title: "两峰之间的鞍部露营",
    mode: "camp",
    story:
      "太阳快落山了，我们要在双峰地形图上挑一块既平坦开阔、又不怕落石和狂风的『鞍部』扎帐篷。快帮爸爸点出两座山峰之间形似马鞍的营地！",
    nianLine: "左边是 520m 主峰，右边是 430m 小峰，中间那块像马背坐垫一样平平的地方就是鞍部吧！",
    hint: "找左右两侧都是闭合山峰高地、上下南北两侧向外敞开下坡的十字平缓区——那就是海拔 300m 左右的『鞍部』营地！",
    win: "完美扎营！两座山峰夹着的鞍部地势平坦、视野开阔，还是翻越山脉最省力气的天然山口！",
    correctId: "saddle",
    startElev: 200,
    targetElev: 300,
    tolElev: 20,
    options: [
      {
        id: "peakA",
        label: "🚩 甲点 · 主峰尖顶 (520m)",
        riseMeters: 120,
        runMeters: 180,
        elevMeters: 520,
        featureTag: "闭合内圈最高点",
        feedback: "山顶四面受风、夜里温度又低，地方窄得帐篷地钉都扎不稳，往两峰中间挪一挪！",
        profile: [140, 360, 520, 360, 300, 430, 180]
      },
      {
        id: "saddle",
        label: "⛺ 乙点 · 双峰鞍部 (300m)",
        riseMeters: 20,
        runMeters: 260,
        elevMeters: 300,
        featureTag: "两峰之间马鞍平地",
        feedback: "选得真准！东西有双峰挡大风，脚下坡度不到 8%，正是教科书级的鞍部营地！",
        profile: [140, 380, 520, 300, 430, 290, 140]
      },
      {
        id: "cliffFoot",
        label: "⚠️ 丙点 · 西侧崖底 (130m)",
        riseMeters: 280,
        runMeters: 120,
        elevMeters: 130,
        featureTag: "重合陡崖正下方",
        feedback: "危险！丙点头顶就是等高线重叠的陡崖，刮风下雨容易掉碎石，野外露营一定要远离崖底！",
        profile: [110, 130, 440, 520, 310, 430, 160]
      }
    ]
  },
  {
    id: 3,
    title: "小溪流向哪条沟",
    mode: "valley",
    story:
      "水壶里的水快喝完啦！山坡上有三条弯曲的虚线，只有真正的『山谷』才会把两侧雨水汇聚成清澈山溪。记住地理口诀：凸高为谷，凸低为脊！",
    nianLine: "等高线弯弯的尖头朝向高海拔山顶的，是不是就像往山肚子里凹进去的一条水沟呀？",
    hint: "顺着每条虚线看等高线弯曲的尖头：尖头指向 400m、500m 高处的是『凸高为谷』（汇水成溪）；指向 100m 低处的是『凸低为脊』（分水山梁）！",
    win: "找到甘甜山泉啦！『凸高为谷』——沿同一水平线看，山谷中间比两边矮，雨水自然顺着两侧斜坡往谷底汇聚成溪流！",
    correctId: "valleyB",
    startElev: 200,
    targetElev: 300,
    tolElev: 20,
    options: [
      {
        id: "ridgeA",
        label: "🏔️ 甲线 · 等高线向低处凸",
        riseMeters: 300,
        runMeters: 620,
        elevMeters: 320,
        featureTag: "凸低为脊（分水岭）",
        feedback: "甲线的等高线弯向 100m 低海拔方向，这是高出来的『山脊』分水岭，雨水落上去会往两边流走，存不住小溪哦！",
        profile: [210, 275, 340, 360, 340, 275, 210]
      },
      {
        id: "valleyB",
        label: "💧 乙线 · 等高线向高处凸",
        riseMeters: 300,
        runMeters: 680,
        elevMeters: 240,
        featureTag: "凸高为谷（集水溪谷）",
        feedback: "哗啦啦——清泉就在乙线！等高线尖头向 500m 高处凸出，剖面呈凹槽 V 字形，两侧山坡的水全往这儿汇集！",
        profile: [360, 305, 255, 215, 255, 305, 360]
      },
      {
        id: "ridgeC",
        label: "🌲 丙线 · 东侧外凸支脉",
        riseMeters: 260,
        runMeters: 740,
        elevMeters: 290,
        featureTag: "凸低为脊（东支梁）",
        feedback: "丙线也是等高线往低海拔外鼓的山梁支脉，阳光好但没有溪水，找尖头朝向山顶凹进去的那条线吧！",
        profile: [190, 250, 305, 325, 305, 250, 190]
      }
    ]
  },
  {
    id: 4,
    title: "修建等高盘山渠",
    mode: "slice",
    story:
      "山脚果园想修一条水平自流的『等高盘山引水渠』，要求水渠在同一海拔高度刚好擦过两峰之间的鞍部，把主峰和次峰连成一圈！快调节水平断面高度切出目标剖面吧！",
    nianLine: "如果水渠修太高就会断成左右两个孤岛圈；修在鞍部高度 300m，就能像 8 字腰带一样一圈全贯通！",
    hint: "观察下方实时海拔剖面图：主峰高 520m，次峰高 430m，两峰之间的鞍部谷底正好在 300m！把断面滑块调到 280m ~ 320m。",
    win: "盘山渠贯通出水！古人修红旗渠与哈尼梯田水沟，就是顺着等高线精准卡住垭口鞍部高程，不用抽水机也能让山泉绕山自流！",
    correctId: "300",
    startElev: 420,
    targetElev: 300,
    tolElev: 20,
    options: []
  }
];
