/** 醋泡掉蛋壳后的裸蛋，会朝盐更浓的一边送水。外面更淡就鼓，外面更咸就瘪。 */

export type Shift = "swell" | "stay" | "shrink";

export function shift(inside: number, outside: number): Shift {
  if (outside < inside - 0.2) return "swell";
  if (outside > inside + 0.2) return "shrink";
  return "stay";
}

export const baths = [
  { id: "water", name: "清水", salt: 0, tint: "#d7ecff" },
  { id: "saline", name: "生理盐水", salt: 1, tint: "#e7f6ea" },
  { id: "brine", name: "浓盐水", salt: 3, tint: "#fff1d6" }
] as const;

export const cells = [
  {
    id: 1, title: "保持原样", inside: 1, want: "stay" as const,
    story: "裸蛋里的盐按 1% 算。选一碗水，让它不鼓也不瘪。",
    win: "两边一样咸，水没有净流进去，也没有净流出来。"
  },
  {
    id: 2, title: "让它喝水", inside: 1, want: "swell" as const,
    story: "想让裸蛋鼓起来。水会朝盐更浓的里面走。",
    win: "清水更淡，水就钻进蛋里，蛋变大了。"
  },
  {
    id: 3, title: "让它变瘪", inside: 1, want: "shrink" as const,
    story: "浓盐水会把蛋里的水抽走。选那一碗。",
    win: "外面更咸，蛋里的水跑了出去，所以瘪了。"
  }
];
