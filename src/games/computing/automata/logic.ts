/**
 * 「元胞森林防火」纯计算逻辑层（二维网格元胞自动机 + 逾渗临界阈值相变）
 * 灵感致敬 Explorable Explanations 与 Red Blob Games 网格自动机实验。
 */

export const GRID_COLS = 18;
export const GRID_ROWS = 12;

export type CellKind = "empty" | "tree" | "burned" | "trench";

export type AutomataState = {
  densityPct: number;   // 植树覆盖密度 20 ~ 85 %
  trenchCol: number;    // 隔离沟所在列 3 ~ 14
  trenchRows: number;   // 隔离沟挖掘长度 0 ~ 12 行（从上往下连续开挖）
};

export type FireSimulation = {
  initialGrid: CellKind[][];
  finalGrid: CellKind[][];
  burnStepGrid: number[][];
  maxStep: number;
  plantedTrees: number;
  burnedTrees: number;
  survivingTrees: number;
  reachedEast: boolean;
};

export type AutomataLevel = {
  id: number;
  title: string;
  seed: number;
  lockDensity?: boolean;
  lockTrench?: boolean;
  story: string;
  dadTip: string;
  cheer: string;
  explain: string;
  start: AutomataState;
  mode: "protect" | "percolate";
  minSurvivingTrees?: number;
  maxDensityPct?: number;
  maxTrenchRows?: number;
  sampleSolution: AutomataState;
};

/** 确定性伪随机数生成器（保证同一关卡同一密度下树木排布完全可复现、可单测）。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 运行从西侧边界 (col=0) 雷击起火的四邻域元胞自动机演化。 */
export function runForestAutomata(seed: number, state: AutomataState): FireSimulation {
  const rand = mulberry32(seed);
  const initialGrid: CellKind[][] = [];
  const finalGrid: CellKind[][] = [];
  const burnStepGrid: number[][] = [];

  for (let r = 0; r < GRID_ROWS; r++) {
    const initRow: CellKind[] = [];
    const finRow: CellKind[] = [];
    const stepRow: number[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const u = rand();
      let cell: CellKind = u < state.densityPct / 100 ? "tree" : "empty";
      // 西侧起火线保留少量天然火种点以直观演示蔓延
      if (c === 0 && r >= 4 && r <= 7) cell = "tree";
      if (state.trenchRows > 0 && c === state.trenchCol && r < state.trenchRows) {
        cell = "trench";
      }
      initRow.push(cell);
      finRow.push(cell);
      stepRow.push(-1);
    }
    initialGrid.push(initRow);
    finalGrid.push(finRow);
    burnStepGrid.push(stepRow);
  }

  let plantedTrees = 0;
  const queue: [number, number][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (initialGrid[r][c] === "tree") {
        plantedTrees++;
        if (c === 0) {
          finalGrid[r][c] = "burned";
          burnStepGrid[r][c] = 0;
          queue.push([r, c]);
        }
      }
    }
  }

  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];
  let head = 0;
  let maxStep = 0;
  while (head < queue.length) {
    const [r, c] = queue[head++];
    const nextStep = burnStepGrid[r][c] + 1;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
      if (finalGrid[nr][nc] === "tree") {
        finalGrid[nr][nc] = "burned";
        burnStepGrid[nr][nc] = nextStep;
        if (nextStep > maxStep) maxStep = nextStep;
        queue.push([nr, nc]);
      }
    }
  }

  let burnedTrees = 0;
  let survivingTrees = 0;
  let reachedEast = false;
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (finalGrid[r][c] === "burned") {
        burnedTrees++;
        if (c === GRID_COLS - 1) reachedEast = true;
      } else if (finalGrid[r][c] === "tree") {
        survivingTrees++;
      }
    }
  }

  return {
    initialGrid,
    finalGrid,
    burnStepGrid,
    maxStep,
    plantedTrees,
    burnedTrees,
    survivingTrees,
    reachedEast
  };
}

export function checkAutomataGoal(level: AutomataLevel, state: AutomataState): boolean {
  if (level.maxTrenchRows !== undefined && state.trenchRows > level.maxTrenchRows) return false;
  if (level.maxDensityPct !== undefined && state.densityPct > level.maxDensityPct) return false;
  const sim = runForestAutomata(level.seed, state);
  if (level.mode === "percolate") {
    return sim.reachedEast;
  }
  if (sim.reachedEast) return false;
  return sim.survivingTrees >= (level.minSurvivingTrees ?? 0);
}

