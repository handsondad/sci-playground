export type DistanceMode = "perigee" | "apogee";

export type EclipseKind =
  | "total-solar"
  | "annular-solar"
  | "partial-solar"
  | "total-lunar"
  | "partial-lunar"
  | "none";

export type EclipseLevel = {
  id: number;
  title: string;
  startAngle: number;
  startTilt: number;
  startDistance: DistanceMode;
  startNodeAngle: number;
  lockTilt?: number;
  showNodeControl?: boolean;
  targetKind: EclipseKind;
  requireTiltedOrbit?: boolean;
  story: string;
  hint: string;
  win: string;
};

function shortestAngleDiff(a: number, b: number): number {
  const diff = (((a - b) % 360) + 540) % 360 - 180;
  return Math.abs(diff);
}

/**
 * 计算月球在当前轨道角 angleDeg 下偏离黄道面（日地连线平面）的黄纬角度（度）。
 * 当白道倾角 tiltDeg = 0° 时恒为 0°；
 * 当 tiltDeg = 5° 时，只有月球靠近黄白交点线 nodeAngleDeg（或对侧交点 +180°）时黄纬才接近 0°！
 */
export function eclipticLatitudeDeg(
  angleDeg: number,
  tiltDeg: number,
  nodeAngleDeg = 90
): number {
  const rad = ((angleDeg - nodeAngleDeg) * Math.PI) / 180;
  return tiltDeg * Math.sin(rad);
}

/**
 * 判定日月食类型：
 * - angleDeg = 0° 为朔（新月，月球位于太阳与地球之间）；180° 为望（满月，月球位于地球背日侧）。
 * - tiltDeg 为白道面相对黄道面倾角（0° 理想共面，5° 真实倾角）。
 * - distanceMode: "perigee" 近地点（本影够长，视直径盖住太阳 -> 日全食）；"apogee" 远地点（视直径略小，伪本影落地球 -> 日环食）。
 * - nodeAngleDeg: 黄白交点连线方向（默认 90° 与日地连线垂直，即非食季；转到 0° 或 180° 对准太阳时进入食季）。
 */
export function classifyEclipse(
  angleDeg: number,
  tiltDeg: number,
  distanceMode: DistanceMode,
  nodeAngleDeg = 90
): EclipseKind {
  const normAngle = ((angleDeg % 360) + 360) % 360;
  const absBeta = Math.abs(eclipticLatitudeDeg(normAngle, tiltDeg, nodeAngleDeg));

  const solarDiff = shortestAngleDiff(normAngle, 0);
  if (solarDiff <= 12 && absBeta <= 2.2) {
    if (solarDiff <= 5 && absBeta <= 1.2) {
      return distanceMode === "perigee" ? "total-solar" : "annular-solar";
    }
    return "partial-solar";
  }

  const lunarDiff = shortestAngleDiff(normAngle, 180);
  if (lunarDiff <= 14 && absBeta <= 2.4) {
    if (lunarDiff <= 6 && absBeta <= 1.4) {
      return "total-lunar";
    }
    return "partial-lunar";
  }

  return "none";
}

export function eclipseLabel(kind: EclipseKind): string {
  switch (kind) {
    case "total-solar":
      return "🌑 日全食（珍珠白日冕闪耀！）";
    case "annular-solar":
      return "💍 日环食（璀璨金边火环！）";
    case "partial-solar":
      return "🌘 日偏食（太阳被咬出一道月牙）";
    case "total-lunar":
      return "🌕 月全食（地球大气折射古铜红月亮！）";
    case "partial-lunar":
      return "🌗 月偏食（地球本影遮住半边满月）";
    default:
      return "✨ 无日月食（阴影擦肩而过）";
  }
}

