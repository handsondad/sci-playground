import assert from "node:assert/strict";
import test from "node:test";
import { covers, oddNodes, boards } from "../src/games/math/euler/logic.ts";
import { fewest, moveDisk, solved, startTowers } from "../src/games/math/hanoi/logic.ts";
import { cast, mirrorLevels, reflect } from "../src/games/physics/mirrors/logic.ts";
import { cups, drops, pour } from "../src/games/chemistry/ph/logic.ts";
import { atoms, imbalance, reactions } from "../src/games/chemistry/balance/logic.ts";
import { matches, partner } from "../src/games/biology/pairs/logic.ts";
import { chains, ordered } from "../src/games/biology/chain/logic.ts";
import { angleDiff, hitPhase } from "../src/games/astro/moon/logic.ts";
import { brine, pose } from "../src/games/physics/float/logic.ts";
import { lengthFor, matched, period } from "../src/games/physics/pendulum/logic.ts";
import { landing, onTarget, shots } from "../src/games/physics/toss/logic.ts";
import { fault } from "../src/games/chemistry/layers/logic.ts";
import { fizz, gas } from "../src/games/chemistry/fizz/logic.ts";
import { shift } from "../src/games/biology/osmosis/logic.ts";
import { hostOpens, tally, wins } from "../src/games/math/monty/logic.ts";
import { atMark, northSeason, southSeason } from "../src/games/astro/seasons/logic.ts";
import { matchScore, sampleWave, waveLevels } from "../src/games/physics/waves/logic.ts";
import { allPrimesFound, isPrime, primeLevels, remainingNumbers, twinPrimesUpTo } from "../src/games/math/primes/logic.ts";
import { conflicts, isValidColoring, mapLevels, usedColorCount } from "../src/games/math/fourcolor/logic.ts";
import { isBalanced, leverLevels, netTorque, tiltDegrees } from "../src/games/physics/lever/logic.ts";
import { colorLevels, colorMatch, isExactColor, rgbToCss } from "../src/games/physics/colors/logic.ts";
import { METAL_IONS, checkFlameAnswer, findIon, flameLevels } from "../src/games/chemistry/flame/logic.ts";
import { SUBSTANCES, checkMatterGoal, matterLevels, phaseOf } from "../src/games/chemistry/matter/logic.ts";
import { combineAlleles, dominantCount, mendelLevels, punnettSquare } from "../src/games/biology/mendel/logic.ts";
import { mothLevels, nextGeneration } from "../src/games/biology/moths/logic.ts";
import { INNER_PLANETS, keplerLevels, matchesOrbit, periodYears } from "../src/games/astro/kepler/logic.ts";
import { cannonLevels, checkCannonGoal, classifyLaunch, simulateTrajectory } from "../src/games/astro/cannon/logic.ts";
import { categories } from "../src/catalog/categories.ts";
import { scienceTalks } from "../src/catalog/talks.ts";
import { scienceWiki } from "../src/catalog/wiki.ts";

test("一笔画的答案每条线只走一次", () => {
  for (const board of boards) {
    assert.equal(covers(board.edges, board.solution), true, board.title);
    const odds = oddNodes(board.nodes.length, board.edges);
    assert.ok(odds.length === 0 || odds.length === 2, board.title);
    if (odds.length === 2) assert.ok(odds.includes(board.solution[0]), board.title);
  }
});

test("汉诺塔不能大压小，三层最少七步", () => {
  assert.equal(fewest(3), 7);
  assert.equal(fewest(5), 31);
  const towers = startTowers(3);
  assert.equal(moveDisk(towers, 0, 2) !== null, true);
  assert.equal(moveDisk(moveDisk(towers, 0, 2), 0, 2), null);
  const steps = [[0, 2], [0, 1], [2, 1], [0, 2], [1, 0], [1, 2], [0, 2]];
  const end = steps.reduce((state, [from, to]) => moveDisk(state, from, to), towers);
  assert.equal(solved(end, 3), true);
});

test("镜子把光折向该去的方向，关卡答案照得到", () => {
  assert.equal(reflect("/", "E"), "N");
  assert.equal(reflect("\\", "E"), "S");
  assert.equal(reflect("/", "N"), "E");
  assert.equal(reflect("\\", "S"), "E");
  for (const level of mirrorLevels) {
    assert.equal(cast({ ...level, mirrors: {} }).hit, false, level.title);
    assert.equal(cast({ ...level, mirrors: level.solution }).hit, true, level.title);
  }
});

test("每杯酸碱都能在滴数内调到目标", () => {
  const solvable = (cup) => {
    const queue = [[]];
    const seen = new Set([""]);
    while (queue.length) {
      const used = queue.shift();
      if (pour(cup.start, used) === cup.target) return used.length;
      if (used.length >= cup.limit) continue;
      for (const drop of drops) {
        const next = [...used, drop.id];
        const key = next.join(",");
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push(next);
      }
    }
    return -1;
  };
  for (const cup of cups) assert.ok(solvable(cup) > 0, cup.title);
  assert.equal(pour(7, ["a2"]), 5);
  assert.equal(pour(1, ["a2", "a2"]), 0);
});

