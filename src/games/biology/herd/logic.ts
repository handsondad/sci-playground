/**
 * 「免疫屏障实验室」纯科学逻辑层（SIR 传染病微分动力学与群体免疫阈值）
 * 灵感致敬 Explorable Explanations 疫情传播沙盒（Outbreak / SIR Model）。
 */

export type HerdState = {
  vaccinePct: number; // 初始疫苗免疫覆盖率 0 ~ 90 (%)
  hygienePct: number; // 口罩通风与洗手降低传播率比例 0 ~ 60 (%)
};

export type DayPoint = {
  day: number;
  S: number;
  I: number;
  R: number;
};

export type HerdSim = {
  r0Basic: number;
  rEffective: number;
  herdThresholdPct: number;
  peakInfected: number;
  peakDay: number;
  totalNewCases: number;
  series: DayPoint[];
};

export type HerdLevel = {
  id: number;
  title: string;
  r0Basic: number;
  hospitalCap: number;
  maxNewCases?: number;
  lockVaccine?: boolean;
  lockHygiene?: boolean;
  maxVaccinePct?: number;
  maxHygienePct?: number;
  maxCombinedEffort?: number;
  story: string;
  dadTip: string;
  cheer: string;
  explain: string;
  start: HerdState;
  sampleSolution: HerdState;
};

export const POPULATION = 1000;
export const INITIAL_INFECTED = 6;
export const RECOVERY_GAMMA = 0.2; // 平均康复周期 5 天 (γ = 0.2 / day)

/** 使用二阶龙格-库塔法模拟 60 天 SIR 人群曲线。 */
export function simulateSIR(r0Basic: number, state: HerdState): HerdSim {
  const beta0 = r0Basic * RECOVERY_GAMMA;
  const beta = beta0 * (1 - state.hygienePct / 100);
  const immuneInit = Math.round((POPULATION - INITIAL_INFECTED) * (state.vaccinePct / 100));

  let S = Math.max(0, POPULATION - INITIAL_INFECTED - immuneInit);
  let I = INITIAL_INFECTED;
  let R = immuneInit;

  const rEffective = r0Basic * (1 - state.hygienePct / 100) * (S / POPULATION);
  const herdThresholdPct = Math.max(0, (1 - 1 / r0Basic) * 100);

  const dt = 0.25; // 1/4 day step
  const days = 60;
  const series: DayPoint[] = [{ day: 0, S, I, R }];

  let peakInfected = I;
  let peakDay = 0;

  for (let step = 1; step <= days / dt; step++) {
    const inf1 = (beta * S * I) / POPULATION;
    const rec1 = RECOVERY_GAMMA * I;
    const dS1 = -inf1;
    const dI1 = inf1 - rec1;
    const dR1 = rec1;

    const Sm = Math.max(0, S + 0.5 * dt * dS1);
    const Im = Math.max(0, I + 0.5 * dt * dI1);
    const inf2 = (beta * Sm * Im) / POPULATION;
    const rec2 = RECOVERY_GAMMA * Im;

    S = Math.max(0, S + dt * -inf2);
    I = Math.max(0, I + dt * (inf2 - rec2));
    R = Math.min(POPULATION, R + dt * rec2);

    const dayNow = step * dt;
    if (I > peakInfected) {
      peakInfected = I;
      peakDay = Math.round(dayNow);
    }
    if (step % 4 === 0) {
      series.push({ day: dayNow, S, I, R });
    }
  }

  const initialS = Math.max(0, POPULATION - INITIAL_INFECTED - immuneInit);
  const totalNewCases = Math.max(0, Math.round(initialS - S));

  return {
    r0Basic,
    rEffective,
    herdThresholdPct,
    peakInfected: Math.round(peakInfected),
    peakDay,
    totalNewCases,
    series
  };
}

export function checkHerdGoal(level: HerdLevel, state: HerdState): boolean {
  if (level.maxVaccinePct !== undefined && state.vaccinePct > level.maxVaccinePct) return false;
  if (level.maxHygienePct !== undefined && state.hygienePct > level.maxHygienePct) return false;
  if (
    level.maxCombinedEffort !== undefined &&
    state.vaccinePct + state.hygienePct > level.maxCombinedEffort
  ) {
    return false;
  }
  const sim = simulateSIR(level.r0Basic, state);
  if (sim.peakInfected > level.hospitalCap) return false;
  if (level.maxNewCases !== undefined && sim.totalNewCases > level.maxNewCases) return false;
  return true;
}

