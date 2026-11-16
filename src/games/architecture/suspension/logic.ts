/**
 * 「悬索大桥主缆」纯结构力学逻辑层（均布荷载抛物线主缆：H = wL²/(8f)）
 * 揭示「主缆拉得越平直，水平拉力反而趋向无穷大而崩断」的经典工程反直觉现象。
 */

export type SuspensionState = {
  towerHeightM: number; // 桥塔高出桥面高度 35 ~ 85 m
  sagM: number;         // 主缆跨中垂度 f 8 ~ 75 m
};

export type BridgeMechanics = {
  horizontalPullMN: number; // H = w L² / (8 f) (MN)
  verticalReactionMN: number; // V = w L / 2 (MN)
  maxCableTensionMN: number;  // T_max = sqrt(H² + V²) (MN)
  midClearanceM: number;      // 跨中主缆最低点距桥面安全净高 towerHeightM - sagM
  sagRatio: number;           // 垂跨比 f / L
  costMillion: number;        // 桥塔混凝土 + 主缆高强钢丝总造价（百万元）
  cableSafe: boolean;
  anchorSafe: boolean;
  clearanceSafe: boolean;
  budgetSafe: boolean;
};

export type SuspensionLevel = {
  id: number;
  title: string;
  spanM: number;
  loadKNPerM: number; // 桥面均布总荷载 w (kN/m)
  maxCableLimitMN: number;
  maxAnchorLimitMN: number;
  minClearanceM: number;
  maxTowerM?: number;
  maxBudgetMillion?: number;
  lockTower?: boolean;
  story: string;
  dadTip: string;
  cheer: string;
  explain: string;
  start: SuspensionState;
  sampleSolution: SuspensionState;
};

/** 计算给定桥塔高度与主缆垂度下的内力、净空与工程造价。 */
export function analyzeSuspension(
  level: SuspensionLevel,
  state: SuspensionState
): BridgeMechanics {
  const L = level.spanM;
  const wMN = level.loadKNPerM / 1000; // 1 kN/m = 0.001 MN/m
  const f = Math.max(4, state.sagM);

  const horizontalPullMN = (wMN * L * L) / (8 * f);
  const verticalReactionMN = (wMN * L) / 2;
  const maxCableTensionMN = Math.hypot(horizontalPullMN, verticalReactionMN);
  const midClearanceM = state.towerHeightM - state.sagM;
  const sagRatio = f / L;

  // 桥塔造价随高度平方增长，主缆造价随最大拉力与弧长增长
  const cableArcFactor = 1 + (8 * f * f) / (3 * L * L);
  const towerCost = 0.011 * state.towerHeightM * state.towerHeightM;
  const cableCost = 0.48 * maxCableTensionMN * cableArcFactor;
  const costMillion = +(towerCost + cableCost).toFixed(1);

  const cableSafe = maxCableTensionMN <= level.maxCableLimitMN;
  const anchorSafe = horizontalPullMN <= level.maxAnchorLimitMN;
  const clearanceSafe = midClearanceM >= level.minClearanceM;
  const budgetSafe =
    level.maxBudgetMillion === undefined || costMillion <= level.maxBudgetMillion;

  return {
    horizontalPullMN: +horizontalPullMN.toFixed(1),
    verticalReactionMN: +verticalReactionMN.toFixed(1),
    maxCableTensionMN: +maxCableTensionMN.toFixed(1),
    midClearanceM: +midClearanceM.toFixed(1),
    sagRatio,
    costMillion,
    cableSafe,
    anchorSafe,
    clearanceSafe,
    budgetSafe
  };
}

export function checkSuspensionGoal(
  level: SuspensionLevel,
  state: SuspensionState
): boolean {
  if (level.maxTowerM !== undefined && state.towerHeightM > level.maxTowerM) return false;
  const m = analyzeSuspension(level, state);
  return m.cableSafe && m.anchorSafe && m.clearanceSafe && m.budgetSafe;
}

