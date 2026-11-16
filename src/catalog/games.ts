import type { CategoryId, GameModule } from "./types.ts";
// 1. 数学思维馆 (6)
import { euler } from "../games/math/euler/index.tsx";
import { hanoi } from "../games/math/hanoi/index.tsx";
import { monty } from "../games/math/monty/index.tsx";
import { primes } from "../games/math/primes/index.tsx";
import { fourcolor } from "../games/math/fourcolor/index.tsx";
import { fibonacci } from "../games/math/fibonacci/index.tsx";
// 2. 声光电磁馆 (6)
import { waves } from "../games/physics/waves/index.tsx";
import { mirrors } from "../games/physics/mirrors/index.tsx";
import { colors } from "../games/physics/colors/index.tsx";
import { floatEgg } from "../games/physics/float/index.tsx";
import { pendulum } from "../games/physics/pendulum/index.tsx";
import { circuits } from "../games/physics/circuits/index.tsx";
// 3. 机械动力馆 (5)
import { slide } from "../games/physics/slide/index.ts";
import { lever } from "../games/physics/lever/index.tsx";
import { toss } from "../games/physics/toss/index.tsx";
import { gears } from "../games/mechanics/gears/index.tsx";
import { pulleys } from "../games/mechanics/pulleys/index.tsx";
// 4. 建筑结构馆 (5)
import { bridge } from "../games/architecture/bridge/index.tsx";
import { arch } from "../games/architecture/arch/index.tsx";
import { cantilever } from "../games/architecture/cantilever/index.tsx";
import { quake } from "../games/architecture/quake/index.tsx";
import { eaves } from "../games/architecture/eaves/index.tsx";
// 5. 化学分子馆 (6)
import { ph } from "../games/chemistry/ph/index.tsx";
import { balance } from "../games/chemistry/balance/index.tsx";
import { layers } from "../games/chemistry/layers/index.tsx";
import { fizzBalloon } from "../games/chemistry/fizz/index.tsx";
import { flame } from "../games/chemistry/flame/index.tsx";
import { matter } from "../games/chemistry/matter/index.tsx";
// 6. 生命科学馆 (5)
import { pairs } from "../games/biology/pairs/index.tsx";
import { chain } from "../games/biology/chain/index.tsx";
import { osmosis } from "../games/biology/osmosis/index.tsx";
import { mendel } from "../games/biology/mendel/index.tsx";
import { moths } from "../games/biology/moths/index.tsx";
// 7. 地球地理馆 (5)
import { contour } from "../games/earth/contour/index.tsx";
import { plates } from "../games/earth/plates/index.tsx";
import { rainshadow } from "../games/earth/rainshadow/index.tsx";
import { strata } from "../games/earth/strata/index.tsx";
import { breeze } from "../games/earth/breeze/index.tsx";
// 8. 天文宇宙馆 (5)
import { moon } from "../games/astro/moon/index.tsx";
import { seasons } from "../games/astro/seasons/index.tsx";
import { kepler } from "../games/astro/kepler/index.tsx";
import { cannon } from "../games/astro/cannon/index.tsx";
import { eclipse } from "../games/astro/eclipse/index.tsx";
// 9. 计算逻辑馆 (5)
import { binary } from "../games/computing/binary/index.tsx";
import { gates } from "../games/computing/gates/index.tsx";
import { cipher } from "../games/computing/cipher/index.tsx";
import { weighing } from "../games/computing/weighing/index.tsx";
import { shortest } from "../games/computing/shortest/index.tsx";

/**
 * 馆里的全部 48 款互动科学工程小游戏（覆盖九大展厅，每馆 5~6 款）。
 * 加一个游戏：在 src/games/<门类>/<名字>/ 写好组件，再在这个数组里登记一项。
 * 加一个门类：先在 categories.ts 加一行，游戏的 category 用那个 id。
 */
export const games: readonly GameModule[] = [
  // 数学思维馆 (6)
  euler,
  hanoi,
  monty,
  primes,
  fourcolor,
  fibonacci,
  // 声光电磁馆 (6)
  waves,
  mirrors,
  colors,
  floatEgg,
  pendulum,
  circuits,
  // 机械动力馆 (5)
  slide,
  lever,
  toss,
  gears,
  pulleys,
  // 建筑结构馆 (5)
  bridge,
  arch,
  cantilever,
  quake,
  eaves,
  // 化学分子馆 (6)
  ph,
  balance,
  layers,
  fizzBalloon,
  flame,
  matter,
  // 生命科学馆 (5)
  pairs,
  chain,
  osmosis,
  mendel,
  moths,
  // 地球地理馆 (5)
  contour,
  plates,
  rainshadow,
  strata,
  breeze,
  // 天文宇宙馆 (5)
  moon,
  seasons,
  kepler,
  cannon,
  eclipse,
  // 计算逻辑馆 (5)
  binary,
  gates,
  cipher,
  weighing,
  shortest
];

export function gamesIn(category: CategoryId) {
  return games.filter((game) => game.meta.category === category);
}
