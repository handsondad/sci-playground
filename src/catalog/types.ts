import type { ComponentType } from "react";

/** 新门类加在 categories.ts，新游戏加在 games.ts。 */
export type CategoryId =
  | "math"
  | "physics"
  | "mechanics"
  | "architecture"
  | "chemistry"
  | "biology"
  | "earth"
  | "astro"
  | "computing";

export type Category = {
  id: CategoryId;
  title: string;
  emoji: string;
  blurb: string;
  color: string;
};

export type GameMeta = {
  id: string;
  category: CategoryId;
  title: string;
  emoji: string;
  blurb: string;
  tag: string;
  /** 这个游戏一共能拿多少颗星（用于首页与展厅统计进度）。 */
  maxStars: number;
};

export type GameProps = {
  /** `#/g/<id>/` 后面的路径，游戏自己用。 */
  path: string;
  go: (path: string) => void;
  exit: () => void;
  sound: boolean;
  setSound: (on: boolean) => void;
};

export type GameModule = {
  meta: GameMeta;
  Play: ComponentType<GameProps>;
};