test("配平后原子守恒，公式能读出括号", () => {
  assert.deepEqual(atoms("H2O"), { H: 2, O: 1 });
  assert.deepEqual(atoms("Fe2O3"), { Fe: 2, O: 3 });
  assert.deepEqual(atoms("Ca(OH)2"), { Ca: 1, O: 2, H: 2 });
  for (const reaction of reactions) {
    const formulas = [...reaction.left, ...reaction.right];
    const terms = formulas.map((formula, i) => ({ formula, coeff: reaction.solution[i] }));
    const mid = reaction.left.length;
    assert.equal(imbalance(terms.slice(0, mid), terms.slice(mid)), null, reaction.title);
    assert.ok(imbalance(formulas.map((formula) => ({ formula, coeff: 1 })), terms.slice(mid)) !== null || reaction.id === 2);
  }
});

test("碱基和食物链按规则判定", () => {
  assert.equal(partner("A"), "T");
  assert.equal(partner("C"), "G");
  assert.equal(matches("GATTACA", ["C", "T", "A", "A", "T", "G", "T"]), true);
  assert.equal(matches("AT", ["A", "T"]), false);
  for (const puzzle of chains) {
    const ids = [...puzzle.creatures].sort((a, b) => a.rank - b.rank).map((creature) => creature.id);
    assert.equal(ordered(puzzle.creatures, ids), true, puzzle.title);
    assert.equal(ordered(puzzle.creatures, [...ids].reverse()), false, puzzle.title);
  }
});

test("月相在目标附近算找到，绕过 0 度也认", () => {
  assert.equal(hitPhase(180, 180), true);
  assert.equal(hitPhase(350, 0), true);
  assert.equal(hitPhase(90, 120), false);
  assert.equal(angleDiff(10, 350), 20);
});

test("加盐会改变鸡蛋的浮沉，摆长决定周期，45 度扔得最远", () => {
  assert.equal(pose(brine(0), 1.08), "sink");
  assert.equal(pose(brine(4), 1.08), "hover");
  assert.equal(pose(brine(6), 1.08), "float");
  assert.equal(pose(brine(10), 1.16), "float");
  assert.ok(matched(lengthFor(1), 1));
  assert.ok(matched(lengthFor(2), 2));
  assert.ok(Math.abs(period(0.25) - 1) < 0.02);
  assert.ok(landing(10, 45) > landing(10, 30));
  assert.ok(Math.abs(landing(10, 30) - landing(10, 60)) < 0.001);
  for (const shot of shots) {
    const best = shot.id === 2 ? 30 : 45;
    assert.equal(onTarget(shot.speed, best, shot.target, shot.tol), true, shot.title);
  }
  assert.equal(onTarget(shots[1].speed, 45, shots[1].target, shots[1].tol), false);
});

test("彩虹按密度分层，气球由较少的原料决定", () => {
  assert.equal(fault(["honey", "water", "oil"]), null);
  assert.ok(fault(["oil", "water", "honey"]));
  assert.equal(fault(["honey", "soap", "water", "oil", "alcohol"]), null);
  assert.equal(gas(5, 3), 3);
  assert.equal(fizz(3, 3, 3, 6, false), "fit");
  assert.equal(fizz(5, 3, 3, 6, false), "fit");
  assert.equal(fizz(5, 3, 3, 6, true), "waste");
  assert.equal(fizz(5, 5, 4, 5, false), "pop");
});

test("裸蛋朝更咸的一边失水，换门赢三分之二，地轴决定季节", () => {
  assert.equal(shift(1, 0), "swell");
  assert.equal(shift(1, 1), "stay");
  assert.equal(shift(1, 3), "shrink");
  assert.equal(hostOpens(1, 0), 2);
  assert.equal(wins(1, 0, false), true);
  assert.equal(wins(0, 0, true), true);
  assert.deepEqual(tally(30), { stay: 10, swap: 20 });
  assert.equal(northSeason(0), "夏天");
  assert.equal(northSeason(180), "冬天");
  assert.equal(northSeason(90), "秋天");
  assert.equal(southSeason(180), "夏天");
  assert.equal(atMark(350, 0), true);
  assert.equal(atMark(90, 180), false);
});

test("傅里叶拼波关卡在初始状态未过关，按目标配方重合度为 100%", () => {
  for (const level of waveLevels) {
    const startSamples = sampleWave(
      level.channels.map((c) => ({ freq: c.freq, amp: c.startAmp, phase: c.startPhase }))
    );
    const goalSamples = sampleWave(level.target);
    assert.ok(matchScore(startSamples, goalSamples) < level.goal, level.title);
    assert.equal(matchScore(goalSamples, goalSamples), 100, level.title);
  }
});

test("五大展厅均配有小念问爸爸科普问答与大师百宝箱", () => {
  for (const category of categories) {
    const talkCount = scienceTalks.filter((t) => t.category === category.id).length;
    assert.ok(talkCount >= 3, `${category.title} should have at least 3 Q&A cards`);
    const wikiCount = scienceWiki.filter((w) => w.category === category.id).length;
    assert.equal(wikiCount, 3, `${category.title} should have 3 science wiki cards`);
  }
});

