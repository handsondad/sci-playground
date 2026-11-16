/** 平地上，射程 = v² sin(2θ) / g。45° 最远，同一个近处落点通常有一陡一平两个角度。 */

export function landing(speed: number, deg: number, g = 9.8) {
  const rad = (deg * Math.PI) / 180;
  return (speed * speed * Math.sin(2 * rad)) / g;
}

export function onTarget(speed: number, deg: number, target: number, tolerance: number) {
  return Math.abs(landing(speed, deg) - target) <= tolerance;
}

export function arc(speed: number, deg: number, g = 9.8) {
  const rad = (deg * Math.PI) / 180;
  const vx = speed * Math.cos(rad);
  const vy = speed * Math.sin(rad);
  const total = vy <= 0 ? 0 : (2 * vy) / g;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = total * (i / 24);
    pts.push({ x: vx * t, y: Math.max(0, vy * t - 0.5 * g * t * t) });
  }
  return pts;
}

const far = landing(10, 45);
const near = landing(10, 30);

export const shots = [
  {
    id: 1, title: "扔到最远", speed: 10, target: far, tol: 0.55,
    story: "速度不变。拖动角度，让球落在最远那面旗上。",
    win: "45° 最远。再陡，球把时间花在往上；再平，往前的速度不够。"
  },
  {
    id: 2, title: "近一点的旗", speed: 10, target: near, tol: 0.45,
    story: "旗子不在最远处。试试一个较平的角度，再试试一个较陡的。",
    win: "同一个落点有两个角度：一个平、一个陡。30° 和 60° 扔得一样远。"
  },
  {
    id: 3, title: "球更快了", speed: 14, target: landing(14, 45), tol: 0.8,
    story: "出手更快，最远的旗也更远。角度还是那个最远的角度。",
    win: "速度变了，最远的角度仍然是 45°。"
  }
] as const;
