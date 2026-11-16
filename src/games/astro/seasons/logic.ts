/** 地轴倾斜约 23°，方向在公转时不变。北极偏向太阳时，北半球是夏天。 */

export function wrap(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export function angleDiff(a: number, b: number) {
  const d = Math.abs(wrap(a - b));
  return Math.min(d, 360 - d);
}

export type SeasonName = "夏天" | "秋天" | "冬天" | "春天";

const order: readonly SeasonName[] = ["夏天", "秋天", "冬天", "春天"];
const opposite: Record<SeasonName, SeasonName> = { 夏天: "冬天", 冬天: "夏天", 秋天: "春天", 春天: "秋天" };

export function northSeason(angle: number): SeasonName {
  return order[Math.round(wrap(angle) / 90) % 4];
}

export function southSeason(angle: number): SeasonName {
  return opposite[northSeason(angle)];
}

export function atMark(angle: number, target: number, tolerance = 20) {
  return angleDiff(angle, target) <= tolerance;
}

export const orbits = [
  { id: 1, title: "北半球的夏天", deg: 0, hemisphere: "north" as const, why: "北极偏向太阳，北半球白天更长，阳光也更直。" },
  { id: 2, title: "北半球的冬天", deg: 180, hemisphere: "north" as const, why: "地轴还是朝同一个方向歪，可是北极这回背对太阳。" },
  { id: 3, title: "南半球的夏天", deg: 180, hemisphere: "south" as const, why: "北半球过冬的时候，南半球正对着太阳。" },
  { id: 4, title: "春分", deg: 270, hemisphere: "north" as const, why: "太阳直射赤道附近，两个半球的昼夜差不多一样长。" }
];
