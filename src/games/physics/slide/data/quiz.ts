import { clampYs, cycloidYs, openingYs, play, type LevelSpec, type Pt } from "../lib/slide.ts";

const frame: Pick<LevelSpec, "start" | "end" | "xs" | "minY" | "maxY"> = {
  start: { x: 0, y: 2.4 },
  end: { x: 4.2, y: 0.55 },
  xs: [1.05, 2.1, 3.15],
  minY: 0.08,
  maxY: 2.4
};

const lowFrame: Pick<LevelSpec, "start" | "end" | "xs" | "minY" | "maxY"> = {
  start: { x: 0, y: 2 },
  end: { x: 4.6, y: 1.55 },
  xs: [1.15, 2.3, 3.45],
  minY: 0.05,
  maxY: 2
};

function line(spec: Pick<LevelSpec, "start" | "end" | "xs">): number[] {
  return openingYs(spec.start, spec.end, spec.xs);
}

function braid(spec: Pick<LevelSpec, "start" | "end" | "xs" | "minY" | "maxY">): number[] {
  return clampYs(spec, cycloidYs(spec.start, spec.end, spec.xs));
}

export type Quiz = {
  id: number;
  prompt: string;
  why: string;
  claim: "a" | "b";
  spec: Pick<LevelSpec, "start" | "end" | "xs" | "minY" | "maxY" | "rocks" | "gates">;
  a: number[];
  b: number[];
};

const mid = braid(frame);
const straight = line(frame);

export const quizzes: readonly Quiz[] = [
  {
    id: 1,
    prompt: "一条笔直，一条往下弯。谁先到旗子？",
    why: "弯下去的那条开头更陡，小球先把速度攒起来。路长了一点，时间反而更短。",
    claim: "b",
    spec: frame,
    a: straight,
    b: mid
  },
  {
    id: 2,
    prompt: "两条都在弯。一条刚出发就沉下去，一条快到终点才沉。谁更快？",
    why: "先陡的那条一路都带着高速度。把陡坡留到最后，前面就浪费了。",
    claim: "a",
    spec: frame,
    a: [0.85, 0.7, 0.62],
    b: [2.15, 1.85, 0.7]
  },
  {
    id: 3,
    prompt: "红线先贴着高处走，快到终点才掉下去。蓝线一开始就沉下去。谁先到？",
    why: "贴在高处的时候，小球几乎没有速度。陡坡要放在开头，后面整段路才滑得动。",
    claim: "b",
    spec: frame,
    a: [2.3, 2.15, 1.15],
    b: mid
  },
  {
    id: 4,
    prompt: "终点几乎不比起点低。贴着直线慢慢降，和先钻到终点下面，谁先到？",
    why: "终点高，不等于路上不能先沉下去。钻到下面再爬上来，到达的时候速度已经很大了。",
    claim: "b",
    spec: lowFrame,
    a: line(lowFrame),
    b: braid(lowFrame)
  },
  {
    id: 5,
    prompt: "两根木桩中间有个窗口。谁能钻过去，先碰到旗子？",
    why: "红线从木桩外面过去，不算到达。蓝线正好穿过窗口，那个高度也是更快的路。",
    claim: "b",
    spec: {
      ...frame,
      gates: [{ x: frame.xs[1], y0: mid[1] - 0.12, y1: mid[1] + 0.12 }]
    },
    a: straight,
    b: mid
  },
  {
    id: 6,
    prompt: "红线直直地冲，蓝线从旁边弯过去。注意路上的石头。",
    why: "红线撞上石头，到不了旗子。能到达，比看起来近更要紧。蓝线还顺便走了更快的弯路。",
    claim: "b",
    spec: {
      ...frame,
      rocks: [{ x: 2.1, y: (frame.start.y + frame.end.y) / 2, r: 0.28 }]
    },
    a: straight,
    b: mid
  }
];

export function quizTimes(quiz: Quiz): { a: number | null; b: number | null } {
  const spec = { id: 0, emoji: "", title: "", story: "", hint: "", win: "", ...quiz.spec };
  return {
    a: finished(spec, quiz.a),
    b: finished(spec, quiz.b)
  };
}

function finished(spec: LevelSpec, ys: number[]): number | null {
  const motion = play(spec, ys).motion;
  return motion.finished ? motion.time : null;
}

export function quizWinner(quiz: Quiz): "a" | "b" {
  const { a, b } = quizTimes(quiz);
  if (a == null) return "b";
  if (b == null) return "a";
  return a < b ? "a" : "b";
}

export type TrackPts = Pt[];
