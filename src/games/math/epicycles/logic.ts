/**
 * 「傅里叶圆周画板」纯数学逻辑层（复平面旋转本轮 Epicycles 轨迹合成）
 * 灵感致敬 Explorable Explanations《Seeing Circles, Sines, and Signals》。
 */

export type RotorSpec = {
  freq: number; // 整数角频率（正数为逆时针，负数为顺时针）
  label: string;
  color: string;
  locked?: boolean;
  startRadius: number;
  targetRadius: number;
};

export type EpicycleLevel = {
  id: number;
  title: string;
  story: string;
  dadTip: string;
  cheer: string;
  explain: string;
  rotors: readonly RotorSpec[];
  goalScore: number;
};

/** 计算角度 theta (弧度) 处各旋转圆臂节点坐标链 [(0,0), (x1,y1), ..., (xn,yn)]。 */
export function epicycleChainAt(
  freqs: readonly number[],
  radii: readonly number[],
  thetaRad: number
): [number, number][] {
  const chain: [number, number][] = [[0, 0]];
  let x = 0;
  let y = 0;
  for (let i = 0; i < freqs.length; i++) {
    const r = radii[i] ?? 0;
    const angle = freqs[i] * thetaRad;
    x += r * Math.cos(angle);
    y += r * Math.sin(angle);
    chain.push([x, y]);
  }
  return chain;
}

/** 采样一整圈闭合轨迹 (0..2π)。 */
export function sampleEpicycleCurve(
  freqs: readonly number[],
  radii: readonly number[],
  samples = 144
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const theta = (i / samples) * Math.PI * 2;
    const chain = epicycleChainAt(freqs, radii, theta);
    pts.push(chain[chain.length - 1]);
  }
  return pts;
}

/** 比较玩家轨迹与目标轨迹的几何吻合度 (0~100)。 */
export function epicycleMatchScore(
  freqs: readonly number[],
  yours: readonly number[],
  target: readonly number[]
): number {
  const pYours = sampleEpicycleCurve(freqs, yours, 120);
  const pTarget = sampleEpicycleCurve(freqs, target, 120);
  let errSq = 0;
  let normSq = 0;
  for (let i = 0; i < pYours.length; i++) {
    const dx = pYours[i][0] - pTarget[i][0];
    const dy = pYours[i][1] - pTarget[i][1];
    errSq += dx * dx + dy * dy;
    normSq += pTarget[i][0] ** 2 + pTarget[i][1] ** 2;
  }
  if (normSq < 1e-6) return 100;
  const relErr = Math.sqrt(errSq / normSq);
  return Math.max(0, Math.min(100, Math.round((1 - relErr * 1.4) * 100)));
}

export function checkEpicycleGoal(level: EpicycleLevel, radii: readonly number[]): boolean {
  const freqs = level.rotors.map((r) => r.freq);
  const target = level.rotors.map((r) => r.targetRadius);
  return epicycleMatchScore(freqs, radii, target) >= level.goalScore;
}

export const epicycleLevels: readonly EpicycleLevel[] = [
  {
    id: 1,
    title: "反旋双圆变椭圆",
    story: "只会转圈圈的圆规，怎么画出扁扁的椭圆？主圆臂 (+1 倍速) 半径锁在 64，请给顺时针倒着转的第二根圆臂 (−1 倍速) 调出合适长度，贴合绿色椭圆！",
    dadTip: "两根圆臂在左右两端同向相加变宽、在上下两端反向相减变扁！把反向圆臂半径调到 32 左右试试！",
    cheer: "哇！一正一反两个正圆叠在一起，笔尖居然画出了标准椭圆！",
    explain: "当 +1 倍速圆臂和 −1 倍速圆臂反向旋转时，水平方向它们并肩伸长到 R+r，竖直方向它们互相抵消缩成 R−r，完美合成任意扁率的椭圆！",
    goalScore: 93,
    rotors: [
      { freq: 1, label: "+1倍主圆臂", color: "#60a5fa", locked: true, startRadius: 64, targetRadius: 64 },
      { freq: -1, label: "−1倍反旋臂", color: "#f472b6", startRadius: 6, targetRadius: 32 }
    ]
  },
  {
    id: 2,
    title: "圆圈捏出三角星",
    story: "圆溜溜的机械臂能画出带尖角的三角形吗？主圆臂 (+1) 带着一根倒转两倍速的小圆臂 (−2)，快调调两根臂长，吻合绿色三尖内摆线！",
    dadTip: "主圆臂撑起大轮廓（调到 64 左右），−2 倍速小圆臂负责往外甩出三个尖角（调到 26 左右）！",
    cheer: "太神奇啦！明明全是圆周运动，笔尖每隔 120° 就甩出一个利落的尖角！",
    explain: "主臂逆时针走 1 圈时，小臂顺时针倒走 2 圈，两者相对转过了 1 − (−2) = 3 次同向叠加，于是圆圈被精准捏成了三面对称的三角内摆线！",
    goalScore: 92,
    rotors: [
      { freq: 1, label: "+1倍主圆臂", color: "#60a5fa", startRadius: 44, targetRadius: 64 },
      { freq: -2, label: "−2倍尖角臂", color: "#fbbf24", startRadius: 6, targetRadius: 26 }
    ]
  },
  {
    id: 3,
    title: "五瓣太空玫瑰星",
    story: "把第二根圆臂换成倒转四倍速 (−4)！猜猜 1 减 −4 会绽放出几片花瓣？调准两根圆臂长度，点亮这朵五角星花吧！",
    dadTip: "1 − (−4) = 5 瓣对称！先把 +1 主圆臂调大到 68，再把 −4 花瓣臂调到 22 左右！",
    cheer: "五角星花盛开啦！万花尺玩具的数学密码被你一眼看穿！",
    explain: "文具店里的齿轮万花尺就是一台机械傅里叶画板：内齿圈与小齿轮的转速差 k₁ − k₂ 等于几，画出来的图案就拥有几重旋转对称！",
    goalScore: 92,
    rotors: [
      { freq: 1, label: "+1倍主圆臂", color: "#60a5fa", startRadius: 48, targetRadius: 68 },
      { freq: -4, label: "−4倍星瓣臂", color: "#34d399", startRadius: 4, targetRadius: 22 }
    ]
  },
  {
    id: 4,
    title: "纯圆叠出正方形",
    story: "终极奇迹：只靠圆圈真的能画出四条直边的『正方形』吗？主圆臂 (+1) 锁在 72，请调配 −3 倍压边臂和 +5 倍修角臂，把圆圈压成方框！",
    dadTip: "1 − (−3) = 4 面对称！把 −3 倍压边臂调到 16 左右把四条弧边压直，再加一点点 +5 倍修角臂（约 4）修饰四个圆角！",
    cheer: "圆圈真的变成正方形啦！傅里叶爷爷说得对——万物轮廓皆可由圆圈画出！",
    explain: "这就是震撼数学界的离散傅里叶变换（DFT）：不管是正方形、汉字还是你亲笔签名的曲线，只要串联足够多不同转速的小圆圈，就能分毫不差地画出来！",
    goalScore: 92,
    rotors: [
      { freq: 1, label: "+1倍主圆臂", color: "#60a5fa", locked: true, startRadius: 72, targetRadius: 72 },
      { freq: -3, label: "−3倍压边臂", color: "#f97316", startRadius: 0, targetRadius: 16 },
      { freq: 5, label: "+5倍修角臂", color: "#a78bfa", startRadius: 16, targetRadius: 4 }
    ]
  }
];
