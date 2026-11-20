import type { GameModule } from "../../../catalog/types.ts";
import { SlideGame } from "./SlideGame.tsx";
import { meta } from "./meta.ts";

export const slide: GameModule = { meta, Play: SlideGame };
