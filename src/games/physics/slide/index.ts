import type { GameModule } from "../../../catalog/types.ts";
import { SlideGame } from "./SlideGame.tsx";
import { levels } from "./data/levels.ts";

export const slide: GameModule = {
  meta: {
    id: "slide",
    category: "physics",
    title: "最快的滑梯",
    emoji: "🛝",
    blurb: "直线最近，摆线最快！看圆盘滚出摆线，再亲手拖圆点修一条冠军滑梯。",
    tag: "变分 · 最速降线",
    maxStars: levels.length * 3 + 3
  },
  Play: SlideGame
};
