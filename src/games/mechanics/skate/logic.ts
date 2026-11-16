/**
 * 「滑板能量公园」纯物理逻辑层（机械能守恒 + 竖直圆环向心力临界 + 摩擦生热）
 * 灵感致敬 PhET Energy Skate Park。
 */

export type SkateState = {
  startHeightM: number; // 起滑高度 1.5 ~ 8.0 m
  frictionMu: number;   // 粗糙段动摩擦系数 0.00 ~ 0.45
};

export type TrackKind = "hump" | "loop" | "brake" | "combo";

export type SkateSim = {
  totalEnergyJ: number;
  endHeightM: number;
  potentialJ: number;
  kineticJ: number;
  thermalJ: number;
  endSpeedMS: number;
  clearedObstacle: boolean;
  detachedInLoop: boolean;
  outcome: "stalled" | "detached" | "overshoot" | "perfect";
};

export type SkateLevel = {
  id: number;
  title: string;
  kind: TrackKind;
  lockFriction?: boolean;
  lockHeight?: boolean;
  obstacleHeightM: number; // 驼峰高或圆环直径 2R
  flatRoughLengthM: number;
  deckHeightM: number;
  maxSafeEndSpeedMS: number;
  story: string;
  dadTip: string;
  cheer: string;
  explain: string;
  start: SkateState;
  sampleSolution: SkateState;
};

export const MASS_KG = 50;
export const GRAVITY = 10; // m/s²

/** 计算滑板手全程能量转化与终点状态。 */
export function simulateSkate(level: SkateLevel, state: SkateState): SkateSim {
  const E0 = MASS_KG * GRAVITY * state.startHeightM;

  // 1. 检查中段障碍（驼峰或竖直圆环）
  if (level.kind === "hump") {
    if (state.startHeightM <= level.obstacleHeightM + 0.05) {
      return {
        totalEnergyJ: E0,
        endHeightM: state.startHeightM,
        potentialJ: E0,
        kineticJ: 0,
        thermalJ: 0,
        endSpeedMS: 0,
        clearedObstacle: false,
        detachedInLoop: false,
        outcome: "stalled"
      };
    }
  }

  if (level.kind === "loop" || level.kind === "combo") {
    const loopRadius = level.obstacleHeightM / 2;
    // 竖直圆环最高点不脱轨临界条件：v_top² >= gR => h0 >= 2R + 0.5R = 2.5R
    const minLoopStartH = 2.5 * loopRadius;
    if (state.startHeightM < level.obstacleHeightM) {
      return {
        totalEnergyJ: E0,
        endHeightM: state.startHeightM,
        potentialJ: E0,
        kineticJ: 0,
        thermalJ: 0,
        endSpeedMS: 0,
        clearedObstacle: false,
        detachedInLoop: false,
        outcome: "stalled"
      };
    }
    if (state.startHeightM < minLoopStartH) {
      const epTop = MASS_KG * GRAVITY * level.obstacleHeightM;
      const ekTop = Math.max(0, E0 - epTop);
      return {
        totalEnergyJ: E0,
        endHeightM: level.obstacleHeightM,
        potentialJ: epTop,
        kineticJ: ekTop,
        thermalJ: 0,
        endSpeedMS: Math.sqrt((2 * ekTop) / MASS_KG),
        clearedObstacle: false,
        detachedInLoop: true,
        outcome: "detached"
      };
    }
  }

  // 2. 通过粗糙减速垫消耗机械能转化为热能 Q = μ m g L
  const maxThermal = MASS_KG * GRAVITY * state.frictionMu * level.flatRoughLengthM;
  const deckPotential = MASS_KG * GRAVITY * level.deckHeightM;

  if (E0 - maxThermal < deckPotential) {
    // 还没爬上终点高台就耗尽动能停在半坡
    const thermalJ = Math.min(E0, maxThermal);
    const remainPotential = Math.max(0, E0 - thermalJ);
    return {
      totalEnergyJ: E0,
      endHeightM: remainPotential / (MASS_KG * GRAVITY),
      potentialJ: remainPotential,
      kineticJ: 0,
      thermalJ,
      endSpeedMS: 0,
      clearedObstacle: true,
      detachedInLoop: false,
      outcome: "stalled"
    };
  }

  const kineticJ = E0 - maxThermal - deckPotential;
  const endSpeedMS = Math.sqrt((2 * kineticJ) / MASS_KG);
  const overshoot = endSpeedMS > level.maxSafeEndSpeedMS;

  return {
    totalEnergyJ: E0,
    endHeightM: level.deckHeightM,
    potentialJ: deckPotential,
    kineticJ,
    thermalJ: maxThermal,
    endSpeedMS,
    clearedObstacle: true,
    detachedInLoop: false,
    outcome: overshoot ? "overshoot" : "perfect"
  };
}

export function checkSkateGoal(level: SkateLevel, state: SkateState): boolean {
  return simulateSkate(level, state).outcome === "perfect";
}

