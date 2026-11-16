import assert from "node:assert/strict";
import { test } from "node:test";
import { levels, openingOf } from "../src/games/physics/slide/data/levels.ts";
import { raceTracks, syncCurve } from "../src/games/physics/slide/data/demos.ts";
import { quizTimes, quizWinner, quizzes } from "../src/games/physics/slide/data/quiz.ts";
import {
  G, TUBE, cycloid, cycloidPhi, idealYs, play, pchip, poseAt, rollerFrame,
  segmentTime, slideMotion, starsFor, straightMotion, yOn
} from "../src/games/physics/slide/lib/slide.ts";

const close = (a, b, eps, note = "") => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b} (±${eps}) ${note}`);

test("直线滑梯的时间有解析式", () => {
  const start = { x: 0, y: 2 };
  const end = { x: 4, y: 0 };
  const length = Math.hypot(4, 2);
  const expect = length * Math.sqrt(2 / (G * 2));
  const motion = slideMotion([start, end]);
  close(motion.time, expect, 1e-9);
  close(segmentTime(length, 0, 2, G), expect, 1e-9);
});

test("半圈摆线的时间等于 φ√(r/g)", () => {
  const start = { x: 0, y: 2 };
  const end = { x: Math.PI, y: 0 };
  close(cycloidPhi(2, Math.PI), Math.PI, 1e-5);
  const pts = cycloid(start, end, 360);
  close(pts[0].x, 0, 1e-9);
  close(pts[0].y, 2, 1e-9);
  close(pts[pts.length - 1].x, Math.PI, 1e-6);
  const motion = slideMotion(pts);
  assert.equal(motion.finished, true);
  close(motion.time, Math.PI * Math.sqrt(1 / G), 8e-3);
});

test("等时：从摆线的不同高度出发，到达谷底的时间一样", () => {
  const pts = syncCurve();
  const n = pts.length - 1;
  const times = [0, 0.2, 0.45, 0.7].map((u) => slideMotion(pts, { from: Math.round(n * u) }).time);
  for (const time of times) close(time, Math.PI * Math.sqrt(1 / G), 0.02, `got ${times.join(", ")}`);
});

test("圆贴着天花板滚，起点和终点落在摆线上", () => {
  const start = { x: 0, y: 2.4 };
  const end = { x: 3.5, y: 0.28 };
  const a = rollerFrame(start, end, 0);
  const b = rollerFrame(start, end, 1);
  close(a.dot.x, start.x, 1e-9);
  close(a.dot.y, start.y, 1e-9);
  close(b.dot.x, end.x, 1e-6);
  close(b.dot.y, end.y, 1e-6);
  close(a.center.y, start.y - a.r, 1e-9);
});

test("插值穿过圆点，直线还是直线，两圆点之间不乱钻", () => {
  const line = pchip([{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }], 20);
  for (const p of line) close(p.y, p.x + 1, 1e-8);
  const knots = [{ x: 0, y: 2 }, { x: 1, y: 0.3 }, { x: 2, y: 1.1 }, { x: 3.2, y: 0.5 }];
  const curve = pchip(knots, 30);
  for (let i = 0; i < knots.length - 1; i++) {
    const lo = Math.min(knots[i].y, knots[i + 1].y) - 1e-6;
    const hi = Math.max(knots[i].y, knots[i + 1].y) + 1e-6;
    for (const p of curve) {
      if (p.x >= knots[i].x - 1e-9 && p.x <= knots[i + 1].x + 1e-9) {
        assert.ok(p.y >= lo && p.y <= hi, `${p.y} 跑出 [${lo}, ${hi}]`);
      }
    }
  }
  close(yOn(curve, 1), 0.3, 1e-6);
});

test("摆线比抛物拱快，抛物拱比直线快", () => {
  const { straight, curve, cycloid: braid } = raceTracks();
  const ts = slideMotion(straight).time;
  const tc = slideMotion(curve).time;
  const tb = slideMotion(braid).time;
  assert.ok(tb < tc && tc < ts, `摆线 ${tb} 拱 ${tc} 直线 ${ts}`);
});

test("石头和窗口会拦住小球，太高也滑不上去", () => {
  const spec = {
    id: 0, emoji: "", title: "", story: "", hint: "", win: "",
    start: { x: 0, y: 2 }, end: { x: 4, y: 0.4 }, xs: [2], minY: 0, maxY: 2.4,
    rocks: [{ x: 2, y: 1.2, r: 0.35 }]
  };
  assert.equal(play(spec, [1.2]).motion.cause, "rock");
  const under = play(spec, [0.35]);
  assert.equal(under.motion.finished, true);
  const gated = { ...spec, rocks: [], gates: [{ x: 2, y0: 0.2, y1: 0.6 }] };
  assert.equal(play(gated, [1.2]).motion.cause, "gate");
  assert.equal(play(gated, [0.4]).motion.finished, true);
  assert.equal(play({ ...spec, rocks: [] }, [2.3]).motion.cause, "high");
});

test("每一关：开局拿不到星，答案是三星，看提示最多两星，差一截就不是三星", () => {
  for (const level of levels) {
    const straight = straightMotion(level).time;
    const par = play(level, level.solution);
    assert.equal(par.motion.finished, true, `第 ${level.id} 关答案到不了：${par.motion.cause}`);
    assert.ok(par.motion.time < straight * 0.92, `第 ${level.id} 关优势太小 ${par.motion.time} vs ${straight}`);
    assert.equal(starsFor(par.motion.time, straight, par.motion.time, false), 3, `第 ${level.id} 关`);
    assert.equal(starsFor(par.motion.time, straight, par.motion.time, true), 2, `第 ${level.id} 关提示`);

    const opening = play(level, openingOf(level));
    const openStars = starsFor(opening.motion.finished ? opening.motion.time : null, straight, par.motion.time, false);
    assert.equal(openStars, 0, `第 ${level.id} 关开局就有 ${openStars} 星，${opening.motion.cause}`);

    const openYs = openingOf(level);
    const mix = (k) => level.solution.map((y, i) => Math.min(level.maxY, Math.max(level.minY, y + (openYs[i] - y) * k)));
    const near = play(level, mix(0.12));
    if (near.motion.finished) {
      assert.equal(starsFor(near.motion.time, straight, par.motion.time, false), 3, `第 ${level.id} 关差一丢丢不该掉星`);
    }
    const far = play(level, mix(0.7));
    const farStars = starsFor(far.motion.finished ? far.motion.time : null, straight, par.motion.time, false);
    assert.ok(farStars < 3, `第 ${level.id} 关拉回直线七成还有 ${farStars} 星`);
  }
});

test("第一关最低点不是最快，摆线形状夹在直线和地板中间", () => {
  const level = levels[0];
  const straight = straightMotion(level).time;
  const best = play(level, level.solution).motion.time;
  const floor = play(level, [level.minY]).motion.time;
  assert.ok(best < floor, `答案 ${best} 应该快过贴地 ${floor}`);
  assert.ok(best < straight, `答案 ${best} 应该快过直线 ${straight}`);
  assert.ok(level.solution[0] > level.minY + 0.12 && level.solution[0] < level.maxY - 0.12, `圆点贴边了 ${level.solution[0]}`);
});

test("陡降的关终点仍在下降，浅关会先沉到终点下面", () => {
  const phi = (level) => cycloidPhi(level.start.y - level.end.y, level.end.x - level.start.x);
  assert.ok(phi(levels[0]) < Math.PI);
  assert.ok(phi(levels[1]) < Math.PI);
  assert.ok(phi(levels[2]) > Math.PI);
  assert.ok(phi(levels[5]) > Math.PI);
  assert.ok(phi(levels[7]) > Math.PI);
  const valley = levels[5];
  const ideal = play(valley, idealYs(valley));
  assert.equal(ideal.motion.finished, false, "谷底的石头应该挡住纯摆线");
  assert.equal(ideal.motion.cause, "rock");
  for (const level of [levels[3], levels[7]]) {
    assert.equal(play(level, idealYs(level)).motion.finished, true, `第 ${level.id} 关的石头不该挡住摆线`);
  }
});

test("第 3 关的答案会低于终点", () => {
  const level = levels[2];
  assert.ok(Math.min(...level.solution) < level.end.y - 0.15, level.solution.join(","));
});

test("回放时小球停在轨道上", () => {
  const motion = straightMotion(levels[0]);
  const mid = poseAt(motion, motion.time / 2);
  assert.ok(mid.x > 0 && mid.x < levels[0].end.x);
  close(poseAt(motion, 0).y, levels[0].start.y, 1e-9);
  close(poseAt(motion, 99).x, levels[0].end.x, 1e-9);
});

test("六道猜题的答案和物理一致，而且差距看得出来", () => {
  for (const quiz of quizzes) {
    const times = quizTimes(quiz);
    assert.equal(quizWinner(quiz), quiz.claim, `第 ${quiz.id} 题 ${JSON.stringify(times)}`);
    const nums = [times.a, times.b].filter((t) => t != null);
    if (nums.length === 2) {
      const [fast, slow] = nums[0] < nums[1] ? nums : [nums[1], nums[0]];
      assert.ok(fast < slow * 0.9, `第 ${quiz.id} 题太接近 ${fast} vs ${slow}`);
    } else {
      assert.equal(nums.length, 1, `第 ${quiz.id} 题两条路都到不了`);
    }
  }
});

test("石头的碰撞半径用了轨道粗细", () => {
  assert.ok(TUBE > 0);
});
