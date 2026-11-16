import type { CategoryId, GameModule } from "./types.ts";
// 1. 数学思维馆 (7)
import { euler } from "../games/math/euler/index.tsx";
import { hanoi } from "../games/math/hanoi/index.tsx";
import { monty } from "../games/math/monty/index.tsx";
import { primes } from "../games/math/primes/index.tsx";
import { fourcolor } from "../games/math/fourcolor/index.tsx";
import { fibonacci } from "../games/math/fibonacci/index.tsx";
import { epicycles } from "../games/math/epicycles/index.tsx";
// 2. 声光电磁馆 (9)
import { waves } from "../games/physics/waves/index.tsx";
import { mirrors } from "../games/physics/mirrors/index.tsx";
import { colors } from "../games/physics/colors/index.tsx";
import { floatEgg } from "../games/physics/float/index.tsx";
import { pendulum } from "../games/physics/pendulum/index.tsx";
import { circuits } from "../games/physics/circuits/index.tsx";
import { hockey } from "../games/physics/hockey/index.tsx";
import { slits } from "../games/physics/slits/index.tsx";
import { refraction } from "../games/physics/refraction/index.tsx";
// 3. 机械动力馆 (7)
import { slide } from "../games/physics/slide/index.ts";
import { lever } from "../games/physics/lever/index.tsx";
import { toss } from "../games/physics/toss/index.tsx";
import { gears } from "../games/mechanics/gears/index.tsx";
import { pulleys } from "../games/mechanics/pulleys/index.tsx";
import { skate } from "../games/mechanics/skate/index.tsx";
import { motion } from "../games/mechanics/motion/index.tsx";
// 4. 建筑结构馆 (6)
import { bridge } from "../games/architecture/bridge/index.tsx";
import { arch } from "../games/architecture/arch/index.tsx";
import { cantilever } from "../games/architecture/cantilever/index.tsx";
import { quake } from "../games/architecture/quake/index.tsx";
import { eaves } from "../games/architecture/eaves/index.tsx";
import { suspension } from "../games/architecture/suspension/index.tsx";
// 5. 化学分子馆 (7)
import { ph } from "../games/chemistry/ph/index.tsx";
import { balance } from "../games/chemistry/balance/index.tsx";
import { layers } from "../games/chemistry/layers/index.tsx";
import { fizzBalloon } from "../games/chemistry/fizz/index.tsx";
import { flame } from "../games/chemistry/flame/index.tsx";
import { matter } from "../games/chemistry/matter/index.tsx";
import { gas } from "../games/chemistry/gas/index.tsx";
// 6. 生命科学馆 (6)
import { pairs } from "../games/biology/pairs/index.tsx";
import { chain } from "../games/biology/chain/index.tsx";
import { osmosis } from "../games/biology/osmosis/index.tsx";
import { mendel } from "../games/biology/mendel/index.tsx";
import { moths } from "../games/biology/moths/index.tsx";
import { herd } from "../games/biology/herd/index.tsx";
// 7. 地球地理馆 (6)
import { contour } from "../games/earth/contour/index.tsx";
import { plates } from "../games/earth/plates/index.tsx";
import { rainshadow } from "../games/earth/rainshadow/index.tsx";
import { strata } from "../games/earth/strata/index.tsx";
import { breeze } from "../games/earth/breeze/index.tsx";
import { greenhouse } from "../games/earth/greenhouse/index.tsx";
// 8. 天文宇宙馆 (6)
import { moon } from "../games/astro/moon/index.tsx";
import { seasons } from "../games/astro/seasons/index.tsx";
import { kepler } from "../games/astro/kepler/index.tsx";
import { cannon } from "../games/astro/cannon/index.tsx";
import { eclipse } from "../games/astro/eclipse/index.tsx";
import { hohmann } from "../games/astro/hohmann/index.tsx";
// 9. 计算逻辑馆 (6)
import { binary } from "../games/computing/binary/index.tsx";
import { gates } from "../games/computing/gates/index.tsx";
import { cipher } from "../games/computing/cipher/index.tsx";
import { weighing } from "../games/computing/weighing/index.tsx";
import { shortest } from "../games/computing/shortest/index.tsx";
import { automata } from "../games/computing/automata/index.tsx";

/**
 * 馆里的全部 60 款互动科学工程小游戏（覆盖九大展厅，每馆 6~9 款）。
 * 加一个游戏：在 src/games/<门类>/<名字>/ 写好组件，再在这个数组里登记一项。
 * 加一个门类：先在 categories.ts 加一行，游戏的 category 用那个 id。
 */
export const games: readonly GameModule[] = [
  // 数学思维馆 (7)
  euler,
  hanoi,
  monty,
  primes,
  fourcolor,
  fibonacci,
  epicycles,
  // 声光电磁馆 (9)
  waves,
  mirrors,
  colors,
  floatEgg,
  pendulum,
  circuits,
  hockey,
  slits,
  refraction,
  // 机械动力馆 (7)
  slide,
  lever,
  toss,
  gears,
  pulleys,
  skate,
  motion,
  // 建筑结构馆 (6)
  bridge,
  arch,
  cantilever,
  quake,
  eaves,
  suspension,
  // 化学分子馆 (7)
  ph,
  balance,
  layers,
  fizzBalloon,
  flame,
  matter,
  gas,
  // 生命科学馆 (6)
  pairs,
  chain,
  osmosis,
  mendel,
  moths,
  herd,
  // 地球地理馆 (6)
  contour,
  plates,
  rainshadow,
  strata,
  breeze,
  greenhouse,
  // 天文宇宙馆 (6)
  moon,
  seasons,
  kepler,
  cannon,
  eclipse,
  hohmann,
  // 计算逻辑馆 (6)
  binary,
  gates,
  cipher,
  weighing,
  shortest,
  automata
];

export function gamesIn(category: CategoryId) {
  return games.filter((game) => game.meta.category === category);
}
