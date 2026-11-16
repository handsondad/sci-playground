/**
 * 「运动图像赛车」纯运动学逻辑层（v-t 速度时间图像斜率与位移积分）
 * 灵感致敬 Universe & More Motion Mapper。
 */

export type MotionPlan = {
  v0: number; // 初速度 0 ~ 8 m/s
  a1: number; // 0~3s 加速度 -3 ~ +3 m/s²
  a2: number; // 3~6s 加速度 -3 ~ +3 m/s²
};

export type MotionLevel = {
  id: number;
  title: string;
  lockA2?: boolean;
  lockV0?: boolean;
  story: string;
  dadTip: string;
  cheer: string;
  explain: string;
  start: MotionPlan;
  target: MotionPlan;
  goalScore: number;
};

/** 计算 t ∈ [0, 6] 秒时刻的瞬时速度 v(t) (m/s)。 */
export function velocityAt(plan: MotionPlan, tSec: number): number {
  const t = Math.max(0, Math.min(6, tSec));
  if (t <= 3) return plan.v0 + plan.a1 * t;
  const v3 = plan.v0 + plan.a1 * 3;
  return v3 + plan.a2 * (t - 3);
}

/** 计算 t ∈ [0, 6] 秒时刻累计跑过的位移 x(t) (m)，即 v-t 图线下方有向面积。 */
export function displacementAt(plan: MotionPlan, tSec: number): number {
  const t = Math.max(0, Math.min(6, tSec));
  if (t <= 3) {
    return plan.v0 * t + 0.5 * plan.a1 * t * t;
  }
  const x3 = plan.v0 * 3 + 0.5 * plan.a1 * 9;
  const v3 = plan.v0 + plan.a1 * 3;
  const dt = t - 3;
  return x3 + v3 * dt + 0.5 * plan.a2 * dt * dt;
}

/** 采样 0..6s 共 25 个点的曲线吻合度得分 (0~100)。 */
export function motionMatchScore(yours: MotionPlan, target: MotionPlan): number {
  let sqErr = 0;
  const n = 25;
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * 6;
    const diff = velocityAt(yours, t) - velocityAt(target, t);
    sqErr += diff * diff;
  }
  const rmse = Math.sqrt(sqErr / n);
  return Math.max(0, Math.min(100, Math.round(100 - rmse * 18)));
}

export function checkMotionGoal(level: MotionLevel, plan: MotionPlan): boolean {
  return motionMatchScore(plan, level.target) >= level.goalScore;
}

export const motionLevels: readonly MotionLevel[] = [
  {
    id: 1,
    title: "水平线是停还是走",
    lockA2: true,
    story: "看绿色目标 v-t 曲线：是一条停在 5.0 m/s 高度的水平直线！很多同学以为水平线代表小车停着不动，调调初速度和加速度，看小车到底怎么跑！",
    dadTip: "纵轴是速度 v！一直保持 5.0 m/s 说明是『匀速直线运动』：初速度调 5.0 m/s，加速度调 0 m/s²！",
    cheer: "完全重合！原来在 v-t 图里，水平线不是停车，而是不快不慢稳稳巡航！",
    explain: "看物理图像第一件事就是认清纵轴是谁：在位置图里水平线是静止，但在速度图（v-t 图）里，水平线代表每秒速度都不变，也就是加速度为 0 的匀速运动！",
    start: { v0: 2.0, a1: 1.5, a2: 0 },
    target: { v0: 5.0, a1: 0, a2: 0 },
    goalScore: 95
  },
  {
    id: 2,
    title: "斜坡越陡冲越猛",
    lockV0: true,
    story: "小车从静止 (0 m/s) 起跑，绿色目标线一路笔直爬升，6 秒末飙到了 9.0 m/s！前后两段需要多大的加速度才能踩出这条斜坡线？",
    dadTip: "6 秒钟速度增加了 9.0 m/s，每秒增加 9 ÷ 6 = 1.5 m/s！把前段和后段加速度都调到 +1.5 m/s²！",
    cheer: "斜率分毫不差！火箭车一路匀加速冲线！",
    explain: "v-t 图像的『斜率（陡峭程度）』就是加速度！直线往上翘说明在加速，越陡加速越猛；直线水平说明匀速；直线往下滑说明在减速！",
    start: { v0: 0, a1: 0.5, a2: 0.5 },
    target: { v0: 0, a1: 1.5, a2: 1.5 },
    goalScore: 95
  },
  {
    id: 3,
    title: "先加速再定速巡航",
    story: "目标变成了一条折线屋顶：小车以 2.0 m/s 起步，前 3 秒一口气冲上 8.0 m/s，后 3 秒保持 8.0 m/s 贴地巡航！快给火箭车编好两段程序！",
    dadTip: "初速度调 2.0 m/s；前 3 秒从 2 涨到 8（每秒涨 2），所以前段加速度 +2.0 m/s²；后 3 秒速度不变，后段加速度调 0！",
    cheer: "太丝滑啦！两段动作无缝衔接，完美复刻折线轨迹！",
    explain: "高铁出站也是这样开车的：先恒定推力斜线加速到巡航时速，达标后立刻把净加速度降为 0，在平直轨道上水平线匀速飞驰！",
    start: { v0: 4.0, a1: 0.5, a2: 1.0 },
    target: { v0: 2.0, a1: 2.0, a2: 0 },
    goalScore: 94
  },
  {
    id: 4,
    title: "冲刺急刹精准入库",
    story: "终极测试：小车以 3.0 m/s 进场，前 3 秒加速冲上 9.0 m/s 最高速，后 3 秒全力反推刹车，在 6.0 秒末恰好稳稳归零停进车库！",
    dadTip: "初速度调 3.0 m/s；前 3 秒涨 6 m/s（a₁ = +2.0 m/s²）；后 3 秒要从 9.0 降回 0（每秒减 3），所以后段加速度调 -3.0 m/s²！",
    cheer: "神级车手！6 秒末速度刚好归零，稳稳停在 31.5 米车位线上！",
    explain: "发现右下角的路程读数了吗？v-t 图线底下围成的『梯形或三角形面积』，刚好等于小车真正跑过的总路程——这就是微积分最美的物理起点！",
    start: { v0: 1.0, a1: 1.0, a2: -1.0 },
    target: { v0: 3.0, a1: 2.0, a2: -3.0 },
    goalScore: 94
  }
];
