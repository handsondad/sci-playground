/**
 * 「地球温室调温器」纯大气物理逻辑层（行星短波吸收 = 长波红外辐射平衡 + 反照率反馈）
 * 灵感致敬 PhET Greenhouse Effect。
 */

export type GreenhouseState = {
  co2Ppm: number; // 温室气体当量浓度 0 ~ 900 ppm
  albedo: number; // 行星地表与云层反照率 0.12 ~ 0.65
};

export type ClimateReadout = {
  solarInWM2: number;
  reflectedWM2: number;
  absorbedWM2: number;
  greenhouseFactor: number;
  surfaceTempK: number;
  surfaceTempC: number;
  climateZone: "frozen" | "cool" | "habitable" | "hot";
};

export type GreenhouseLevel = {
  id: number;
  title: string;
  solarMultiplier: number; // 太阳常数倍率（现代=1.0，远古年轻太阳=0.82）
  lockAlbedo?: boolean;
  lockCo2?: boolean;
  maxCo2Ppm?: number;
  minTempC: number;
  maxTempC: number;
  story: string;
  dadTip: string;
  cheer: string;
  explain: string;
  start: GreenhouseState;
  sampleSolution: GreenhouseState;
};

export const SOLAR_AVG_WM2 = 340; // S₀ / 4 = 1360 / 4 W/m²
export const STEFAN_BOLTZMANN = 5.670374e-8; // W/(m²·K⁴)

/**
 * 计算行星辐射平衡地表平均温度：
 * - 当 co2Ppm = 0, albedo = 0.30, solarMultiplier = 1.0 时：T_s ≈ -18.6°C（无温室效应裸岩地球）
 * - 当 co2Ppm = 280, albedo = 0.30, solarMultiplier = 1.0 时：T_s ≈ +14.2°C（工业革命前宜居地球）
 */
export function computeClimate(solarMultiplier: number, state: GreenhouseState): ClimateReadout {
  const solarInWM2 = SOLAR_AVG_WM2 * solarMultiplier;
  const reflectedWM2 = solarInWM2 * state.albedo;
  const absorbedWM2 = solarInWM2 - reflectedWM2;

  // 对数型红外光学厚度增温因子（体现 CO₂ 红外吸收带对数饱和律与基础水汽耦合）
  const greenhouseFactor =
    state.co2Ppm <= 0
      ? 0
      : 0.625 * (Math.log(1 + state.co2Ppm / 40) / Math.log(1 + 280 / 40));

  const surfaceUpwardIR = absorbedWM2 * (1 + greenhouseFactor);
  const surfaceTempK = Math.pow(Math.max(1, surfaceUpwardIR) / STEFAN_BOLTZMANN, 0.25);
  const surfaceTempC = +(surfaceTempK - 273.15).toFixed(1);

  const climateZone =
    surfaceTempC < 0
      ? "frozen"
      : surfaceTempC < 12
        ? "cool"
        : surfaceTempC <= 16.5
          ? "habitable"
          : "hot";

  return {
    solarInWM2,
    reflectedWM2,
    absorbedWM2,
    greenhouseFactor,
    surfaceTempK,
    surfaceTempC,
    climateZone
  };
}

export function checkGreenhouseGoal(level: GreenhouseLevel, state: GreenhouseState): boolean {
  if (level.maxCo2Ppm !== undefined && state.co2Ppm > level.maxCo2Ppm) return false;
  const res = computeClimate(level.solarMultiplier, state);
  return res.surfaceTempC >= level.minTempC && res.surfaceTempC <= level.maxTempC;
}

