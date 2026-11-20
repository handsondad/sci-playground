import assert from "node:assert/strict";
import test from "node:test";
import { games } from "../src/catalog/games.ts";

/**
 * meta.ts 里的 maxStars 是数字字面量（这样首屏只打包轻量元数据，不拖入 logic.ts），
 * 这里逐个对照关卡数组重新推导，防止增删关卡后星星上限忘了同步。
 * 新增实验时在表里补一行：id → [关卡数据文件, (模块) => 推导出的星星上限]。
 * 用动态 import 读取，不计入 check-rules 的「单测覆盖」统计。
 */
const derive = {
  // 数学思维馆
  euler: ["math/euler/logic.ts", (m) => m.boards.length * 3],
  hanoi: ["math/hanoi/logic.ts", (m) => m.SIZES.length * 3],
  monty: null, // 三个关卡写在 index.tsx（UI 流程），上限固定 9 颗
  primes: ["math/primes/logic.ts", (m) => m.primeLevels.length * 3],
  fourcolor: ["math/fourcolor/logic.ts", (m) => m.mapLevels.length * 3],
  fibonacci: ["math/fibonacci/logic.ts", (m) => m.fibonacciLevels.length * 3],
  epicycles: ["math/epicycles/logic.ts", (m) => m.epicycleLevels.length * 3],
  // 声光电磁馆
  waves: ["physics/waves/logic.ts", (m) => m.waveLevels.length * 3],
  mirrors: ["physics/mirrors/logic.ts", (m) => m.mirrorLevels.length * 3],
  colors: ["physics/colors/logic.ts", (m) => m.colorLevels.length * 3],
  float: ["physics/float/logic.ts", (m) => m.floatLevels.length * 3],
  pendulum: ["physics/pendulum/logic.ts", (m) => m.swings.length * 3],
  circuits: ["physics/circuits/logic.ts", (m) => m.circuitLevels.length * 3],
  hockey: ["physics/hockey/logic.ts", (m) => m.hockeyLevels.length * 3],
  slits: ["physics/slits/logic.ts", (m) => m.slitsLevels.length * 3],
  refraction: ["physics/refraction/logic.ts", (m) => m.refractionLevels.length * 3],
  // 机械动力馆
  slide: ["physics/slide/data/levels.ts", (m) => m.levels.length * 3 + 3],
  lever: ["physics/lever/logic.ts", (m) => m.leverLevels.length * 3],
  toss: ["physics/toss/logic.ts", (m) => m.shots.length * 3],
  gears: ["mechanics/gears/logic.ts", (m) => m.gearLevels.length * 3],
  pulleys: ["mechanics/pulleys/logic.ts", (m) => m.pulleyLevels.length * 3],
  skate: ["mechanics/skate/logic.ts", (m) => m.skateLevels.length * 3],
  motion: ["mechanics/motion/logic.ts", (m) => m.motionLevels.length * 3],
  // 建筑结构馆
  bridge: ["architecture/bridge/logic.ts", (m) => m.bridgeLevels.length * 3],
  arch: ["architecture/arch/logic.ts", (m) => m.archLevels.length * 3],
  cantilever: ["architecture/cantilever/logic.ts", (m) => m.cantileverLevels.length * 3],
  quake: ["architecture/quake/logic.ts", (m) => m.quakeLevels.length * 3],
  eaves: ["architecture/eaves/logic.ts", (m) => m.eavesLevels.length * 3],
  suspension: ["architecture/suspension/logic.ts", (m) => m.suspensionLevels.length * 3],
  // 化学分子馆
  ph: ["chemistry/ph/logic.ts", (m) => m.cups.length * 3],
  balance: ["chemistry/balance/logic.ts", (m) => m.reactions.length * 3],
  layers: ["chemistry/layers/logic.ts", (m) => m.towers.length * 3],
  fizz: ["chemistry/fizz/logic.ts", (m) => m.balloons.length * 3],
  flame: ["chemistry/flame/logic.ts", (m) => m.flameLevels.length * 3],
  matter: ["chemistry/matter/logic.ts", (m) => m.matterLevels.length * 3],
  gas: ["chemistry/gas/logic.ts", (m) => m.gasLevels.length * 3],
  // 生命科学馆
  pairs: ["biology/pairs/logic.ts", (m) => m.strands.length * 3],
  chain: ["biology/chain/logic.ts", (m) => m.chains.length * 3],
  osmosis: ["biology/osmosis/logic.ts", (m) => m.cells.length * 3],
  mendel: ["biology/mendel/logic.ts", (m) => m.mendelLevels.length * 3],
  moths: ["biology/moths/logic.ts", (m) => m.mothLevels.length * 3],
  herd: ["biology/herd/logic.ts", (m) => m.herdLevels.length * 3],
  // 地球地理馆
  contour: ["earth/contour/logic.ts", (m) => m.contourLevels.length * 3],
  plates: ["earth/plates/logic.ts", (m) => m.plateLevels.length * 3],
  rainshadow: ["earth/rainshadow/logic.ts", (m) => m.rainLevels.length * 3],
  strata: ["earth/strata/logic.ts", (m) => m.strataLevels.length * 3],
  breeze: ["earth/breeze/logic.ts", (m) => m.breezeLevels.length * 3],
  greenhouse: ["earth/greenhouse/logic.ts", (m) => m.greenhouseLevels.length * 3],
  // 天文宇宙馆
  moon: ["astro/moon/logic.ts", (m) => m.phases.length * 3],
  seasons: ["astro/seasons/logic.ts", (m) => m.orbits.length * 3],
  kepler: ["astro/kepler/logic.ts", (m) => m.keplerLevels.length * 3],
  cannon: ["astro/cannon/logic.ts", (m) => m.cannonLevels.length * 3],
  eclipse: ["astro/eclipse/logic.ts", (m) => m.eclipseLevels.length * 3],
  hohmann: ["astro/hohmann/logic.ts", (m) => m.hohmannLevels.length * 3],
  // 计算逻辑馆
  binary: ["computing/binary/logic.ts", (m) => m.binaryLevels.length * 3],
  gates: ["computing/gates/logic.ts", (m) => m.gateLevels.length * 3],
  cipher: ["computing/cipher/logic.ts", (m) => m.cipherLevels.length * 3],
  weighing: ["computing/weighing/logic.ts", (m) => m.weighingLevels.length * 3],
  shortest: ["computing/shortest/logic.ts", (m) => m.shortestLevels.length * 3],
  automata: ["computing/automata/logic.ts", (m) => m.automataLevels.length * 3]
};

test("every game's literal meta.maxStars matches its level data", async () => {
  const missing = games.map((g) => g.meta.id).filter((id) => !(id in derive));
  assert.deepEqual(missing, [], `tests/stars.test.mjs 的 derive 表缺少这些实验，请补上推导：${missing.join(", ")}`);

  for (const { meta } of games) {
    const rule = derive[meta.id];
    if (!rule) continue;
    const [file, count] = rule;
    const mod = await import(new URL(`../src/games/${file}`, import.meta.url).href);
    assert.equal(meta.maxStars, count(mod), `${meta.id} 的 meta.ts maxStars 与关卡数量不一致`);
  }
});
