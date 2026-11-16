export type PressureTag = "L" | "H" | "E";
export type WindDir = "sea-to-land" | "land-to-sea" | "calm";

export type CirculationInfo = {
  landTempC: number;
  seaTempC: number;
  deltaC: number;
  landPressure: PressureTag;
  seaPressure: PressureTag;
  landVertical: "up" | "down" | "none";
  seaVertical: "up" | "down" | "none";
  surfaceWind: WindDir;
  upperWind: WindDir;
  windLevel: number;
  summary: string;
};

export type BreezeLevel = {
  id: number;
  title: string;
  scale: "coastal" | "monsoon";
  timeBadge: string;
  story: string;
  nianLine: string;
  hint: string;
  win: string;
  canTuneLandTemp: boolean;
  startLandC: number;
  seaTempC: number;
  minLandC: number;
  maxLandC: number;
  minDeltaAbs: number;
  targetLandPressure: "L" | "H";
  targetSurfaceWind: "sea-to-land" | "land-to-sea";
  startLandPressure: "L" | "H";
  startSurfaceWind: "sea-to-land" | "land-to-sea";
};

/**
 * 根据陆地与海洋表面温度差，推导比热容驱动的热力环流状态：
 * - 较暖一侧空气膨胀上升 → 近地面形成热低压 (L)，高空形成高压；
 * - 较冷一侧空气收缩下沉 → 近地面形成冷高压 (H)；
 * - 近地面水平风永远由【高压 H】吹向【低压 L】！
 */
export function circulationState(landTempC: number, seaTempC: number): CirculationInfo {
  const deltaC = Math.round((landTempC - seaTempC) * 10) / 10;

  if (deltaC > 1) {
    return {
      landTempC,
      seaTempC,
      deltaC,
      landPressure: "L",
      seaPressure: "H",
      landVertical: "up",
      seaVertical: "down",
      surfaceWind: "sea-to-land",
      upperWind: "land-to-sea",
      windLevel: Math.min(6, Math.max(1, Math.round(deltaC / 3.5))),
      summary: "陆地升温快、气温高于海洋：陆上热空气膨胀上升成低压 (L)，海上清凉空气下沉成高压 (H)，近地面风从海洋吹向陆地！"
    };
  }

  if (deltaC < -1) {
    return {
      landTempC,
      seaTempC,
      deltaC,
      landPressure: "H",
      seaPressure: "L",
      landVertical: "down",
      seaVertical: "up",
      surfaceWind: "land-to-sea",
      upperWind: "sea-to-land",
      windLevel: Math.min(6, Math.max(1, Math.round(Math.abs(deltaC) / 3.5))),
      summary: "陆地散热快、气温低于海洋：陆上冷重空气下沉堆积成高压 (H)，海上相对温暖空气上升成低压 (L)，近地面风从陆地吹向海洋！"
    };
  }

  return {
    landTempC,
    seaTempC,
    deltaC,
    landPressure: "E",
    seaPressure: "E",
    landVertical: "none",
    seaVertical: "none",
    surfaceWind: "calm",
    upperWind: "calm",
    windLevel: 0,
    summary: "海陆温差不足 1°C，水平气压梯度力微弱，正处于海陆风转换的静风时刻。"
  };
}

/** 校验玩家调配的海陆温差、陆地气压牌与近地面风向标是否全部匹配目标热力环流。 */
export function checkBreezeGoal(
  level: BreezeLevel,
  landTempC: number,
  seaTempC: number,
  chosenLandPressure: "L" | "H",
  chosenSurfaceWind: "sea-to-land" | "land-to-sea"
): boolean {
  const state = circulationState(landTempC, seaTempC);
  return (
    Math.abs(state.deltaC) >= level.minDeltaAbs &&
    state.landPressure === level.targetLandPressure &&
    state.surfaceWind === level.targetSurfaceWind &&
    chosenLandPressure === level.targetLandPressure &&
    chosenSurfaceWind === level.targetSurfaceWind
  );
}

