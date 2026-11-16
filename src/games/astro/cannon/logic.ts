export type OrbitOutcome = "crash" | "circular" | "elliptical" | "escape";

export type CannonLevel = {
  id: number;
  title: string;
  startSpeed: number;
  goalOutcome: OrbitOutcome;
  minSpeed?: number;
  maxSpeed?: number;
  story: string;
  hint: string;
  win: string;
};

/**
 * 判定牛顿山顶大炮发射结局（地球第一宇宙速度 ~7.9 km/s，第二宇宙速度 ~11.2 km/s）。
 */
export function classifyLaunch(speedKmS: number): OrbitOutcome {
  if (speedKmS < 7.75) return "crash";
  if (speedKmS <= 8.15) return "circular";
  if (speedKmS < 11.2) return "elliptical";
  return "escape";
}

export function outcomeLabel(outcome: OrbitOutcome): string {
  if (outcome === "crash") return "💥 落回地面（亚轨道弧线）";
  if (outcome === "circular") return "🛰️ 正圆环绕（第一宇宙速度入轨）";
  if (outcome === "elliptical") return "💫 大椭圆高轨（远地点深入太空）";
  return "🚀 挣脱地球（第二宇宙速度逃逸）";
}

/**
 * 在以地心 (0,0)、地球半径 R_EARTH = 64、山顶发射点 (0, -72) 的无量纲引力场中积分出真实圆锥曲线轨迹！
 * 校准常数 GM 使 v = 7.9 km/s 恰好对应正圆轨道速度 sqrt(GM / r0)！
 */
export function simulateTrajectory(speedKmS: number): { points: [number, number][]; crashed: boolean } {
  const R_EARTH = 64;
  const r0 = 73; // mountaintop radius above Earth surface
  // Set GM so v_circ = 7.9 km/s => GM = r0 * 7.9^2
  const GM = r0 * 7.9 * 7.9;
  let x = 0;
  let y = -r0;
  let vx = speedKmS;
  let vy = 0;

  const dt = 0.22;
  const points: [number, number][] = [[x, y]];
  let crashed = false;

  for (let step = 0; step < 360; step++) {
    const r2 = x * x + y * y;
    const r = Math.sqrt(r2);
    if (r < R_EARTH) {
      crashed = true;
      break;
    }
    if (r > 260) {
      break;
    }
    const ax = (-GM * x) / (r2 * r);
    const ay = (-GM * y) / (r2 * r);
    // Velocity Verlet-like symplectic Euler step for rock-solid closed orbits
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    points.push([x, y]);

    // Stop after completing slightly over one full revolution back near top
    if (step > 80 && y < -60 && x >= 0 && points[points.length - 2][0] < 0) {
      points.push([0, -r0]);
      break;
    }
  }

  return { points, crashed };
}

export function checkCannonGoal(level: CannonLevel, speedKmS: number): boolean {
  if (classifyLaunch(speedKmS) !== level.goalOutcome) return false;
  if (level.minSpeed !== undefined && speedKmS < level.minSpeed) return false;
  if (level.maxSpeed !== undefined && speedKmS > level.maxSpeed) return false;
  return true;
}

export const cannonLevels: readonly CannonLevel[] = [
  {
    id: 1,
    title: "越过重洋的远射",
    startSpeed: 3.5,
    goalOutcome: "crash",
    minSpeed: 6.4,
    maxSpeed: 7.5,
    story: "1687 年牛顿在书中画了一座极高的山：水平开一炮！速度慢时炮弹很快落地；先把发射速度调到 6.4 ~ 7.5 km/s，让炮弹绕过小半个地球再落进远海！",
    hint: "别超过 7.8 km/s（否则就成卫星不落地啦），把初速度推到 7.0 km/s 左右开炮！",
    win: "看到大地弧线了吗！炮弹往前飞的同时地球表面也在往下弯，所以飞得越快落得越远——再快一点点会发生什么？"
  },
  {
    id: 2,
    title: "第一宇宙速度",
    startSpeed: 6.5,
    goalOutcome: "circular",
    story: "激动人心的时刻：调出黄金『第一宇宙速度』，让炮弹往下掉的弧度刚好等于地球表面弯曲的弧度——永远掉不回地面，化作正圆轨道人造卫星！",
    hint: "地球的第一宇宙速度是著名的 7.9 km/s！把速度调在 7.8 ~ 8.1 km/s 之间发射！",
    win: "入轨成功！原来太空站并不是没有重力，而是以每秒 7.9 千米的速度『一直在往地球掉，却每次都刚好擦肩而过』！"
  },
  {
    id: 3,
    title: "大椭圆深空侦察",
    startSpeed: 7.9,
    goalOutcome: "elliptical",
    minSpeed: 9.2,
    maxSpeed: 10.4,
    story: "如果我们把速度加到比 7.9 km/s 更快，但还没挣脱地球呢？试试用 9.2 ~ 10.4 km/s 发射，打出一条远地点甩向深空的大椭圆轨道！",
    hint: "把滑块推到 9.6 km/s 左右开炮，看炮弹在地球背面鼓出一个漂亮的椭圆大肚子再乖乖绕回来！",
    win: "太酷啦！地球同步卫星转移轨道（GTO）和嫦娥探月初期轨道，都是靠这样一脚油门把圆轨道拉成长椭圆的！"
  },
  {
    id: 4,
    title: "逃离地球奔深空",
    startSpeed: 9.5,
    goalOutcome: "escape",
    story: "终极点火：突破『第二宇宙速度（逃逸速度）』，让炮弹彻底挣脱地球引力井，头也不回地飞向星际空间！",
    hint: "地球的第二宇宙速度是 √2 × 7.9 ≈ 11.2 km/s！把速度推到 11.2 km/s 以上点火！",
    win: "再见地球，你好星辰大海！人类派往火星、木星和太阳系边缘的旅行者号探测器，全都跨过了这道 11.2 km/s 的大门！"
  }
];
