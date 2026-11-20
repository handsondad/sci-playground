import type { CategoryId, GameEntry } from "./types.ts";
// 1. 数学思维馆 (7)
import { meta as euler } from "../games/math/euler/meta.ts";
import { meta as hanoi } from "../games/math/hanoi/meta.ts";
import { meta as monty } from "../games/math/monty/meta.ts";
import { meta as primes } from "../games/math/primes/meta.ts";
import { meta as fourcolor } from "../games/math/fourcolor/meta.ts";
import { meta as fibonacci } from "../games/math/fibonacci/meta.ts";
import { meta as epicycles } from "../games/math/epicycles/meta.ts";
// 2. 声光电磁馆 (9)
import { meta as waves } from "../games/physics/waves/meta.ts";
import { meta as mirrors } from "../games/physics/mirrors/meta.ts";
import { meta as colors } from "../games/physics/colors/meta.ts";
import { meta as floatEgg } from "../games/physics/float/meta.ts";
import { meta as pendulum } from "../games/physics/pendulum/meta.ts";
import { meta as circuits } from "../games/physics/circuits/meta.ts";
import { meta as hockey } from "../games/physics/hockey/meta.ts";
import { meta as slits } from "../games/physics/slits/meta.ts";
import { meta as refraction } from "../games/physics/refraction/meta.ts";
// 3. 机械动力馆 (7)
import { meta as slide } from "../games/physics/slide/meta.ts";
import { meta as lever } from "../games/physics/lever/meta.ts";
import { meta as toss } from "../games/physics/toss/meta.ts";
import { meta as gears } from "../games/mechanics/gears/meta.ts";
import { meta as pulleys } from "../games/mechanics/pulleys/meta.ts";
import { meta as skate } from "../games/mechanics/skate/meta.ts";
import { meta as motion } from "../games/mechanics/motion/meta.ts";
// 4. 建筑结构馆 (6)
import { meta as bridge } from "../games/architecture/bridge/meta.ts";
import { meta as arch } from "../games/architecture/arch/meta.ts";
import { meta as cantilever } from "../games/architecture/cantilever/meta.ts";
import { meta as quake } from "../games/architecture/quake/meta.ts";
import { meta as eaves } from "../games/architecture/eaves/meta.ts";
import { meta as suspension } from "../games/architecture/suspension/meta.ts";
// 5. 化学分子馆 (7)
import { meta as ph } from "../games/chemistry/ph/meta.ts";
import { meta as balance } from "../games/chemistry/balance/meta.ts";
import { meta as layers } from "../games/chemistry/layers/meta.ts";
import { meta as fizzBalloon } from "../games/chemistry/fizz/meta.ts";
import { meta as flame } from "../games/chemistry/flame/meta.ts";
import { meta as matter } from "../games/chemistry/matter/meta.ts";
import { meta as gas } from "../games/chemistry/gas/meta.ts";
// 6. 生命科学馆 (6)
import { meta as pairs } from "../games/biology/pairs/meta.ts";
import { meta as chain } from "../games/biology/chain/meta.ts";
import { meta as osmosis } from "../games/biology/osmosis/meta.ts";
import { meta as mendel } from "../games/biology/mendel/meta.ts";
import { meta as moths } from "../games/biology/moths/meta.ts";
import { meta as herd } from "../games/biology/herd/meta.ts";
// 7. 地球地理馆 (6)
import { meta as contour } from "../games/earth/contour/meta.ts";
import { meta as plates } from "../games/earth/plates/meta.ts";
import { meta as rainshadow } from "../games/earth/rainshadow/meta.ts";
import { meta as strata } from "../games/earth/strata/meta.ts";
import { meta as breeze } from "../games/earth/breeze/meta.ts";
import { meta as greenhouse } from "../games/earth/greenhouse/meta.ts";
// 8. 天文宇宙馆 (6)
import { meta as moon } from "../games/astro/moon/meta.ts";
import { meta as seasons } from "../games/astro/seasons/meta.ts";
import { meta as kepler } from "../games/astro/kepler/meta.ts";
import { meta as cannon } from "../games/astro/cannon/meta.ts";
import { meta as eclipse } from "../games/astro/eclipse/meta.ts";
import { meta as hohmann } from "../games/astro/hohmann/meta.ts";
// 9. 计算逻辑馆 (6)
import { meta as binary } from "../games/computing/binary/meta.ts";
import { meta as gates } from "../games/computing/gates/meta.ts";
import { meta as cipher } from "../games/computing/cipher/meta.ts";
import { meta as weighing } from "../games/computing/weighing/meta.ts";
import { meta as shortest } from "../games/computing/shortest/meta.ts";
import { meta as automata } from "../games/computing/automata/meta.ts";