export const skateLevels: readonly SkateLevel[] = [
  {
    id: 1,
    title: "翻越驼峰上高台",
    kind: "hump",
    lockFriction: true,
    obstacleHeightM: 4.5,
    flatRoughLengthM: 0,
    deckHeightM: 4.2,
    maxSafeEndSpeedMS: 5.0,
    story: "光滑冰感滑道没有摩擦！中间鼓起一座 4.5 米高的驼峰，右边是 4.2 米高的终点看台。调调起滑高度 h₀，既要翻过驼峰，又别冲太猛飞出看台栏杆！",
    dadTip: "机械能守恒：想翻过 4.5 米的驼峰，起点必须高于 4.5 米！试试从 5.0 米左右松手起滑！",
    cheer: "漂亮登台！滑下谷底时势能全变速度，冲上驼峰又把速度换回高度！",
    explain: "在没有摩擦的理想滑道上，重力势能 Ep 与动能 Ek 像两个互相倒水的杯子，总量一滴不少——无论中间滑谷有多深，滑板最高只能回到起滑高度！",
    start: { startHeightM: 3.4, frictionMu: 0 },
    sampleSolution: { startHeightM: 5.0, frictionMu: 0 }
  },
  {
    id: 2,
    title: "过山车大回环之谜",
    kind: "loop",
    lockFriction: true,
    obstacleHeightM: 4.0, // 2R = 4.0m (R = 2.0m => 2.5R = 5.0m)
    flatRoughLengthM: 0,
    deckHeightM: 3.8,
    maxSafeEndSpeedMS: 6.2,
    story: "前方是一座高 4.0 米（半径 2.0 米）的 360° 竖直圆环！小念猜从 4.2 米滑下就够高了，结果头朝下掉下来啦！快找出安全贴顶过环的起滑高度！",
    dadTip: "圆环顶上必须保留足够的速度产生向心力（v² ≥ gR），所以起滑高度至少要达到半径的 2.5 倍（5.0 米）！试试 5.2 ~ 5.6 米！",
    cheer: "哇哦！倒挂金钩贴着环顶飞过去，稳稳落在终点台！",
    explain: "为什么 4.0 米高的圆环必须从 5.0 米以上滑下？因为倒挂在最高点时不能停下，至少要留半个半径的动能充当『向心力安全带』，才不会半空脱轨！",
    start: { startHeightM: 4.2, frictionMu: 0 },
    sampleSolution: { startHeightM: 5.4, frictionMu: 0 }
  },
  {
    id: 3,
    title: "粗糙垫摩擦刹停",
    kind: "brake",
    lockHeight: true,
    obstacleHeightM: 0,
    flatRoughLengthM: 10,
    deckHeightM: 2.5,
    maxSafeEndSpeedMS: 3.2,
    story: "这次固定从 6.0 米高台俯冲而下，谷底铺了 10 米长的防滑减速垫，终点台高 2.5 米。请调准摩擦系数 μ，把多余的动能刚好磨成热能，稳稳停上终点台！",
    dadTip: "6.0 米减 2.5 米多出了 3.5 米的能量高度，除以 10 米粗糙垫，摩擦系数调到 0.32 左右就能温柔停稳！",
    cheer: "稳稳刹停！看右边红色的『热能柱』长高了，滑板轮子都磨热啦！",
    explain: "踩刹车时消失的机械能并没有凭空毁灭，而是通过摩擦力变成了滑板轮子和地面的热能——动能 + 势能 + 热能加起来，依然严格等于最初的总能量！",
    start: { startHeightM: 6.0, frictionMu: 0.05 },
    sampleSolution: { startHeightM: 6.0, frictionMu: 0.32 }
  },
  {
    id: 4,
    title: "回环加急刹满贯赛",
    kind: "combo",
    obstacleHeightM: 3.6, // R = 1.8m => minLoopStartH = 4.5m
    flatRoughLengthM: 10,
    deckHeightM: 2.0,
    maxSafeEndSpeedMS: 3.0,
    story: "总决赛赛道：先冲过 3.6 米高的竖直大回环（别脱轨！），紧接着滑过 10 米减速垫，以不超过 3.0 m/s 的安全速度停上 2.0 米领奖台！",
    dadTip: "圆环半径 1.8 米，起滑高度至少要 4.5 米（比如调 5.2 米）；再把摩擦系数调到 0.28 ~ 0.30 吃掉出环后的富余冲力！",
    cheer: "全场沸腾！过山车回环接精准能量刹车，教科书级的总工程师设计！",
    explain: "真正的游乐场过山车设计师就是这样算账的：用第一座最高坡定好全程能量上限，靠高度差算每处速度，最后在进站口用磁力或摩擦制动器把动能安全归零！",
    start: { startHeightM: 4.0, frictionMu: 0.08 },
    sampleSolution: { startHeightM: 5.2, frictionMu: 0.29 }
  }
];
