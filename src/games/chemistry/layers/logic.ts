/** 杯中彩虹：密度大的沉在下面。从下到上必须一层比一层轻，不然上面的会沉下去。 */

export const liquids = [
  { id: "honey", name: "蜂蜜", density: 1.42, color: "#e6a23c" },
  { id: "soap", name: "洗洁精", density: 1.06, color: "#7dcea0" },
  { id: "water", name: "水", density: 1, color: "#7eb6ff" },
  { id: "oil", name: "油", density: 0.91, color: "#f6e27a" },
  { id: "alcohol", name: "酒精", density: 0.79, color: "#e7d6ff" }
] as const;

export type LiquidId = (typeof liquids)[number]["id"];

export function liquidBy(id: string) {
  const found = liquids.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

/** slots[0] 是杯底。 */
export function fault(slots: readonly string[]) {
  if (slots.some((id) => !id) || new Set(slots).size !== slots.length) return "还没叠好";
  for (let i = 1; i < slots.length; i++) {
    const lower = liquidBy(slots[i - 1]);
    const upper = liquidBy(slots[i]);
    if (upper.density >= lower.density) return `${upper.name}比下面的${lower.name}更重，会沉下去搅在一起。`;
  }
  return null;
}

export const towers = [
  {
    id: 1, title: "三层",
    ids: ["honey", "water", "oil"] as const,
    story: "蜂蜜、水、油。最重的贴着杯底，最轻的待在最上面。",
    win: "三层分开了。油最轻，所以浮在水上。"
  },
  {
    id: 2, title: "五层彩虹",
    ids: ["honey", "soap", "water", "oil", "alcohol"] as const,
    story: "再加洗洁精和酒精。还是按密度从重到轻，自下而上。",
    win: "五层都稳住了。密度差足够，它们就不会混成一杯。"
  }
];
