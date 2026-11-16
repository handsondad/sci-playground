import type { CategoryId, GameModule } from "./types.ts";
import { euler } from "../games/math/euler/index.tsx";
import { hanoi } from "../games/math/hanoi/index.tsx";
import { monty } from "../games/math/monty/index.tsx";
import { primes } from "../games/math/primes/index.tsx";
import { fourcolor } from "../games/math/fourcolor/index.tsx";
import { slide } from "../games/physics/slide/index.ts";
import { waves } from "../games/physics/waves/index.tsx";
import { mirrors } from "../games/physics/mirrors/index.tsx";
import { floatEgg } from "../games/physics/float/index.tsx";
import { pendulum } from "../games/physics/pendulum/index.tsx";
import { toss } from "../games/physics/toss/index.tsx";
import { lever } from "../games/physics/lever/index.tsx";
import { colors } from "../games/physics/colors/index.tsx";
import { ph } from "../games/chemistry/ph/index.tsx";
import { balance } from "../games/chemistry/balance/index.tsx";
import { layers } from "../games/chemistry/layers/index.tsx";
import { fizzBalloon } from "../games/chemistry/fizz/index.tsx";
import { flame } from "../games/chemistry/flame/index.tsx";
import { matter } from "../games/chemistry/matter/index.tsx";
import { pairs } from "../games/biology/pairs/index.tsx";
import { chain } from "../games/biology/chain/index.tsx";
import { osmosis } from "../games/biology/osmosis/index.tsx";
import { mendel } from "../games/biology/mendel/index.tsx";
import { moths } from "../games/biology/moths/index.tsx";
import { moon } from "../games/astro/moon/index.tsx";
import { seasons } from "../games/astro/seasons/index.tsx";
import { kepler } from "../games/astro/kepler/index.tsx";
import { cannon } from "../games/astro/cannon/index.tsx";

/**
 * 馆里的游戏。
 * 加一个游戏：在 src/games/<门类>/<名字>/ 写好组件，再在这个数组里登记一项。
 * 加一个门类：先在 categories.ts 加一行，游戏的 category 用那个 id。
 */
export const games: readonly GameModule[] = [
  euler,
  hanoi,
  monty,
  primes,
  fourcolor,
  slide,
  waves,
  mirrors,
  floatEgg,
  pendulum,
  toss,
  lever,
  colors,
  ph,
  balance,
  layers,
  fizzBalloon,
  flame,
  matter,
  pairs,
  chain,
  osmosis,
  mendel,
  moths,
  moon,
  seasons,
  kepler,
  cannon
];

export function gamesIn(category: CategoryId) {
  return games.filter((game) => game.meta.category === category);
}
