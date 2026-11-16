import { arch, cycloid, yOn, type Pt } from "../lib/slide.ts";

export const raceStart: Pt = { x: 0, y: 2.3 };
export const raceEnd: Pt = { x: 4.2, y: 0.45 };

export function raceTracks() {
  const straight = [raceStart, raceEnd];
  const braid = cycloid(raceStart, raceEnd, 140);
  const midX = (raceStart.x + raceEnd.x) / 2;
  const chordMid = (raceStart.y + raceEnd.y) / 2;
  const curve = arch(raceStart, raceEnd, (chordMid + yOn(braid, midX)) / 2, 80);
  return { straight, curve, cycloid: braid };
}

/** 标准摆线，从尖点滑到最低点。r = 1。 */
export const syncStart: Pt = { x: 0, y: 2 };
export const syncEnd: Pt = { x: Math.PI, y: 0 };

export function syncCurve(): Pt[] {
  return cycloid(syncStart, syncEnd, 180);
}

export const rollStart: Pt = { x: 0, y: 2.4 };
export const rollEnd: Pt = { x: 3.5, y: 0.28 };
