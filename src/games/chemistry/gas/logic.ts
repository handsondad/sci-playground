/**
 * 「气体分子压力舱」纯热力学与分子动理论逻辑层（理想气体状态方程 PV = nRT）
 * 灵感致敬 PhET Gas Properties。
 */

export type GasState = {
  moles: number;   // 气体物质的量 n (0.4 ~ 3.6 mol)
  volumeL: number; // 活塞气缸容积 V (2.0 ~ 12.0 L)
  tempK: number;   // 绝对热力学温度 T (200 ~ 600 K)
};

export type GasReadout = {
  pressureKPa: number; // P = n R T / V (kPa)
  tempC: number;       // 摄氏温度 T - 273.15
  rmsSpeedMS: number;  // 氮气分子方均根速率 sqrt(3RT/M) (m/s)
  collisionRate: number; // 器壁碰撞频率相对指数
  overBurst: boolean;
};

export type GasLevel = {
  id: number;
  title: string;
  burstLimitKPa: number;
  minPressureKPa: number;
  maxPressureKPa: number;
  minTempK?: number;
  maxTempK?: number;
  lockMoles?: boolean;
  lockVolume?: boolean;
  lockTemp?: boolean;
  story: string;
  dadTip: string;
  cheer: string;
  explain: string;
  start: GasState;
  sampleSolution: GasState;
};

export const GAS_R = 8.31446; // J/(mol·K) = L·kPa/(mol·K)
export const N2_MOLAR_MASS_KG = 0.028; // kg/mol

/** 根据理想气体状态方程 PV = nRT 与麦克斯韦速率分布计算气缸状态。 */
export function computeGasState(state: GasState, burstLimitKPa = 1200): GasReadout {
  const V = Math.max(0.5, state.volumeL);
  const pressureKPa = +((state.moles * GAS_R * state.tempK) / V).toFixed(1);
  const tempC = +(state.tempK - 273.15).toFixed(1);
  const rmsSpeedMS = Math.round(Math.sqrt((3 * GAS_R * state.tempK) / N2_MOLAR_MASS_KG));
  const collisionRate = +((state.moles * Math.sqrt(state.tempK)) / V).toFixed(1);

  return {
    pressureKPa,
    tempC,
    rmsSpeedMS,
    collisionRate,
    overBurst: pressureKPa > burstLimitKPa
  };
}

export function checkGasGoal(level: GasLevel, state: GasState): boolean {
  const g = computeGasState(state, level.burstLimitKPa);
  if (g.overBurst) return false;
  if (g.pressureKPa < level.minPressureKPa || g.pressureKPa > level.maxPressureKPa) {
    return false;
  }
  if (level.minTempK !== undefined && state.tempK < level.minTempK) return false;
  if (level.maxTempK !== undefined && state.tempK > level.maxTempK) return false;
  return true;
}

export const gasLevels: readonly GasLevel[] = [
  {
    id: 1,
    title: "玻意耳活塞压缩器",
    burstLimitKPa: 950,
    minPressureKPa: 600,
    maxPressureKPa: 680,
    lockMoles: true,
    lockTemp: true,
    story: "恒温 300 K 气缸里装着 1.0 mol 空气，初始容积 8.0 L 时压强只有 312 kPa。请往下推活塞缩小容积 V，把气压精准升到 600 ~ 680 kPa 驱动气动机械臂！",
    dadTip: "温度和分子数不变时，压强与体积成反比（P ∝ 1/V）：想让压强翻倍，把容积从 8.0 L 压到 3.8 ~ 4.0 L 试试！",
    cheer: "机械臂有力举起！空间变小一半，分子撞击缸壁的密集度立刻翻倍！",
    explain: "这就是罗伯特·玻意耳在 1662 年发现的『玻意耳定律』：打气筒捂住出气口往下压时越来越费劲，正是因为体积缩小让分子每秒撞击活塞的次数成倍增加！",
    start: { moles: 1.0, volumeL: 8.0, tempK: 300 },
    sampleSolution: { moles: 1.0, volumeL: 4.0, tempK: 300 }
  },
  {
    id: 2,
    title: "查理热力蒸汽阀",
    burstLimitKPa: 1050,
    minPressureKPa: 910,
    maxPressureKPa: 995,
    lockMoles: true,
    lockVolume: true,
    story: "锁死 6.0 L 刚性气缸（内含 1.5 mol 氮气），安全阀爆破红线是 1050 kPa！请点燃底部酒精灯加热绝对温度 T，让气压稳稳顶开 910 ~ 995 kPa 的动力蒸汽阀！",
    dadTip: "体积不变时，压强与绝对温度 T 成正比！把温度从 240 K 加热到 450 ~ 470 K 左右观察分子飞奔的速度！",
    cheer: "动力阀精准开启！加热后分子飞得像小子弹一样快，每一次撞击都更有力！",
    explain: "温度的微观本质就是『分子热运动的平均平动动能』！温度越高，分子跑得越快、撞墙越狠，这就是夏天汽车轮胎气压会升高的原因！",
    start: { moles: 1.5, volumeL: 6.0, tempK: 240 },
    sampleSolution: { moles: 1.5, volumeL: 6.0, tempK: 460 }
  },
  {
    id: 3,
    title: "暴晒气瓶紧急抢险",
    burstLimitKPa: 1200,
    minPressureKPa: 720,
    maxPressureKPa: 820,
    minTempK: 280,
    lockMoles: true,
    story: "危险！装满 3.0 mol 气体的储气罐在烈日下升到 500 K，容积仅 4.0 L，气压飙到 3118 kPa 濒临爆裂！请同时拉大容积并喷水降温（温度不低于 280 K 防结霜），把压强降回 720 ~ 820 kPa 安全区！",
    dadTip: "试试把气缸容积拉大到 9.5 ~ 10.0 L，再把温度降到 300 ~ 320 K（常温附近），压强就会稳稳落进 750 kPa 左右！",
    cheer: "抢险成功！扩容加降温双管齐下，狂暴的高压分子瞬间温顺下来！",
    explain: "消防员遇到火场边的液化气罐，第一件事就是远远喷水雾给罐体降温——根据 PV = nRT，守住温度 T 就守住了不爆炸的安全底线！",
    start: { moles: 3.0, volumeL: 4.0, tempK: 500 },
    sampleSolution: { moles: 3.0, volumeL: 10.0, tempK: 310 }
  },
  {
    id: 4,
    title: "空间站生命供氧舱",
    burstLimitKPa: 400,
    minPressureKPa: 96,
    maxPressureKPa: 106,
    minTempK: 290,
    maxTempK: 302,
    story: "终极任务：为航天员调试太空睡眠舱！人类最舒适的地面标准大气压是 96 ~ 106 kPa（约 101 kPa），且舱温必须保持在温暖宜人的 290 ~ 302 K（17°C ~ 29°C）。请协同调节充气量 n、舱体容积 V 和温度 T！",
    dadTip: "先把温度定在舒服的 295 K（约 22°C），再减少充气量（如 0.4 ~ 0.5 mol）并把舱容积调大到 10 ~ 12 L，让气压稳稳落在 101 kPa 附近！",
    cheer: "完美复刻地球海平面呼吸环境！航天员脱下宇航服也能自在呼吸啦！",
    explain: "中国天宫空间站的核心舱内，环境控制生命保障系统每时每刻都在用 PV = nRT 精密调控氮氧充气量与恒温空调，在真空中造出一片温暖的一标准大气压港湾！",
    start: { moles: 1.5, volumeL: 5.0, tempK: 250 },
    sampleSolution: { moles: 0.5, volumeL: 12.0, tempK: 295 }
  }
];