export function checkEclipseGoal(
  level: EclipseLevel,
  angleDeg: number,
  tiltDeg: number,
  distanceMode: DistanceMode,
  nodeAngleDeg: number
): boolean {
  if (level.requireTiltedOrbit && tiltDeg < 4.5) return false;
  const kind = classifyEclipse(angleDeg, tiltDeg, distanceMode, nodeAngleDeg);
  if (level.id === 4) {
    // 第4关在 5° 真实白道倾角下，转动交点线对准太阳调出食季（产生日全食、日环食或月全食均可过关，重点聚焦日食食季）
    return tiltDeg >= 4.5 && (kind === "total-solar" || kind === "annular-solar");
  }
  return kind === level.targetKind;
}

export const eclipseLevels: readonly EclipseLevel[] = [
  {
    id: 1,
    title: "日全食与日冕",
    startAngle: 45,
    startTilt: 5,
    startDistance: "apogee",
    startNodeAngle: 90,
    targetKind: "total-solar",
    story: "太阳比月亮大 400 倍，却也刚好远 400 倍！请把白道倾角调平到【0°】，把月球转到日地正中间【0° 朔位】，并选【近地点 36万km】，让月球本影投在地球上观测日全食！",
    hint: "三步到位：① 轨道倾角选『0° 共面』；② 月地距离选『近地点 36万km』；③ 月球公转角滑到『0°』正挡住太阳！",
    win: "白昼变黑夜，珍珠色的太阳日冕露出来啦！宇宙中只有地球拥有『日全食时月亮刚好严丝合缝遮住太阳光球层』这份巧合礼物！"
  },
  {
    id: 2,
    title: "金边火环日环食",
    startAngle: 25,
    startTilt: 0,
    startDistance: "perigee",
    startNodeAngle: 0,
    targetKind: "annular-solar",
    story: "月球绕地球走的是椭圆轨道！如果新月那天月球刚好跑到【远地点 40.5万km】，看起来比太阳小一圈，本影够不着地面，『伪本影』落到地球上会看到什么奇观？",
    hint: "保持倾角 0°，把月球公转角对准 0°（日地中间），再把月地距离切换成『远地点 40.5万km』！",
    win: "哇，耀眼的『金边火环』！远地点月亮视直径比太阳小了一点点，遮不住最外一圈太阳边缘，就化作了天空中最闪亮的黄金戒指！"
  },
  {
    id: 3,
    title: "古铜红月亮",
    startAngle: 135,
    startTilt: 5,
    startDistance: "perigee",
    startNodeAngle: 90,
    targetKind: "total-lunar",
    story: "轮到地球挡住阳光啦！把倾角调回【0°】，将月球转到地球背光正后方【180° 望位（满月）】，看看钻进地球巨大本影里的月亮为什么没全黑，反而变成了古铜红色！",
    hint: "把白道倾角设为『0° 共面』，再把月球公转角推到 180°（地球正右方阴影锥中心）！",
    win: "红月亮升空！原来阳光擦过地球大气层时，蓝紫光被散射掉，波长最长的红橙光像穿过透镜一样折射进本影，给满月披上了红纱！"
  },
  {
    id: 4,
    title: "为什么每月不总有日食",
    startAngle: 0,
    startTilt: 5,
    startDistance: "perigee",
    startNodeAngle: 90,
    lockTilt: 5,
    showNodeControl: true,
    targetKind: "total-solar",
    requireTiltedOrbit: true,
    story: "月球每个月都过一次 0° 新月，为什么不是月月都有日食？因为真实白道有【5° 倾角】，平时月亮从太阳上方或下方溜走了！请保持 5° 倾角，转动【黄白交点线】对准太阳调出食季日食！",
    hint: "保持月球在 0° 新月位，把『☊ 黄白交点方向』滑块从 90° 转到 0°（或 180°），让轨道交点正好落在日地连线上，阴影立刻命中地球！",
    win: "彻底悟透食季啦！一年里黄白交点线只有两次指向太阳（间隔约半年），只有新月/满月恰好赶在交点附近，日月食才会盛大上演！"
  }
];