export const greenhouseLevels: readonly GreenhouseLevel[] = [
  {
    id: 1,
    title: "给冰冻地球盖上薄棉被",
    solarMultiplier: 1.0,
    lockAlbedo: true,
    minTempC: 13.5,
    maxTempC: 15.2,
    story: "如果把地球大气里的温室气体全部抽空（0 ppm），哪怕阳光照常照射，地球平均气温也会跌到零下 18.6°C 冻成冰球！请调出恰当的天然温室浓度，让地球回到 13.5°C ~ 15.2°C 的春天！",
    dadTip: "工业革命前地球天然 CO₂ 浓度大约在 270 ~ 310 ppm 之间！慢慢拨动滑块看红外热量箭头被留住多少！",
    cheer: "冰雪融化、万物复苏！原来适度的天然温室效应是地球生命的救命薄棉被！",
    explain: "太阳短波可见光能轻松穿过大气晒热地面，地面向外散发长波红外热辐射时，水汽与二氧化碳就像一层透光棉被把一部分热量回射地面，替地球留住了宝贵的 33°C 温暖！",
    start: { co2Ppm: 0, albedo: 0.30 },
    sampleSolution: { co2Ppm: 280, albedo: 0.30 }
  },
  {
    id: 2,
    title: "白雪镜面与反照率危机",
    solarMultiplier: 1.0,
    lockCo2: true,
    minTempC: 13.5,
    maxTempC: 15.2,
    story: "远古冰河期大冰盖铺满大陆，亮白冰雪把 60% 阳光像照镜子一样直接反射回太空（反照率 0.60），地球跌到了零下 22°C！请恢复森林、海洋与冰盖的平衡反照率，让气温重回 13.5°C ~ 15.2°C！",
    dadTip: "反照率越高越冷、越低越热！现代地球云层+海洋+冰雪的平均反照率大约在 0.29 ~ 0.31 左右！",
    cheer: "阳光重新被深蓝海洋拥抱，全球均温稳稳回归 +14°C 宜居带！",
    explain: "这就是气候学著名的『冰雪—反照率正反馈』：冰越多→反射阳光越多→地球越冷→结更多冰；反过来两极海冰融化露出深色海水，又会吸收更多热量加速变暖！",
    start: { co2Ppm: 280, albedo: 0.60 },
    sampleSolution: { co2Ppm: 280, albedo: 0.30 }
  },
  {
    id: 3,
    title: "暗淡年轻太阳之谜",
    solarMultiplier: 0.82,
    minTempC: 12.5,
    maxTempC: 16.5,
    story: "35 亿年前年轻的太阳亮度只有今天的 82%，按理说远古地球应该彻底冻僵，可地质学家却发现了古老液态海洋的鹅卵石！快调配远古火山温室气体与无冰深海反照率，保住 12.5°C ~ 16.5°C 的液态海洋！",
    dadTip: "远古大陆少、几乎没有极地冰盖，深海反照率较低（试试 0.20 ~ 0.24），再加上火山喷发的较高 CO₂（约 480 ~ 560 ppm）就能抵消暗淡阳光！",
    cheer: "破解卡尔·萨根提出的『暗淡年轻太阳悖论』啦！远古深海成功保住了液态水！",
    explain: "天文学家卡尔·萨根曾追问为什么年轻太阳更暗时地球没结冰——正是远古更浓的火山温室气体与更暗的海洋表面联手，替婴儿期的生命守住了温暖摇篮！",
    start: { co2Ppm: 280, albedo: 0.32 },
    sampleSolution: { co2Ppm: 520, albedo: 0.22 }
  },
  {
    id: 4,
    title: "给发烧的地球退烧",
    solarMultiplier: 1.0,
    maxCo2Ppm: 380,
    minTempC: 13.8,
    maxTempC: 15.3,
    story: "终极守护：过量排放让温室浓度飙升到 760 ppm，极地融冰又使反照率降到 0.22，地球高烧超过 24°C！请推进清洁能源减排（CO₂ ≤ 380 ppm）并修复冰雪森林反照率，把均温稳稳拉回 13.8°C ~ 15.3°C！",
    dadTip: "双管齐下：把温室气体浓度降到 320 ~ 350 ppm，同时让极地冰盖与云层反照率恢复到 0.31 ~ 0.33！",
    cheer: "地球退烧成功！北极熊的浮冰保住了，海岸线也安全啦！",
    explain: "温室效应本身不是坏人，失衡才是危机：少穿棉被会冻僵，棉被太厚会中暑。理解行星辐射收支账单，就是人类守护唯一家园的科学罗盘！",
    start: { co2Ppm: 760, albedo: 0.22 },
    sampleSolution: { co2Ppm: 330, albedo: 0.32 }
  }
];
