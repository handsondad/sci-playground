import {
  clampYs, idealYs, levelBounds, openingYs, solve, trackThrough, yOn, TUBE,
  type Gate, type LevelSpec, type Rock
} from "../lib/slide.ts";

export type Obstacle = "chord" | "valley" | "window";

type Draft = Omit<LevelSpec, "rocks" | "gates"> & { obstacle?: Obstacle };

const drafts: readonly Draft[] = [
  {
    id: 1, emoji: "🟡", title: "比直线快",
    story: "灰色小球沿着直滑梯滑。拖动中间的圆点，让黄色小球比它先碰到旗子。",
    hint: "往下放，开头会变陡。放得太低，路又绕远了，也不会最快。",
    win: "路变长了一点，小球却先到。陡的地方把速度攒了起来。",
    start: { x: 0, y: 2.2 }, end: { x: 2.8, y: 0.35 }, xs: [1.25],
    minY: 0.08, maxY: 2.2
  },
  {
    id: 2, emoji: "📉", title: "开头要陡",
    story: "三个圆点。最快的滑梯不是均匀地弯，是一出发就很陡，后面渐渐变平。",
    hint: "左边的点离直线更远，越往右越贴回终点。",
    win: "速度是在陡坡上攒的。开头一陡，后面平平的路也滑得飞快。",
    start: { x: 0, y: 2.8 }, end: { x: 3.2, y: 0.4 }, xs: [0.75, 1.6, 2.45],
    minY: 0.08, maxY: 2.8
  },
  {
    id: 3, emoji: "⬇️", title: "钻到旗子下面",
    story: "旗子只比起点低一点点。试着把滑梯修到比旗子更低的地方，再爬上去。",
    hint: "先沉下去，再升回旗子。最低的地方要比终点更低。",
    win: "终点并不低，最快的路却会先钻到终点下面。这条曲线叫摆线。",
    start: { x: 0, y: 2.05 }, end: { x: 4.6, y: 1.5 }, xs: [1.15, 2.3, 3.45],
    minY: 0.05, maxY: 2.05
  },
  {
    id: 4, emoji: "🪨", title: "躲开石头", obstacle: "chord",
    story: "直路中间有一块石头。绕开它，而且还要比直线更快。",
    hint: "从石头下面弯过去。开头仍然要陡。",
    win: "石头把近路挡住了。从下面绕，正好顺着更快的那条弯路。",
    start: { x: 0, y: 2.6 }, end: { x: 3.8, y: 0.4 }, xs: [0.95, 1.9, 2.85],
    minY: 0.08, maxY: 2.6
  },
  {
    id: 5, emoji: "🪟", title: "对准窗口", obstacle: "window",
    story: "滑梯必须从两根木桩中间穿过去。看看窗口卡在什么高度。",
    hint: "中间那个圆点要钻进窗口，不能碰到上下的木桩。",
    win: "窗口正好落在最快那条路经过的高度。对准它，快和准是同一件事。",
    start: { x: 0, y: 2.7 }, end: { x: 4, y: 0.45 }, xs: [1, 2, 3],
    minY: 0.08, maxY: 2.7
  },
  {
    id: 6, emoji: "⛰️", title: "谷底有石头", obstacle: "valley",
    story: "谷底蹲着一块石头，最深的那条路过不去。把滑梯抬高一点，又别抬得太高。",
    hint: "比最深的摆线浅一截，贴着石头上方擦过去。",
    win: "理想的摆线被石头挡住了。最快，是在能到达的路里面挑时间最短的那条。",
    start: { x: 0, y: 2.15 }, end: { x: 4.8, y: 1.4 }, xs: [1.2, 2.4, 3.6],
    minY: 0.05, maxY: 2.15
  },
  {
    id: 7, emoji: "🎯", title: "跟上摆线",
    story: "四个圆点。让整条滑梯贴上最快的形状，把时间压短。",
    hint: "还是开头陡、后面平。四个点一起挪，比只拉一个更像摆线。",
    win: "点越多，就越能贴上摆线。你已经会自己把最快的形状修出来了。",
    start: { x: 0, y: 3.2 }, end: { x: 4.4, y: 0.35 }, xs: [0.88, 1.76, 2.64, 3.52],
    minY: 0.08, maxY: 3.2
  },
  {
    id: 8, emoji: "🏆", title: "冠军滑梯", obstacle: "chord",
    story: "旗子很高，直路上还有石头。前面学的，这里都用得上。",
    hint: "先钻到旗子下面，躲开石头，再爬上去。",
    win: "直线最近，摆线最快。你把这条滑梯修好了。",
    start: { x: 0, y: 2.1 }, end: { x: 5, y: 1.45 }, xs: [1, 2.15, 3.3, 4.2],
    minY: 0.05, maxY: 2.1
  }
];

function chordRock(draft: Draft): Rock {
  const x = (draft.start.x + draft.end.x) / 2;
  const chordY = (draft.start.y + draft.end.y) / 2;
  const guide = trackThrough(draft.start, draft.end, draft.xs, idealYs({ ...draft }));
  const curveY = yOn(guide, x);
  const gap = chordY - curveY;
  const r = Math.min(0.34, Math.max(0.18, (gap - TUBE - 0.06) * 0.62));
  return { x, y: chordY, r };
}

function valleyRock(draft: Draft): Rock {
  const ys = idealYs({ ...draft });
  const track = trackThrough(draft.start, draft.end, draft.xs, ys);
  let bottom = track[0];
  for (const p of track) if (p.y < bottom.y) bottom = p;
  return { x: bottom.x, y: bottom.y, r: 0.3 };
}

function windowGate(draft: Draft): Gate {
  const ys = idealYs({ ...draft });
  const i = draft.xs.length >= 3 ? 1 : 0;
  return { x: draft.xs[i], y0: ys[i] - 0.13, y1: ys[i] + 0.13 };
}

function materialize(draft: Draft): Level {
  const rocks = draft.obstacle === "chord" ? [chordRock(draft)]
    : draft.obstacle === "valley" ? [valleyRock(draft)]
      : [];
  const gates = draft.obstacle === "window" ? [windowGate(draft)] : [];
  const spec: LevelSpec = { ...draft, rocks, gates };
  return { ...spec, obstacle: draft.obstacle, solution: solve(spec) };
}

export type Level = LevelSpec & { obstacle?: Obstacle; solution: number[] };

export const levels: readonly Level[] = drafts.map(materialize);

export function openingOf(level: Level): number[] {
  return clampYs(level, openingYs(level.start, level.end, level.xs));
}

export { levelBounds };