export const suspensionLevels: readonly SuspensionLevel[] = [
  {
    id: 1,
    title: "拉太直反而会绷断",
    spanM: 400,
    loadKNPerM: 120,
    maxCableLimitMN: 66,
    maxAnchorLimitMN: 999,
    minClearanceM: 8,
    lockTower: true,
    story: "400 米跨海大桥桥塔高 62 米！实习生想把主缆拉得笔直好看（垂度只有 10 米），结果钢缆拉力飙到 241 MN 当场报警！快放松主缆垂度，让最大拉力降到 66 MN 以内，且跨中离桥面至少留 8 米！",
    dadTip: "主缆水平拉力 H = wL²/(8f)，垂度 f 放大 5 倍，水平拉力就骤降到 1/5！把垂度调到 44 ~ 52 米试试！",
    cheer: "警报解除！主缆优雅地垂下抛物线弧度，钢缆拉力一下子降到了原来的四分之一！",
    explain: "在家晾湿毛毯时你也见过这个规律：想把绳子拉得完全水平需要无穷大的力！给悬索桥主缆留出合适的抛物线垂度，才能让竖向分力轻松托起整座桥面！",
    start: { towerHeightM: 62, sagM: 10 },
    sampleSolution: { towerHeightM: 62, sagM: 48 }
  },
  {
    id: 2,
    title: "高铁上桥与桥塔加高",
    spanM: 400,
    loadKNPerM: 180,
    maxCableLimitMN: 88,
    maxAnchorLimitMN: 999,
    minClearanceM: 12,
    story: "桥面升级成公路+城际铁路双层重载（180 kN/m）！光放低垂度会让主缆擦到桥面列车（净高必须 ≥ 12 米），请协调加高桥塔与主缆垂度，让主缆拉力 ≤ 88 MN！",
    dadTip: "垂度大了拉力小，但桥塔必须比垂度至少高出 12 米！先把桥塔升到 70 ~ 76 米，再把垂度调到 54 ~ 60 米！",
    cheer: "稳如泰山！高耸的桥塔托起柔美主缆，重载列车呼啸通过纹丝不动！",
    explain: "旧金山金门大桥和中国虎门大桥的两座巨塔之所以修得像摩天大楼一样高，正是为了给主缆腾出足够的下垂空间，大幅降低钢缆拉力！",
    start: { towerHeightM: 52, sagM: 46 },
    sampleSolution: { towerHeightM: 72, sagM: 56 }
  },
  {
    id: 3,
    title: "海岸软岩锚碇保卫战",
    spanM: 400,
    loadKNPerM: 160,
    maxCableLimitMN: 95,
    maxAnchorLimitMN: 56,
    minClearanceM: 10,
    maxTowerM: 72,
    story: "大桥两岸岩石较软，岸边水泥锚碇最多只能拉住 56 MN 的水平拉力（桥塔限高 72 米，净高 ≥ 10 米）！请精调塔高与垂度，别让两岸锚碇被主缆拔出来！",
    dadTip: "要让水平拉力 H = 0.16 × 400² ÷ (8f) ≤ 56 MN，垂度 f 至少要达到 58 米以上；同时把桥塔调到 68 ~ 72 米保住 10 米净空！",
    cheer: "两岸锚碇稳稳扎根！一分多余的水平拔力都没有！",
    explain: "悬索桥真正的『幕后大力士』藏在两岸地底下——重达几十万吨的混凝土锚碇死死拽住主缆两端，垂度每增加一点，锚碇承受的水平拔力就轻松一大截！",
    start: { towerHeightM: 60, sagM: 36 },
    sampleSolution: { towerHeightM: 70, sagM: 60 }
  },
  {
    id: 4,
    title: "黄金垂跨比总设计师",
    spanM: 400,
    loadKNPerM: 200,
    maxCableLimitMN: 96,
    maxAnchorLimitMN: 76,
    minClearanceM: 10,
    maxBudgetMillion: 98,
    story: "终极招标：重载 200 kN/m，既要钢缆拉力 ≤ 96 MN、水平锚力 ≤ 76 MN、净高 ≥ 10 米，还要把『桥塔+钢缆总造价』控制在 98 百万元以内！找出桥梁界著名的黄金垂跨比吧！",
    dadTip: "塔太高混凝土贵，垂度太小高强钢丝贵！试试垂度 54 ~ 56 米（约为跨度的 1/7.3）、桥塔 64 ~ 66 米的黄金组合！",
    cheer: "中标啦！造价省、受力匀、线条美，你算出了世界名桥同款的黄金比例！",
    explain: "翻开世界悬索桥档案，从金门大桥到港珠澳青州航道桥，工程师最终算出的垂跨比 f/L 几乎都落在 1/9 到 1/7 之间——那就是塔高成本与主缆拉力博弈出的数学最优解！",
    start: { towerHeightM: 82, sagM: 32 },
    sampleSolution: { towerHeightM: 65, sagM: 55 }
  }
];