/**
 * 馆里的全部 60 款互动科学工程小游戏（覆盖九大展厅，每馆 6~9 款）。
 * 这里只静态引入轻量的 meta.ts（首页/展厅/星数统计用），实验台组件经 load() 按需懒加载。
 * 加一个游戏：在 src/games/<门类>/<名字>/ 写好 meta.ts 与组件，再在这个数组里登记一项。
 * 加一个门类：先在 categories.ts 加一行，游戏的 category 用那个 id。
 */
export const games: readonly GameEntry[] = [
  // 数学思维馆 (7)
  { meta: euler, load: () => import("../games/math/euler/index.tsx").then((m) => m.euler.Play) },
  { meta: hanoi, load: () => import("../games/math/hanoi/index.tsx").then((m) => m.hanoi.Play) },
  { meta: monty, load: () => import("../games/math/monty/index.tsx").then((m) => m.monty.Play) },
  { meta: primes, load: () => import("../games/math/primes/index.tsx").then((m) => m.primes.Play) },
  { meta: fourcolor, load: () => import("../games/math/fourcolor/index.tsx").then((m) => m.fourcolor.Play) },
  { meta: fibonacci, load: () => import("../games/math/fibonacci/index.tsx").then((m) => m.fibonacci.Play) },
  { meta: epicycles, load: () => import("../games/math/epicycles/index.tsx").then((m) => m.epicycles.Play) },
  // 声光电磁馆 (9)
  { meta: waves, load: () => import("../games/physics/waves/index.tsx").then((m) => m.waves.Play) },
  { meta: mirrors, load: () => import("../games/physics/mirrors/index.tsx").then((m) => m.mirrors.Play) },
  { meta: colors, load: () => import("../games/physics/colors/index.tsx").then((m) => m.colors.Play) },
  { meta: floatEgg, load: () => import("../games/physics/float/index.tsx").then((m) => m.floatEgg.Play) },
  { meta: pendulum, load: () => import("../games/physics/pendulum/index.tsx").then((m) => m.pendulum.Play) },
  { meta: circuits, load: () => import("../games/physics/circuits/index.tsx").then((m) => m.circuits.Play) },
  { meta: hockey, load: () => import("../games/physics/hockey/index.tsx").then((m) => m.hockey.Play) },
  { meta: slits, load: () => import("../games/physics/slits/index.tsx").then((m) => m.slits.Play) },
  { meta: refraction, load: () => import("../games/physics/refraction/index.tsx").then((m) => m.refraction.Play) },
  // 机械动力馆 (7)
  { meta: slide, load: () => import("../games/physics/slide/index.ts").then((m) => m.slide.Play) },
  { meta: lever, load: () => import("../games/physics/lever/index.tsx").then((m) => m.lever.Play) },
  { meta: toss, load: () => import("../games/physics/toss/index.tsx").then((m) => m.toss.Play) },
  { meta: gears, load: () => import("../games/mechanics/gears/index.tsx").then((m) => m.gears.Play) },
  { meta: pulleys, load: () => import("../games/mechanics/pulleys/index.tsx").then((m) => m.pulleys.Play) },
  { meta: skate, load: () => import("../games/mechanics/skate/index.tsx").then((m) => m.skate.Play) },
  { meta: motion, load: () => import("../games/mechanics/motion/index.tsx").then((m) => m.motion.Play) },
  // 建筑结构馆 (6)
  { meta: bridge, load: () => import("../games/architecture/bridge/index.tsx").then((m) => m.bridge.Play) },
  { meta: arch, load: () => import("../games/architecture/arch/index.tsx").then((m) => m.arch.Play) },
  { meta: cantilever, load: () => import("../games/architecture/cantilever/index.tsx").then((m) => m.cantilever.Play) },
  { meta: quake, load: () => import("../games/architecture/quake/index.tsx").then((m) => m.quake.Play) },
  { meta: eaves, load: () => import("../games/architecture/eaves/index.tsx").then((m) => m.eaves.Play) },
  { meta: suspension, load: () => import("../games/architecture/suspension/index.tsx").then((m) => m.suspension.Play) },
  // 化学分子馆 (7)
  { meta: ph, load: () => import("../games/chemistry/ph/index.tsx").then((m) => m.ph.Play) },
  { meta: balance, load: () => import("../games/chemistry/balance/index.tsx").then((m) => m.balance.Play) },
  { meta: layers, load: () => import("../games/chemistry/layers/index.tsx").then((m) => m.layers.Play) },
  { meta: fizzBalloon, load: () => import("../games/chemistry/fizz/index.tsx").then((m) => m.fizzBalloon.Play) },
  { meta: flame, load: () => import("../games/chemistry/flame/index.tsx").then((m) => m.flame.Play) },
  { meta: matter, load: () => import("../games/chemistry/matter/index.tsx").then((m) => m.matter.Play) },
  { meta: gas, load: () => import("../games/chemistry/gas/index.tsx").then((m) => m.gas.Play) },
  // 生命科学馆 (6)
  { meta: pairs, load: () => import("../games/biology/pairs/index.tsx").then((m) => m.pairs.Play) },
  { meta: chain, load: () => import("../games/biology/chain/index.tsx").then((m) => m.chain.Play) },
  { meta: osmosis, load: () => import("../games/biology/osmosis/index.tsx").then((m) => m.osmosis.Play) },
  { meta: mendel, load: () => import("../games/biology/mendel/index.tsx").then((m) => m.mendel.Play) },
  { meta: moths, load: () => import("../games/biology/moths/index.tsx").then((m) => m.moths.Play) },
  { meta: herd, load: () => import("../games/biology/herd/index.tsx").then((m) => m.herd.Play) },
  // 地球地理馆 (6)
  { meta: contour, load: () => import("../games/earth/contour/index.tsx").then((m) => m.contour.Play) },
  { meta: plates, load: () => import("../games/earth/plates/index.tsx").then((m) => m.plates.Play) },
  { meta: rainshadow, load: () => import("../games/earth/rainshadow/index.tsx").then((m) => m.rainshadow.Play) },
  { meta: strata, load: () => import("../games/earth/strata/index.tsx").then((m) => m.strata.Play) },
  { meta: breeze, load: () => import("../games/earth/breeze/index.tsx").then((m) => m.breeze.Play) },
  { meta: greenhouse, load: () => import("../games/earth/greenhouse/index.tsx").then((m) => m.greenhouse.Play) },
  // 天文宇宙馆 (6)
  { meta: moon, load: () => import("../games/astro/moon/index.tsx").then((m) => m.moon.Play) },
  { meta: seasons, load: () => import("../games/astro/seasons/index.tsx").then((m) => m.seasons.Play) },
  { meta: kepler, load: () => import("../games/astro/kepler/index.tsx").then((m) => m.kepler.Play) },
  { meta: cannon, load: () => import("../games/astro/cannon/index.tsx").then((m) => m.cannon.Play) },
  { meta: eclipse, load: () => import("../games/astro/eclipse/index.tsx").then((m) => m.eclipse.Play) },
  { meta: hohmann, load: () => import("../games/astro/hohmann/index.tsx").then((m) => m.hohmann.Play) },
  // 计算逻辑馆 (6)
  { meta: binary, load: () => import("../games/computing/binary/index.tsx").then((m) => m.binary.Play) },
  { meta: gates, load: () => import("../games/computing/gates/index.tsx").then((m) => m.gates.Play) },
  { meta: cipher, load: () => import("../games/computing/cipher/index.tsx").then((m) => m.cipher.Play) },
  { meta: weighing, load: () => import("../games/computing/weighing/index.tsx").then((m) => m.weighing.Play) },
  { meta: shortest, load: () => import("../games/computing/shortest/index.tsx").then((m) => m.shortest.Play) },
  { meta: automata, load: () => import("../games/computing/automata/index.tsx").then((m) => m.automata.Play) }
];

export function gamesIn(category: CategoryId) {
  return games.filter((game) => game.meta.category === category);
}
