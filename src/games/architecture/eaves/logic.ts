export type EavesLevel = {
  id: number;
  title: string;
  city: string;
  summerAngleDeg: number;
  winterAngleDeg: number;
  windowTopDrop: number;
  windowHeight: number;
  startEaveMeters: number;
  hasSkylight?: boolean;
  startLouverDeg?: number;
  /** 夏至正午允许照进窗户的最大阳光占比（百分比 0..100） */
  maxSummerSunPct: number;
  /** 冬至正午需要照进窗户的最小阳光占比（百分比 0..100） */
  minWinterSunPct: number;
  /** 若有天窗：夏至天窗最大直射占比 & 冬至天窗最小直射占比 */
  maxSkylightSummerPct?: number;
  minSkylightWinterPct?: number;
  story: string;
  hint: string;
  win: string;
};

export type EavesCheckResult = {
  passed: boolean;
  summerSunPct: number;
  summerShadePct: number;
  winterSunPct: number;
  skylightSummerPct: number;
  skylightWinterPct: number;
  summerOk: boolean;
  winterOk: boolean;
  skylightOk: boolean;
};

/**
 * 被动式太阳房挑檐几何光学计算：
 * 挑檐水平伸出 eaveMeters，太阳仰角 sunAngleDeg（0°..90°），
 * 屋檐阴影投射在南墙上的竖直下落深度 z_shadow = eaveMeters * tan(sunAngleDeg)。
 * 窗户位于屋檐下方 [windowTopDrop, windowTopDrop + windowHeight]，返回窗户受阳光照射比例 [0..1]。
 */
export function windowSunFraction(
  sunAngleDeg: number,
  eaveMeters: number,
  windowTopDrop: number,
  windowHeight: number
): number {
  if (windowHeight <= 0) return 0;
  const clampedDeg = Math.max(1, Math.min(89, sunAngleDeg));
  const eave = Math.max(0, eaveMeters);
  const rad = (clampedDeg * Math.PI) / 180;
  const shadowDrop = eave * Math.tan(rad);

  const winTop = Math.max(0, windowTopDrop);
  const winBot = winTop + windowHeight;

  const litTop = Math.max(winTop, shadowDrop);
  const litHeight = Math.max(0, Math.min(winBot, winBot) - Math.min(winBot, litTop));
  return Math.max(0, Math.min(1, litHeight / windowHeight));
}

/**
 * 屋顶天窗遮阳百叶透光比例 [0..1]：
 * 百叶遮挡临界仰角为 louverCutoffDeg，当太阳仰角 >= louverCutoffDeg 时直射烈日被完全挡住；
 * 当太阳仰角 < louverCutoffDeg 时，斜射冬阳按正切孔径比穿过百叶温暖书房。
 */
export function skylightSunFraction(sunAngleDeg: number, louverCutoffDeg: number): number {
  const alpha = Math.max(1, Math.min(89, sunAngleDeg));
  const cutoff = Math.max(15, Math.min(85, louverCutoffDeg));
  if (alpha >= cutoff) return 0;
  const ratio = Math.tan((alpha * Math.PI) / 180) / Math.tan((cutoff * Math.PI) / 180);
  return Math.max(0, Math.min(1, 1 - ratio));
}

export function checkEavesGoal(
  level: EavesLevel,
  eaveMeters: number,
  louverDeg: number = level.startLouverDeg ?? 60
): EavesCheckResult {
  const summerFrac = windowSunFraction(
    level.summerAngleDeg,
    eaveMeters,
    level.windowTopDrop,
    level.windowHeight
  );
  const winterFrac = windowSunFraction(
    level.winterAngleDeg,
    eaveMeters,
    level.windowTopDrop,
    level.windowHeight
  );

  const summerSunPct = Math.round(summerFrac * 100);
  const summerShadePct = 100 - summerSunPct;
  const winterSunPct = Math.round(winterFrac * 100);

  const summerOk = summerSunPct <= level.maxSummerSunPct;
  const winterOk = winterSunPct >= level.minWinterSunPct;

  let skylightSummerPct = 0;
  let skylightWinterPct = 100;
  let skylightOk = true;

  if (level.hasSkylight) {
    skylightSummerPct = Math.round(skylightSunFraction(level.summerAngleDeg, louverDeg) * 100);
    skylightWinterPct = Math.round(skylightSunFraction(level.winterAngleDeg, louverDeg) * 100);
    const maxSkySum = level.maxSkylightSummerPct ?? 0;
    const minSkyWin = level.minSkylightWinterPct ?? 45;
    skylightOk = skylightSummerPct <= maxSkySum && skylightWinterPct >= minSkyWin;
  }

  return {
    passed: summerOk && winterOk && skylightOk,
    summerSunPct,
    summerShadePct,
    winterSunPct,
    skylightSummerPct,
    skylightWinterPct,
    summerOk,
    winterOk,
    skylightOk
  };
}

