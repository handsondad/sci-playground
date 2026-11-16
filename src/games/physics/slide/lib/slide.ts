/** 无摩擦小球贴着轨道滑。重力向下，y 朝上。摆线是最速降线，也是等时曲线。 */

export const G = 9.8;
/** 轨道有粗细，石头的碰撞半径比画出来的再大这么一截。 */
export const TUBE = 0.06;

export type Pt = { x: number; y: number };
export type Rock = { x: number; y: number; r: number };
export type Gate = { x: number; y0: number; y1: number };

export type LevelSpec = {
  id: number;
  emoji: string;
  title: string;
  story: string;
  hint: string;
  win: string;
  start: Pt;
  end: Pt;
  xs: number[];
  minY: number;
  maxY: number;
  rocks?: Rock[];
  gates?: Gate[];
};

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

export type Cause = "finish" | "high" | "rock" | "gate" | "stuck";

export type Sample = { t: number; x: number; y: number };

export type Motion = {
  samples: Sample[];
  finished: boolean;
  cause: Cause;
  time: number;
};

export function cycloidPhi(drop: number, run: number): number {
  if (run <= 0 || drop <= 0) throw new Error("摆线需要终点在起点的右下方");
  const k = drop / run;
  let lo = 1e-4;
  let hi = Math.PI * 2 - 1e-4;
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    const ratio = (1 - Math.cos(mid)) / (mid - Math.sin(mid));
    if (ratio > k) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** 圆贴着起点的高度往右滚，边缘一点画出的摆线。终点落在 (end.x, end.y)。 */
export function cycloid(start: Pt, end: Pt, n = 96): Pt[] {
  const run = end.x - start.x;
  const drop = start.y - end.y;
  const phi = cycloidPhi(drop, run);
  const r = run / (phi - Math.sin(phi));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (phi * i) / n;
    pts.push({
      x: start.x + r * (t - Math.sin(t)),
      y: start.y - r * (1 - Math.cos(t))
    });
  }
  pts[pts.length - 1] = { x: end.x, y: end.y };
  return pts;
}

export function rollerFrame(start: Pt, end: Pt, u: number) {
  const run = end.x - start.x;
  const drop = start.y - end.y;
  const phiEnd = cycloidPhi(drop, run);
  const r = run / (phiEnd - Math.sin(phiEnd));
  const phi = Math.min(1, Math.max(0, u)) * phiEnd;
  return {
    r,
    phi,
    phiEnd,
    ceilingY: start.y,
    center: { x: start.x + r * phi, y: start.y - r },
    dot: {
      x: start.x + r * (phi - Math.sin(phi)),
      y: start.y - r * (1 - Math.cos(phi))
    }
  };
}

export function yOn(points: readonly Pt[], x: number): number {
  if (x <= points[0].x) return points[0].y;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (x <= b.x) {
      const u = (x - a.x) / (b.x - a.x || 1);
      return a.y + (b.y - a.y) * u;
    }
  }
  return points[points.length - 1].y;
}

export function cycloidYs(start: Pt, end: Pt, xs: readonly number[]): number[] {
  const curve = cycloid(start, end, 480);
  return xs.map((x) => yOn(curve, x));
}

export function openingYs(start: Pt, end: Pt, xs: readonly number[]): number[] {
  const run = end.x - start.x;
  return xs.map((x) => start.y + (end.y - start.y) * ((x - start.x) / run));
}

export function clampYs(spec: { minY: number; maxY: number }, ys: readonly number[]): number[] {
  return ys.map((y) => Math.min(spec.maxY, Math.max(spec.minY, y)));
}

/** 过两点的抛物拱。midY 是中点高度。 */
export function arch(start: Pt, end: Pt, midY: number, n = 48): Pt[] {
  const chordMid = (start.y + end.y) / 2;
  const extra = midY - chordMid;
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = start.x + (end.x - start.x) * t;
    const chord = start.y + (end.y - start.y) * t;
    pts.push({ x, y: chord + 4 * extra * t * (1 - t) });
  }
  return pts;
}

function sampleLine(a: Pt, b: Pt, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return pts;
}

function endpointSlope(h0: number, h1: number, d0: number, d1: number): number {
  const m = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
  if (m * d0 <= 0) return 0;
  if (d0 * d1 <= 0 && Math.abs(m) > Math.abs(3 * d0)) return 3 * d0;
  return m;
}

/**
 * 分段三次埃尔米特插值。每一段单独限制斜率，曲线一定穿过圆点，
 * 而且不会在两个圆点之间偷偷钻得更低或更高。
 */