test("埃氏筛法筛完 √N 以内质数即可留住全部质数", () => {
  assert.equal(isPrime(1), false);
  assert.equal(isPrime(2), true);
  assert.equal(isPrime(91), false);
  assert.equal(isPrime(97), true);
  assert.equal(remainingNumbers(100, [2, 3, 5, 7]).length, 25);
  assert.equal(twinPrimesUpTo(30).length, 4);
  for (const level of primeLevels) {
    const minBrooms = level.brooms.slice(0, level.parBrooms);
    assert.equal(allPrimesFound(level.limit, minBrooms), true, level.title);
  }
});

test("四色地图定理每个关卡答案无相邻重色且不超过目标色数", () => {
  for (const level of mapLevels) {
    assert.equal(conflicts(level.edges, new Array(level.regions.length).fill(-1)).length, 0);
    assert.equal(isValidColoring(level.regions.length, level.edges, level.solution), true, level.title);
    assert.ok(usedColorCount(level.solution) <= level.parColors, level.title);
  }
});

test("杠杆力矩平衡与 RGB 三原色加色混合准确判定", () => {
  const pair = [
    { id: "a", mass: 30, pos: -1, emoji: "🐼", label: "熊猫" },
    { id: "b", mass: 10, pos: 3, emoji: "🦊", label: "狐狸" }
  ];
  assert.equal(netTorque(pair), 0);
  assert.equal(isBalanced(pair), true);
  assert.equal(tiltDegrees(pair), 0);
  assert.equal(leverLevels.length, 4);
  assert.equal(rgbToCss({ r: 100, g: 100, b: 0 }), "rgb(255, 255, 0)");
  for (const level of colorLevels) {
    assert.equal(isExactColor(level.start, level.target), false, level.title);
    assert.equal(isExactColor(level.target, level.target), true, level.title);
    assert.equal(colorMatch(level.target, level.target), 100, level.title);
  }
});

test("焰色反应波长唯一定位金属盐，三态微观镜准确划分熔沸点", () => {
  assert.equal(METAL_IONS.length, 6);
  assert.equal(findIon("Na").wavelengthNm, 589);
  assert.equal(findIon("Cu").wavelengthNm, 510);
  for (const level of flameLevels) {
    assert.equal(checkFlameAnswer([...level.targetIons].reverse(), level.targetIons), true, level.title);
    assert.equal(checkFlameAnswer([], level.targetIons), false, level.title);
  }
  for (const sub of Object.values(SUBSTANCES)) {
    assert.equal(phaseOf(sub, sub.meltC - 5), "solid", sub.name);
    assert.equal(phaseOf(sub, (sub.meltC + sub.boilC) / 2), "liquid", sub.name);
    assert.equal(phaseOf(sub, sub.boilC + 5), "gas", sub.name);
  }
  for (const level of matterLevels) {
    assert.equal(checkMatterGoal(level, level.startC), false, level.title);
  }
});

test("孟德尔庞氏表分离比与桦尺蠖自然选择演化符合遗传规律", () => {
  assert.equal(combineAlleles("a", "A"), "Aa");
  assert.equal(dominantCount(punnettSquare("AA", "aa")), 4);
  assert.equal(dominantCount(punnettSquare("Aa", "Aa")), 3);
  assert.equal(dominantCount(punnettSquare("Aa", "aa")), 2);
  assert.equal(dominantCount(punnettSquare("aa", "aa")), 0);
  assert.equal(mendelLevels.length, 4);
  let lightPct = mothLevels[0].startLightPct;
  for (let g = 1; g <= 5; g++) lightPct = nextGeneration(lightPct, "soot");
  assert.equal(mothLevels[0].goalCheck(lightPct, 5), true);
});

test("开普勒第三定律 T²=a³ 与牛顿大炮宇宙速度分界精准", () => {
  assert.equal(INNER_PLANETS.length, 4);
  assert.equal(periodYears(1), 1);
  assert.equal(periodYears(4), 8);
  assert.equal(matchesOrbit(1.5874, 2.0, 0.08), true);
  for (const level of keplerLevels) {
    assert.equal(matchesOrbit(level.startAu, level.targetYears, level.tolYears), false, level.title);
    const exactAu = Math.pow(level.targetYears, 2 / 3);
    assert.equal(matchesOrbit(exactAu, level.targetYears, level.tolYears), true, level.title);
  }
  assert.equal(classifyLaunch(5.0), "crash");
  assert.equal(classifyLaunch(7.9), "circular");
  assert.equal(classifyLaunch(9.6), "elliptical");
  assert.equal(classifyLaunch(11.5), "escape");
  for (const level of cannonLevels) {
    assert.equal(checkCannonGoal(level, level.startSpeed), false, level.title);
  }
  assert.equal(simulateTrajectory(6.5).crashed, true);
  assert.equal(simulateTrajectory(7.9).crashed, false);
});