export const breezeLevels: readonly BreezeLevel[] = [
  {
    id: 1,
    title: "盛夏正午海风吹",
    scale: "coastal",
    timeBadge: "☀️ 正午 13:00 · 阳光暴晒",
    story:
      "沙石比热容小（约 0.8），晒一上午就烫脚到 34°C；海水比热容大（约 4.2，是沙石的 5 倍！），才慢悠悠升到 24°C。请挂准沙滩近地面气压牌，并拨对清凉海风的方向！",
    nianLine: "光脚踩沙滩烫得跳起来，一踩进海水里却冰冰凉！热空气像热气球一样往上飘，底下空出来的地方会让海风补进来吗？",
    hint: "沙滩 34°C 比海水热 → 沙滩热空气上升，近地面空气变稀薄形成『低压 L』；海水上方形成『高压 H』，近地面风从高压吹向低压（🌊 海 → 🏖️ 陆）！",
    win: "凉爽海风吹过来啦！去海边玩总觉得白天的风迎面从大海吹向岸边，就是比热容差异导演的天然空调！",
    canTuneLandTemp: false,
    startLandC: 34,
    seaTempC: 24,
    minLandC: 10,
    maxLandC: 38,
    minDeltaAbs: 6,
    targetLandPressure: "L",
    targetSurfaceWind: "sea-to-land",
    startLandPressure: "H",
    startSurfaceWind: "land-to-sea"
  },
  {
    id: 2,
    title: "繁星夜晚陆风起",
    scale: "coastal",
    timeBadge: "🌙 深夜 02:00 · 晴朗辐射冷却",
    story:
      "到了半夜没有太阳，比热容小的沙滩热量跑得飞快，嗖嗖降到 16°C；比热容大的海水像大暖水袋一样还保持着 23°C！这回气压高低和地面风向怎么大反转？",
    nianLine: "夜里海水摸起来反而暖暖的，沙滩冷冰冰！那上升的热气球跑到大海那边去啦！",
    hint: "夜晚沙滩 16°C 比海水 23°C 更冷 → 陆地冷空气变重下沉形成『高压 H』，温暖海面上升成『低压 L』，地面风改由陆地吹向大海（🏖️ 陆 → 🌊 海）！",
    win: "夜航陆风校准成功！古代帆船渔民傍晚趁海风归港、清晨借陆风出海张帆，把海陆风的作息表摸得门儿清！",
    canTuneLandTemp: false,
    startLandC: 16,
    seaTempC: 23,
    minLandC: 10,
    maxLandC: 38,
    minDeltaAbs: 5,
    targetLandPressure: "H",
    targetSurfaceWind: "land-to-sea",
    startLandPressure: "L",
    startSurfaceWind: "sea-to-land"
  },
  {
    id: 3,
    title: "东亚夏季东南季风",
    scale: "monsoon",
    timeBadge: "🌻 七月盛夏 · 亚欧大陆 vs 太平洋",
    story:
      "把镜头拉高一万倍——世界上最大的亚欧大陆对决最大的太平洋！请先用滑块晒热夏季内陆（形成著名的亚洲热低压），再配准气压与湿润太平洋夏季风向，引来江南梅雨与夏雨！",
    nianLine: "原来季风就是『超级放大版、一年才换一次方向的海陆风』呀！",
    hint: "先把亚欧大陆地表温度滑块推高到 ≥ 31°C（高于太平洋 23°C 至少 8°C），再选陆地『低压 L』与『海洋 → 大陆（夏季东南季风）』！",
    win: "浩荡东南季风登陆！同纬度的撒哈拉和阿拉伯半岛全是沙漠，唯独中国江南郁郁葱葱鱼米飘香，全靠东亚夏季风万里送水汽！",
    canTuneLandTemp: true,
    startLandC: 21,
    seaTempC: 23,
    minLandC: -18,
    maxLandC: 38,
    minDeltaAbs: 8,
    targetLandPressure: "L",
    targetSurfaceWind: "sea-to-land",
    startLandPressure: "H",
    startSurfaceWind: "land-to-sea"
  },
  {
    id: 4,
    title: "冬季西伯利亚寒潮",
    scale: "monsoon",
    timeBadge: "❄️ 一月隆冬 · 西伯利亚 vs 太平洋",
    story:
      "隆冬日照短，深居内陆的西伯利亚—蒙古高原剧烈辐射冷却，冻成庞大的冷空气蓄水池，而太平洋仍有 10°C！请调低内陆温度至严寒冰点下，挂好冷高压并拨响呼啸南下的西北季风！",
    nianLine: "冬天天气预报总说『北方一股强冷空气南下』，源头就是蒙古-西伯利亚大冷高压堆出来的呀！",
    hint: "把亚欧大陆温度滑块拉低到 ≤ −6°C（比太平洋 10°C 低 16°C 以上），陆地选『高压 H』，近地面风选『大陆 → 海洋（冬季西北季风）』！",
    win: "冬季季风环流贯通！从每天昼夜交替的海边微风，到横跨半个地球的冬夏荣枯季风，背后竟然都是同一条『比热容 + 热力环流』物理定律！",
    canTuneLandTemp: true,
    startLandC: 11,
    seaTempC: 10,
    minLandC: -18,
    maxLandC: 38,
    minDeltaAbs: 15,
    targetLandPressure: "H",
    targetSurfaceWind: "land-to-sea",
    startLandPressure: "L",
    startSurfaceWind: "sea-to-land"
  }
];