export function pchip(knots: readonly Pt[], steps = 26): Pt[] {
  if (knots.length < 2) return knots.slice();
  if (knots.length === 2) return sampleLine(knots[0], knots[1], steps);
  const n = knots.length - 1;
  const x = knots.map((p) => p.x);
  const y = knots.map((p) => p.y);
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n; i++) {
    h[i] = x[i + 1] - x[i];
    d[i] = (y[i + 1] - y[i]) / h[i];
  }
  const m = new Array<number>(n + 1);
  m[0] = endpointSlope(h[0], h[1], d[0], d[1]);
  m[n] = endpointSlope(h[n - 1], h[n - 2], d[n - 1], d[n - 2]);
  for (let i = 1; i < n; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    let left = m[i];
    let right = m[i + 1];
    if (d[i] === 0) {
      left = 0;
      right = 0;
    } else {
      const ta = left / d[i];
      const tb = right / d[i];
      const s = ta * ta + tb * tb;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        left = tau * ta * d[i];
        right = tau * tb * d[i];
      }
    }
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      out.push({
        x: x[i] + h[i] * t,
        y: h00 * y[i] + h10 * h[i] * left + h01 * y[i + 1] + h11 * h[i] * right
      });
    }
  }
  out.push(knots[n]);
  return out;
}

export function trackThrough(start: Pt, end: Pt, xs: readonly number[], ys: readonly number[]): Pt[] {
  const knots: Pt[] = [start];
  xs.forEach((x, i) => knots.push({ x, y: ys[i] }));
  knots.push(end);
  return pchip(knots, 26);
}

/** 高度线性变化的一小段上，从静止势能积分出来的时间。h 是起点高度减去当前高度。 */
export function segmentTime(length: number, h0: number, h1: number, g = G): number {
  if (length < 1e-12) return 0;
  if (h0 <= 1e-12 && h1 <= 1e-12) return Number.POSITIVE_INFINITY;
  if (Math.abs(h1 - h0) < 1e-10) return length / Math.sqrt(2 * g * Math.max(h0, h1));
  return (length / Math.sqrt(2 * g)) * (2 * (Math.sqrt(h1) - Math.sqrt(h0))) / (h1 - h0);
}

function hitCircle(a: Pt, b: Pt, c: Pt, r: number): number | null {
  if (Math.hypot(a.x - c.x, a.y - c.y) <= r) return 0;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const fx = a.x - c.x;
  const fy = a.y - c.y;
  const A = dx * dx + dy * dy;
  if (A < 1e-14) return null;
  const B = 2 * (fx * dx + fy * dy);
  const C = fx * fx + fy * fy - r * r;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const ts = [(-B - root) / (2 * A), (-B + root) / (2 * A)].filter((t) => t > 0 && t <= 1);
  if (!ts.length) return null;
  return Math.min(...ts);
}

export function slideMotion(points: readonly Pt[], opts: {
  from?: number;
  g?: number;
  rocks?: readonly Rock[];
  gates?: readonly Gate[];
  tube?: number;
} = {}): Motion {
  const g = opts.g ?? G;
  const tube = opts.tube ?? TUBE;
  const from = opts.from ?? 0;
  const rocks = opts.rocks ?? [];
  const gates = opts.gates ?? [];
  const energy = points[from].y;
  const samples: Sample[] = [{ t: 0, x: points[from].x, y: points[from].y }];
  let time = 0;

  const push = (t: number, p: Pt) => {
    const last = samples[samples.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < 1e-8 && Math.abs(t - last.t) < 1e-10) return;
    samples.push({ t, x: p.x, y: p.y });
  };

  const stop = (cause: Cause): Motion => ({ samples, finished: false, cause, time });

  for (let i = from; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const ha = energy - a.y;
    const hb = energy - b.y;
    if (ha < -1e-6) return stop("high");

    let stopU: number | null = null;
    let cause: Cause | null = null;
    const consider = (u: number, why: Cause) => {
      if (u < -1e-6 || u > 1 + 1e-6) return;
      const uu = Math.min(1, Math.max(0, u));
      if (stopU == null || uu < stopU) {
        stopU = uu;
        cause = why;
      }
    };

    if (hb < -1e-6) consider(ha / (ha - hb), "high");
    for (const rock of rocks) {
      const u = hitCircle(a, b, rock, rock.r + tube);
      if (u != null) consider(u, "rock");
    }
    for (const gate of gates) {
      const dx = b.x - a.x;
      if (Math.abs(dx) < 1e-12) continue;
      const u = (gate.x - a.x) / dx;
      if (u < -1e-6 || u > 1 + 1e-6) continue;
      const y = a.y + (b.y - a.y) * Math.min(1, Math.max(0, u));
      if (y < gate.y0 - 1e-6 || y > gate.y1 + 1e-6) consider(u, "gate");
    }

    const uEnd = stopU ?? 1;
    const endPt = { x: a.x + (b.x - a.x) * uEnd, y: a.y + (b.y - a.y) * uEnd };
    const h0 = Math.max(0, ha);
    const h1 = Math.max(0, energy - endPt.y);
    const length = Math.hypot(endPt.x - a.x, endPt.y - a.y);
    const dt = segmentTime(length, h0, h1, g);
    if (!Number.isFinite(dt)) return stop("stuck");

    const steps = 4;
    for (let s = 1; s < steps; s++) {
      const u = (uEnd * s) / steps;
      const p = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      const len = Math.hypot(p.x - a.x, p.y - a.y);
      push(time + segmentTime(len, h0, Math.max(0, energy - p.y), g), p);
    }
    time += dt;
    push(time, endPt);
    if (cause) return stop(cause);
  }

  return { samples, finished: true, cause: "finish", time };
}

