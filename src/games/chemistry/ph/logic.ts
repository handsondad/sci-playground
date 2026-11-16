export type DropId = "a1" | "a2" | "b1" | "b2";

export const drops: readonly { id: DropId; name: string; delta: number }[] = [
  { id: "a1", name: "弱酸", delta: -1 },
  { id: "a2", name: "强酸", delta: -2 },
  { id: "b1", name: "弱碱", delta: 1 },
  { id: "b2", name: "强碱", delta: 2 }
];

const deltaOf = Object.fromEntries(drops.map((drop) => [drop.id, drop.delta])) as Record<DropId, number>;

export function pour(start: number, used: readonly DropId[]) {
  const ph = used.reduce((value, id) => value + deltaOf[id], start);
  return Math.min(14, Math.max(0, ph));
}

const stops: readonly [number, [number, number, number]][] = [
  [0, [196, 40, 40]],
  [3, [232, 120, 36]],
  [5, [230, 196, 64]],
  [7, [70, 176, 96]],
  [8, [48, 168, 168]],
  [10, [48, 110, 210]],
  [12, [78, 64, 186]],
  [14, [48, 24, 72]]
];

export function indicator(ph: number) {
  const value = Math.min(14, Math.max(0, ph));
  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (value >= stops[i][0] && value <= stops[i + 1][0]) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }
  const span = upper[0] - lower[0] || 1;
  const t = (value - lower[0]) / span;
  const rgb = lower[1].map((channel, i) => Math.round(channel + (upper[1][i] - channel) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export type Cup = { id: number; title: string; story: string; start: number; target: number; limit: number };

export const cups: readonly Cup[] = [
  { id: 1, title: "变酸一点点", story: "烧杯里是中性的水。只用 1 滴，把它变成 pH 5。", start: 7, target: 5, limit: 1 },
  { id: 2, title: "再酸一些", story: "还是从 7 开始。2 滴之内，配成 pH 3。", start: 7, target: 3, limit: 2 },
  { id: 3, title: "救回中性", story: "这杯已经是 pH 4。2 滴之内，调回 7。", start: 4, target: 7, limit: 2 },
  { id: 4, title: "碱太浓了", story: "pH 9，太碱。1 滴就得回到 7。", start: 9, target: 7, limit: 1 },
  { id: 5, title: "配一瓶碱", story: "从 6 出发，2 滴之内变成 pH 10。", start: 6, target: 10, limit: 2 },
  { id: 6, title: "大转弯", story: "pH 8 要变成 3。最多 3 滴。", start: 8, target: 3, limit: 3 }
];
