/** 小苏打和醋反应放出二氧化碳。气的多少由比较少的那一种决定，太多会把气球吹破。 */

export function gas(soda: number, vinegar: number) {
  return Math.min(soda, vinegar);
}

export type Fizz = "small" | "fit" | "waste" | "big" | "pop";

export function fizz(soda: number, vinegar: number, target: number, popAt: number, strict: boolean): Fizz {
  const made = gas(soda, vinegar);
  if (made >= popAt) return "pop";
  if (made < target) return "small";
  if (made > target) return "big";
  if (strict && (soda !== target || vinegar !== target)) return "waste";
  return "fit";
}

export const balloons = [
  {
    id: 1, title: "吹到三格", target: 3, popAt: 6, strict: false,
    story: "1 勺小苏打配 1 勺醋，放出 1 格气。把气球吹到正好 3 格。",
    win: "气够了。多加的那一种没有搭档，就不会再多出气来。"
  },
  {
    id: 2, title: "一勺都不浪费", target: 3, popAt: 6, strict: true,
    story: "还是 3 格，可是两种都要刚好用完，不能剩下。",
    win: "两种一样多，就全都参加了反应，瓶子里没有剩下的粉末或醋。"
  },
  {
    id: 3, title: "别吹破", target: 4, popAt: 5, strict: false,
    story: "气球只能到 4 格。到了 5 格就会破。",
    win: "4 格刚好。再多一格，橡皮就撑不住了。"
  }
] as const;
