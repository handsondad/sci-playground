/**
 * 「电场冰球」纯物理逻辑层（库仑定律曲线弹道积分）
 * 灵感致敬 PhET Electric Field Hockey 与 Universe & More Magnetism Mini Golf。
 */

export type ObstacleBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ElectrodeSpec = {
  id: string;
  label: string;
  x: number;
  y: number;
  startQ: number;
};

export type HockeyLevel = {
  id: number;
  title: string;
  story: string;
  dadTip: string;
  cheer: string;
  explain: string;
  puckStart: { x: number; y: number; vx: number; vy: number };
  goal: { x: number; y: number; halfH: number };
  obstacles: readonly ObstacleBox[];
  electrodes: readonly ElectrodeSpec[];
  sampleSolution: readonly number[];
};

export type ShotOutcome = "goal" | "wall" | "electrode" | "out";

export type ShotTrace = {
  points: [number, number][];
  outcome: ShotOutcome;
  minDistToGoal: number;
};

const RINK_MIN_X = 20;
const RINK_MAX_X = 540;
const RINK_MIN_Y = 20;
const RINK_MAX_Y = 300;
const COULOMB_K = 240000;
const SOFTEN_SQ = 320;

/** 计算空间某点受到各电极产生的库仑加速度矢量（冰球带 +1 正电荷）。 */
export function electricFieldAt(
  px: number,
  py: number,
  electrodes: readonly ElectrodeSpec[],
  charges: readonly number[]
): { ax: number; ay: number } {
  let ax = 0;
  let ay = 0;
  for (let i = 0; i < electrodes.length; i++) {
    const q = charges[i] ?? 0;
    if (Math.abs(q) < 1e-6) continue;
    const dx = px - electrodes[i].x;
    const dy = py - electrodes[i].y;
    const r2 = dx * dx + dy * dy + SOFTEN_SQ;
    const invR3 = 1 / (r2 * Math.sqrt(r2));
    // 正冰球受正电极排斥（沿 dx, dy 向外），受负电极吸引（向内）
    ax += COULOMB_K * q * dx * invR3;
    ay += COULOMB_K * q * dy * invR3;
  }
  return { ax, ay };
}

function hitsBox(x: number, y: number, r: number, box: ObstacleBox): boolean {
  return x + r >= box.x && x - r <= box.x + box.w && y + r >= box.y && y - r <= box.y + box.h;
}

/** 数值积分冰球在静电场中的完整运动轨迹。 */
export function simulatePuck(level: HockeyLevel, charges: readonly number[]): ShotTrace {
  let { x, y, vx, vy } = level.puckStart;
  const points: [number, number][] = [[x, y]];
  const dt = 0.016;
  const puckRadius = 7;
  let minDistToGoal = Math.hypot(x - level.goal.x, y - level.goal.y);

  for (let step = 0; step < 360; step++) {
    const { ax, ay } = electricFieldAt(x, y, level.electrodes, charges);
    vx += ax * dt;
    vy += ay * dt;
    const prevX = x;
    const prevY = y;
    x += vx * dt;
    y += vy * dt;
    points.push([x, y]);

    const distGoal = Math.hypot(x - level.goal.x, y - level.goal.y);
    if (distGoal < minDistToGoal) minDistToGoal = distGoal;

    // 检查是否穿过右侧球门线
    if (prevX < level.goal.x && x >= level.goal.x) {
      const frac = (level.goal.x - prevX) / Math.max(1e-6, x - prevX);
      const crossY = prevY + (y - prevY) * frac;
      if (Math.abs(crossY - level.goal.y) <= level.goal.halfH) {
        points[points.length - 1] = [level.goal.x + 8, crossY];
        return { points, outcome: "goal", minDistToGoal: 0 };
      }
    }

    // 检查是否吸到负电极核心上
    for (let i = 0; i < level.electrodes.length; i++) {
      if ((charges[i] ?? 0) !== 0 && Math.hypot(x - level.electrodes[i].x, y - level.electrodes[i].y) < 14) {
        return { points, outcome: "electrode", minDistToGoal };
      }
    }

    // 检查是否撞上冰墙障碍
    for (const box of level.obstacles) {
      if (hitsBox(x, y, puckRadius, box)) {
        return { points, outcome: "wall", minDistToGoal };
      }
    }

    // 检查是否飞出冰场边界
    if (x < RINK_MIN_X || x > RINK_MAX_X || y < RINK_MIN_Y || y > RINK_MAX_Y) {
      return { points, outcome: "out", minDistToGoal };
    }
  }

  return { points, outcome: "out", minDistToGoal };
}

export function checkHockeyGoal(level: HockeyLevel, charges: readonly number[]): boolean {
  return simulatePuck(level, charges).outcome === "goal";
}