export function poseAt(motion: Motion, t: number): Pt {
  const s = motion.samples;
  if (t <= s[0].t) return s[0];
  const last = s[s.length - 1];
  if (t >= last.t) return last;
  let lo = 0;
  let hi = s.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid].t < t) lo = mid;
    else hi = mid;
  }
  const a = s[lo];
  const b = s[hi];
  const u = (t - a.t) / (b.t - a.t || 1);
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

export function play(spec: LevelSpec, ys: readonly number[]): { points: Pt[]; motion: Motion } {
  const points = trackThrough(spec.start, spec.end, spec.xs, ys);
  const motion = slideMotion(points, { rocks: spec.rocks, gates: spec.gates });
  return { points, motion };
}

export function straightMotion(spec: Pick<LevelSpec, "start" | "end">): Motion {
  return slideMotion(sampleLine(spec.start, spec.end, 24));
}

export function idealYs(spec: LevelSpec): number[] {
  return clampYs(spec, cycloidYs(spec.start, spec.end, spec.xs));
}

function finishTime(spec: LevelSpec, ys: readonly number[]): number | null {
  const motion = play(spec, ys).motion;
  return motion.finished ? motion.time : null;
}

function descend(spec: LevelSpec, seed: readonly number[]): number[] {
  let ys = seed.slice();
  let best = finishTime(spec, ys);
  if (best == null) return ys;
  for (const step of [0.16, 0.08, 0.04, 0.02, 0.01]) {
    for (let guard = 0; guard < 48; guard++) {
      let improved = false;
      for (let i = 0; i < ys.length; i++) {
        for (const dir of [-1, 1]) {
          const y = Math.min(spec.maxY, Math.max(spec.minY, ys[i] + dir * step));
          if (Math.abs(y - ys[i]) < 1e-9) continue;
          const next = ys.slice();
          next[i] = y;
          const t = finishTime(spec, next);
          if (t != null && t < best - 1e-4) {
            ys = next;
            best = t;
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
  }
  return ys;
}

/** 从摆线出发，找出这些圆点能搭出的最快轨道。被挡住时先抬高，再贴着障碍往下修。 */
export function solve(spec: LevelSpec): number[] {
  const guide = idealYs(spec);
  if (finishTime(spec, guide) != null) return descend(spec, guide);

  let bestYs = clampYs(spec, openingYs(spec.start, spec.end, spec.xs));
  let bestT = finishTime(spec, bestYs);
  const consider = (ys: number[]) => {
    const t = finishTime(spec, ys);
    if (t != null && (bestT == null || t < bestT)) {
      bestYs = ys;
      bestT = t;
    }
  };
  for (let lift = 0.05; lift <= 1.8; lift += 0.05) {
    consider(clampYs(spec, guide.map((y) => y + lift)));
    for (let i = 0; i < guide.length; i++) {
      const one = guide.slice();
      one[i] = guide[i] + lift;
      consider(clampYs(spec, one));
    }
  }
  return descend(spec, bestYs);
}

export function starsFor(time: number | null, straight: number, par: number, hinted: boolean): number {
  if (time == null || !(time < straight - 0.025)) return 0;
  // 最快的形状附近很平：差一截仍然很快。三星要贴近答案，两星是明显弯对了方向。
  let stars = 1;
  if (time <= par * 1.12) stars = 2;
  if (time <= par * 1.025) stars = 3;
  if (hinted) stars = Math.min(stars, 2);
  return stars;
}

export function boundsAround(groups: readonly (readonly Pt[])[], padX = 0.45, padY = 0.4): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const group of groups) {
    for (const p of group) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }
  return { minX: minX - padX, maxX: maxX + padX + 0.15, minY: minY - padY, maxY: maxY + padY + 0.35 };
}

export function levelBounds(spec: LevelSpec): Bounds {
  const pts: Pt[] = [
    spec.start,
    spec.end,
    { x: spec.start.x, y: spec.minY },
    { x: spec.end.x, y: spec.maxY }
  ];
  for (const rock of spec.rocks ?? []) {
    pts.push({ x: rock.x - rock.r, y: rock.y - rock.r }, { x: rock.x + rock.r, y: rock.y + rock.r });
  }
  for (const gate of spec.gates ?? []) {
    pts.push({ x: gate.x, y: gate.y0 }, { x: gate.x, y: gate.y1 });
  }
  return boundsAround([pts], 0.5, 0.35);
}