export const eavesLevels: readonly EavesLevel[] = [
  {
    id: 1,
    title: "夏至遮烈日",
    city: "中原古建（北纬 37°）",
    summerAngleDeg: 74,
    winterAngleDeg: 27,
    windowTopDrop: 0.05,
    windowHeight: 2.55,
    startEaveMeters: 0.3,
    maxSummerSunPct: 0,
    minWinterSunPct: 0,
    story: "盛夏正午太阳高悬头顶（仰角 74°），火辣辣的阳光直射进南窗像蒸笼一样！请拉长屋檐挑出长度，把夏至 74° 酷暑烈日 100% 挡在南窗玻璃外！",
    hint: "太阳仰角 74° 很陡（tan74° ≈ 3.49），屋檐每往外伸 0.75 米以上，投下的影子就能遮住整扇 2.6 米高的南窗！把挑檐调到 ≥ 0.75m 试试！",
    win: "屋里一下子阴凉了！中国古建筑的大屋顶向外出挑，不需要一度电，光靠屋檐阴影就能在三伏天给南墙和木窗撑起大阳伞！"
  },
  {
    id: 2,
    title: "冬至迎暖阳",
    city: "北京四合院（北纬 40°）",
    summerAngleDeg: 74,
    winterAngleDeg: 27,
    windowTopDrop: 0.05,
    windowHeight: 2.55,
    startEaveMeters: 2.0,
    maxSummerSunPct: 0,
    minWinterSunPct: 75,
    story: "刚才小念一口气把屋檐伸出 2.0 米，夏天是凉快了，可冬天正午低矮的暖阳（27°）也被挡掉一大半！快把挑檐收回黄金区间，做到夏天 100% 遮阴、冬天 ≥ 75% 阳光洒满屋！",
    hint: "把挑檐长度收回 0.75m ~ 1.05m 黄金区间：高高的 74° 夏日阳光照样一缕都进不来，而低矮斜射的 27° 冬日暖阳却能从屋檐底下钻进满屋地板！",
    win: "冬暖夏凉的古人智慧！故宫太和殿与北方四合院的挑檐尺寸经过千年摸索：夏至正午影子刚好盖到门槛，冬至正午阳光一直铺到屋深处暖炕上！"
  },
  {
    id: 3,
    title: "高纬度北国木屋",
    city: "哈尔滨被动房（北纬 46°）",
    summerAngleDeg: 67.5,
    winterAngleDeg: 20.5,
    windowTopDrop: 0.1,
    windowHeight: 2.0,
    startEaveMeters: 0.55,
    maxSummerSunPct: 0,
    minWinterSunPct: 80,
    story: "往北来到北纬 46° 的哈尔滨！这里的太阳无论冬夏都更低（夏至 67.5°、冬至仅 20.5°）。原来的短屋檐遮不住夏阳了，快为北国木屋重新算出黄金挑檐深度！",
    hint: "因为夏至太阳变低了（tan67.5° ≈ 2.41），屋檐要比北京再稍微长一点才能遮满 2.1 米窗底：把挑檐调到 0.90m ~ 1.30m 之间，就能夏天 100% 遮阳、冬天 ≥ 80% 迎光！",
    win: "因地制宜算得太准啦！不同纬度的太阳高度角完全不同，建筑师画图纸前第一件事就是查当地纬度的冬夏太阳轨迹图！"
  },
  {
    id: 4,
    title: "天窗采光书房",
    city: "江南现代太阳能书院",
    summerAngleDeg: 74,
    winterAngleDeg: 27,
    windowTopDrop: 0.15,
    windowHeight: 2.15,
    startEaveMeters: 0.35,
    hasSkylight: true,
    startLouverDeg: 82,
    maxSummerSunPct: 0,
    minWinterSunPct: 80,
    maxSkylightSummerPct: 0,
    minSkylightWinterPct: 50,
    story: "这间节能书房既有落地南窗，屋顶还开了采光天窗！请同时调好『南窗挑檐长度』与『天窗遮阳百叶临界角』，让南窗和天窗在夏天 0 直射暴晒、冬天暖阳充足！",
    hint: "两步搞定：① 南窗挑檐调到 0.70m ~ 1.00m（夏天 100% 遮阴、冬天 ≥ 80% 进光）；② 天窗百叶遮阳角调到 55° ~ 72° 之间（比夏至 74° 小所以挡住烈日，比冬至 27° 大所以放进一半以上冬阳）！",
    win: "零能耗被动式建筑大师！不用空调暖气硬扛，顺应四季太阳高度角做对屋檐与遮阳百叶，房子自己就会『夏天打伞、冬天晒背』！"
  }
];
