/** 单摆周期 T = 2π√(L/g)。小角度下，快慢看绳子长短，不看砝码轻重。 */

export const G = 9.8;

export function period(length: number) {
  return 2 * Math.PI * Math.sqrt(length / G);
}

export function lengthFor(seconds: number) {
  return G * (seconds / (2 * Math.PI)) ** 2;
}

export function matched(length: number, target: number, tolerance = 0.04) {
  return Math.abs(period(length) - target) <= tolerance;
}

export const swings = [
  { id: 1, title: "一秒一次", target: 1, story: "让它摆一下正好 1 秒。绳子和砝码都可以动，看谁说了算。", win: "变的是绳子。砝码加重，摆一下的时间还是那么多。" },
  { id: 2, title: "慢一倍", target: 2, story: "这一次要慢一倍，摆一下用 2 秒。绳子得长不少。", win: "要慢一倍，绳子不是加长一倍。时间跟长度的平方根走。" },
  { id: 3, title: "半秒", target: 0.5, story: "把绳子收短，让它一下只要 0.5 秒。", win: "短绳子摆得快。钟表匠就是靠这个对时间。" }
] as const;