export const herdLevels: readonly HerdLevel[] = [
  {
    id: 1,
    title: "戴口罩压平感染洪峰",
    r0Basic: 2.5,
    hospitalCap: 95,
    lockVaccine: true,
    story: "新流感刚出现还没有疫苗（免疫率 0%），1 个病人平均传染 2.5 人（R₀=2.5）！小镇医院最多只有 95 张病床（红虚线），快调高『通风洗手戴口罩』防护率，把红色感染洪峰压到红线以下！",
    dadTip: "观察红山峰高度：防护率调到 36% ~ 45% 以上，传染速度慢下来，病峰就会稳稳压在 95 张床位以内！",
    cheer: "守住医院防线啦！红色高峰被稳稳压扁在了医疗红线底下！",
    explain: "流行病学把这叫做『压平曲线（Flatten the Curve）』：勤洗手、开窗通风和戴口罩能显著降低传播率 β，不让成百上千病人同一天挤爆医院！",
    start: { vaccinePct: 0, hygienePct: 5 },
    sampleSolution: { vaccinePct: 0, hygienePct: 40 }
  },
  {
    id: 2,
    title: "75% 群体免疫保护伞",
    r0Basic: 4.0,
    hospitalCap: 15,
    maxNewCases: 32,
    lockHygiene: true,
    maxVaccinePct: 84,
    story: "这种病毒 R₀ = 4.0（1 传 4）！现在疫苗研发成功啦，在不戴口罩的日常状态下，至少要给多少比例的居民接种疫苗，才能让有效传染数 Rₑ 降到 1 以下、新发感染不超过 32 人？",
    dadTip: "群体免疫公式 p_c = 1 − 1/R₀ = 1 − 1/4 = 75%！把疫苗覆盖率调到 78% ~ 82% 试试！",
    cheer: "太震撼了！明明还有两百多人没打针，病毒却像撞上盾牌一样自己熄火了！",
    explain: "当 R₀=4 时，只要超过 75% 的人拥有免疫力，1 个病人散播出的 4 颗火苗里平均有 3 颗落到免疫盾牌上，有效再生数 Rₑ < 1，传染链就会迅速断绝！",
    start: { vaccinePct: 45, hygienePct: 0 },
    sampleSolution: { vaccinePct: 78, hygienePct: 0 }
  },
  {
    id: 3,
    title: "守护不能接种的小宝宝",
    r0Basic: 5.0,
    hospitalCap: 15,
    maxNewCases: 48,
    maxVaccinePct: 66,
    story: "高传染病毒 R₀ = 5.0（纯靠疫苗需要 80% 覆盖率），但镇上有刚出生的婴儿和过敏体质老人，疫苗覆盖率最高只能打到 66%！请结合适度卫生防护，保护脆弱人群，把新增感染压在 48 人内！",
    dadTip: "先把能打疫苗的 64%~66% 打满，再补上 44%~50% 的通风洗手防护，把有效传染数 Rₑ 压到 1 以下！",
    cheer: "一个都没落下！疫苗盾牌加日常卫生联手，稳稳护住了不能打针的小宝宝！",
    explain: "这就是公共卫生里的『瑞士奶酪防御模型』：每一层防御都有孔洞，但把疫苗接种与通风卫生叠在一起，病毒就找不到穿过去的通道！",
    start: { vaccinePct: 50, hygienePct: 10 },
    sampleSolution: { vaccinePct: 64, hygienePct: 46 }
  },
  {
    id: 4,
    title: "超强传播株联合狙击",
    r0Basic: 6.0,
    hospitalCap: 14,
    maxNewCases: 36,
    maxVaccinePct: 76,
    maxHygienePct: 55,
    maxCombinedEffort: 122,
    story: "终极挑战：超强毒株 R₀ = 6.0 来袭！受人力预算限制，『疫苗覆盖率 + 卫生防护率』之和不能超过 122。请精准分配两项投入，把新增病例锁定在 36 人以内！",
    dadTip: "要让 6 × (1 − 疫苗) × (1 − 防护) < 1，两数乘积越均衡越划算！试试疫苗 72% + 卫生防护 46%（合计 118 ≤ 122）！",
    cheer: "教科书级的防疫总指挥！在严苛预算下把 Rₑ 压破 1.0，零冲击平息疫情！",
    explain: "1927 年克马克与麦肯德里克提出的 SIR 模型告诉我们：只要把有效再生数 Rₑ 压到 1 以下，指数爆炸就会瞬间逆转为指数衰减——数学也能拯救千万人的生命！",
    start: { vaccinePct: 56, hygienePct: 20 },
    sampleSolution: { vaccinePct: 72, hygienePct: 46 }
  }
];