export const automataLevels: readonly AutomataLevel[] = [
  {
    id: 1,
    title: "临界密度自熄灭",
    seed: 10,
    lockTrench: true,
    mode: "protect",
    minSurvivingTrees: 72,
    story: "西边树林遭遇雷击起火，火苗只会向上下左右相邻的绿树蔓延！先不挖防火沟，调调植树密度：既要保住至少 72 棵幸存绿树，又绝不能让大火烧到最东边的村庄！",
    dadTip: "树太密（超过 60%）火会一路烧穿整片大陆；树太稀又凑不够 72 棵绿树！试试 46% ~ 52% 之间的黄金密度！",
    cheer: "太神奇了！没派一架消防飞机，大火烧了几步竟然自己撞上空地熄灭了，保住了大片森林！",
    explain: "复杂系统科学里这叫『逾渗相变』：方格四邻域的临界阈值约为 59%！低于这个临界点，树木分成互不相连的小绿洲，火灾只能局部自生自灭；一旦跨过 59%，瞬间连成横跨大陆的火海！",
    start: { densityPct: 72, trenchCol: 8, trenchRows: 0 },
    sampleSolution: { densityPct: 50, trenchCol: 8, trenchRows: 0 }
  },
  {
    id: 2,
    title: "见证 59% 逾渗相变",
    seed: 12,
    lockTrench: true,
    mode: "percolate",
    maxDensityPct: 64,
    story: "现在来做一次对照实验：如果我们要铺设从西岸直通东岸的『生态连通走廊』（用信号贯通东岸来验证），在不超过 64% 密度的前提下，最少种到多少密度就能突然打通全图？",
    dadTip: "从 45% 慢慢往右拨动滑块观察：一跨过 59% ~ 62% 附近，原本断开的走廊突然全线贯通直达东岸！",
    cheer: "仅仅多加了几个百分点，整张网格突然从孤岛连成了贯通大陆的高速路！",
    explain: "不管是森林大火蔓延、多孔岩石渗水，还是咖啡粉萃取出浓缩咖啡，背后都是同一个数学骨架——逾渗临界点附近极微小的密度变化，会引发翻天覆地的全局相变！",
    start: { densityPct: 42, trenchCol: 8, trenchRows: 0 },
    sampleSolution: { densityPct: 62, trenchCol: 8, trenchRows: 0 }
  },
  {
    id: 3,
    title: "浓密林场的防火隔离带",
    seed: 13,
    lockDensity: true,
    mode: "protect",
    minSurvivingTrees: 105,
    story: "这片原始森林覆盖率高达 76%，一旦起火必烧穿全图！请调动推土机，选择隔离沟的列位置与开挖长度，挡住东进山火并抢救下至少 105 棵参天大树！",
    dadTip: "隔离沟越靠西边（比如第 4 列），被牺牲在火场西侧的树就越少；而且要把沟挖满 12 行别留缺口，否则火苗会从缺口钻过去！",
    cheer: "铜墙铁壁！一道南北贯通的隔离带在西侧就把大火彻底截断，东边上百棵大树毫发无伤！",
    explain: "元胞自动机的局部传播规则决定了：哪怕森林再密，只要切断相邻格子的连通桥（现实中的森林防火道与防疫隔离带），就能用极小代价阻断指数级蔓延！",
    start: { densityPct: 76, trenchCol: 10, trenchRows: 7 },
    sampleSolution: { densityPct: 76, trenchCol: 4, trenchRows: 12 }
  },
  {
    id: 4,
    title: "有限预算护林大师",
    seed: 27,
    mode: "protect",
    minSurvivingTrees: 112,
    maxTrenchRows: 10,
    story: "终极规划：推土机最多只能挖 10 行隔离沟（南边会留出 2 行缺口）！请巧妙搭配植树密度与隔离沟位置，不让火苗绕过缺口烧到东岸，同时保住至少 112 棵绿树！",
    dadTip: "沟底留了 2 行缺口时，如果密度太高火会从南边绕过去！试试选一列南端恰好有天然空地的列（如第 5 列，挖满上限 10 行），再把密度调到 74% 左右！",
    cheer: "神机妙算！借着南边两格天然空地接上人工防火沟，保住了整片郁郁葱葱的大森林！",
    explain: "这就是约翰·冯·诺依曼开创的『元胞自动机』魅力：每个格子只看上下左右四个邻居的极简规则，涌现出了复杂的生态与灾害动力学，今天广泛用于城市规划与林火预警！",
    start: { densityPct: 82, trenchCol: 9, trenchRows: 6 },
    sampleSolution: { densityPct: 74, trenchCol: 5, trenchRows: 10 }
  }
];
