export type Phase = "solid" | "liquid" | "gas";

export type Substance = {
  id: "water" | "gallium" | "nitrogen";
  name: string;
  formula: string;
  meltC: number;
  boilC: number;
  minC: number;
  maxC: number;
  stepC: number;
  beadColor: string;
};

export const SUBSTANCES: Record<Substance["id"], Substance> = {
  water: {
    id: "water",
    name: "纯水",
    formula: "H₂O",
    meltC: 0,
    boilC: 100,
    minC: -40,
    maxC: 140,
    stepC: 5,
    beadColor: "#38bdf8"
  },
  gallium: {
    id: "gallium",
    name: "金属镓",
    formula: "Ga",
    meltC: 30,
    boilC: 2204,
    minC: 0,
    maxC: 80,
    stepC: 2,
    beadColor: "#94a3b8"
  },
  nitrogen: {
    id: "nitrogen",
    name: "氮气",
    formula: "N₂",
    meltC: -210,
    boilC: -196,
    minC: -225,
    maxC: -165,
    stepC: 2,
    beadColor: "#818cf8"
  }
};

export type MatterLevel = {
  id: number;
  title: string;
  substanceId: Substance["id"];
  startC: number;
  goalPhase: Phase;
  minGoalC?: number;
  maxGoalC?: number;
  story: string;
  hint: string;
  win: string;
};

export function phaseOf(sub: Substance, tempC: number): Phase {
  if (tempC < sub.meltC) return "solid";
  if (tempC < sub.boilC) return "liquid";
  return "gas";
}

export function phaseLabel(phase: Phase): string {
  if (phase === "solid") return "🧊 固态（晶格振动）";
  if (phase === "liquid") return "💧 液态（自由滑移）";
  return "☁️ 气态（高速飞散）";
}

export function checkMatterGoal(level: MatterLevel, tempC: number): boolean {
  const sub = SUBSTANCES[level.substanceId];
  if (phaseOf(sub, tempC) !== level.goalPhase) return false;
  if (level.minGoalC !== undefined && tempC < level.minGoalC) return false;
  if (level.maxGoalC !== undefined && tempC > level.maxGoalC) return false;
  return true;
}

export const matterLevels: readonly MatterLevel[] = [
  {
    id: 1,
    title: "冰块化春水",
    substanceId: "water",
    startC: -25,
    goalPhase: "liquid",
    minGoalC: 15,
    maxGoalC: 40,
    story: "微观放大一亿倍看冰块！-25°C 时水分子被锁在整齐的晶格座位上轻轻发抖。把温度调到温暖宜人的液态水区间（15°C ~ 40°C），别把水烧开哦！",
    hint: "冰在 0°C 熔化成水，100°C 才会沸腾。把温度滑块推到 25°C 左右点锁定观察！",
    win: "冰晶散开啦！水分子虽然还挨得很近，但已经松开死死拽住的手，能滑来滑去流动了。"
  },
  {
    id: 2,
    title: "水壶冒白汽",
    substanceId: "water",
    startC: 25,
    goalPhase: "gas",
    story: "继续给液态水加热！突破沸点，让水分子彻底挣脱彼此的引力变成水蒸气满屋飞奔吧！",
    hint: "标准大气压下水的沸点是 100°C！把温度推到 105°C ~ 140°C 之间，看分子嗖嗖乱撞容器壁！",
    win: "沸腾气化！气态水分子之间的距离拉大了十倍以上，体积一下子暴涨了一千多倍！"
  },
  {
    id: 3,
    title: "手心融化的银勺",
    substanceId: "gallium",
    startC: 16,
    goalPhase: "liquid",
    minGoalC: 34,
    maxGoalC: 40,
    story: "化学家魔术：有一把亮晶晶的『金属镓（Ga）』勺子，室温 16°C 时硬邦邦的，握在手心里竟然会像巧克力一样化掉！把温度调到人体手心温度（34°C ~ 40°C）见证奇迹！",
    hint: "金属镓的熔点只有 29.8°C（约 30°C）！只要把滑块推到 36°C 人的体温附近，固态金属就变成亮晶晶的液态金属啦！",
    win: "不是所有金属都怕热不怕温！汞在常温就是液态，而金属镓正好卡在 30°C，握在手里就会化成银色水滴！"
  },
  {
    id: 4,
    title: "把空气冻成液氮",
    substanceId: "nitrogen",
    startC: -170,
    goalPhase: "liquid",
    story: "终极精准控温！空气里占 78% 的氮气（N₂）要在极低温下才会变成冒冷气的『液氮』。注意：它的液态窗口窄得只有 14 度，太暖是气体，太冷又会冻成氮冰！",
    hint: "氮气在 -196°C 液化，到 -210°C 就结冰成固态了！把温度调在 -208°C 到 -198°C 之间就能稳稳接住液氮！",
    win: "精准捕到液氮啦！难怪科学秀上把液氮倒出来一碰到常温空气就剧烈沸腾——对 -196°C 的液氮来说，我们的室温就像滚烫的铁板一样热！"
  }
];