export const hockeyLevels: readonly HockeyLevel[] = [
  {
    id: 1,
    title: "同种相斥推下弯",
    story: "带正电（+）的红色冰球向右滑出，正前方被冰墙挡住了！上方固定了一枚电极 A，给它充上正电还是负电，才能把冰球往下推过冰墙、射进右下球门？",
    dadTip: "记住口诀『同种电荷相排斥』！电极 A 在冰球上方，把它的电量调到 +2.5 到 +3.5 左右，就能隔空把正电冰球往下推开！",
    cheer: "哇！根本不用球杆碰它，正电荷隔着空气就把冰球推拐弯进门啦！",
    explain: "带同种正电的两个物体之间充满无形的静电排斥力！离电极越近，库仑力按距离平方反比急剧变强，像一只看不见的弹簧手把冰球推向下方球门。",
    puckStart: { x: 64, y: 152, vx: 235, vy: 0 },
    goal: { x: 496, y: 246, halfH: 40 },
    obstacles: [{ x: 268, y: 120, w: 18, h: 48 }],
    electrodes: [{ id: "A", label: "电极 A", x: 210, y: 98, startQ: 0 }],
    sampleSolution: [3.0]
  },
  {
    id: 2,
    title: "异种相吸吊高球",
    story: "这回下半场全被高高的冰墙封死了，球门挂在右上角！电极 A 架在冰场上方，快试试用相反极性的电荷把正电冰球『吸』过墙头！",
    dadTip: "正电冰球会被负电荷吸引！把上方电极 A 往左拉成负电（约 -3.0 ~ -3.5），注意别调太猛吸到电极身上哦！",
    cheer: "太帅啦！蓝色负电极像磁铁一样把冰球提起来，刚好擦着墙头飞进球门！",
    explain: "『异种电荷相吸引』！负电极把向右飞的正冰球往上拉出一条优美的弧线，就像宇宙飞船借行星引力弹弓拐弯一样。",
    puckStart: { x: 64, y: 168, vx: 235, vy: 0 },
    goal: { x: 496, y: 72, halfH: 44 },
    obstacles: [{ x: 274, y: 158, w: 18, h: 142 }],
    electrodes: [{ id: "A", label: "电极 A", x: 210, y: 108, startQ: 1.5 }],
    sampleSolution: [-3.5]
  },
  {
    id: 3,
    title: "一推一拉蛇形弯",
    story: "冰场上立着一上一下两道交错冰墙！必须先往上绕过第一道墙，再往下折回右下角球门。协调 A、B 两枚电极，打出漂亮的 S 形弧线球吧！",
    dadTip: "电极 A 在左下，充正电（如 +4.0）能把冰球往上推过第一道墙；电极 B 在右上，充正电（如 +4.0）就能把飞高了的冰球再往下压进球门！",
    cheer: "天呐！S 形超级香蕉球穿过了两道冰墙，正中红心！",
    explain: "空间里的总电场遵循『矢量叠加原理』：冰球在前半程主要听左下电极指挥往上翘，滑到后半程又被右上电极往下压，粒子加速器就是靠一排排电极给粒子导航的！",
    puckStart: { x: 60, y: 168, vx: 235, vy: 0 },
    goal: { x: 496, y: 220, halfH: 42 },
    obstacles: [
      { x: 224, y: 158, w: 16, h: 142 },
      { x: 382, y: 20, w: 16, h: 112 }
    ],
    electrodes: [
      { id: "A", label: "左下电极 A", x: 170, y: 224, startQ: 0 },
      { id: "B", label: "右上电极 B", x: 326, y: 66, startQ: 0 }
    ],
    sampleSolution: [4.0, 4.0]
  },
  {
    id: 4,
    title: "窄门库仑绝杀",
    story: "冠军赛球门缩窄啦，正中央还横着一座冰岛！先绕开中央冰岛，再把偏航的冰球重新校准送入正中窄门，考验你对库仑平方反比定律的手感！",
    dadTip: "让左上电极 A 带 +3.5 把冰球往下推过冰岛下沿，再让右下电极 B 带 +4.0 把冰球轻轻托回中间高度！",
    cheer: "不可思议！绕岛回旋一剑封喉，你是真正的电磁冰球总冠军！",
    explain: "库仑定律 F = k·q₁q₂/r² 是电磁学的基石：距离减半，电力猛增到 4 倍！电视显像管、质谱仪和大型强子对撞机，全靠精密调控电场和磁场让微观粒子百步穿杨。",
    puckStart: { x: 60, y: 160, vx: 235, vy: 0 },
    goal: { x: 496, y: 168, halfH: 42 },
    obstacles: [{ x: 254, y: 136, w: 20, h: 46 }],
    electrodes: [
      { id: "A", label: "前场电极 A", x: 192, y: 102, startQ: 0 },
      { id: "B", label: "后场电极 B", x: 365, y: 274, startQ: 0 }
    ],
    sampleSolution: [3.5, 4.0]
  }
];
