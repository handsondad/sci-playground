export function atoms(formula: string): Record<string, number> {
  const read = (text: string, mult: number) => {
    const counts: Record<string, number> = {};
    const add = (el: string, n: number) => { counts[el] = (counts[el] ?? 0) + n * mult; };
    let i = 0;
    while (i < text.length) {
      if (text[i] === "(") {
        const close = text.indexOf(")", i);
        let j = close + 1;
        let num = "";
        while (j < text.length && text[j] >= "0" && text[j] <= "9") num += text[j++];
        const inner = read(text.slice(i + 1, close), num ? Number(num) : 1);
        for (const [el, n] of Object.entries(inner)) add(el, n);
        i = j;
        continue;
      }
      if (text[i] < "A" || text[i] > "Z") { i += 1; continue; }
      let el = text[i++];
      if (i < text.length && text[i] >= "a" && text[i] <= "z") el += text[i++];
      let num = "";
      while (i < text.length && text[i] >= "0" && text[i] <= "9") num += text[i++];
      add(el, num ? Number(num) : 1);
    }
    return counts;
  };
  return read(formula, 1);
}

export type Term = { formula: string; coeff: number };

export function imbalance(left: readonly Term[], right: readonly Term[]): string | null {
  const total: Record<string, number> = {};
  const pile = (terms: readonly Term[], sign: number) => {
    for (const term of terms) {
      for (const [el, n] of Object.entries(atoms(term.formula))) {
        total[el] = (total[el] ?? 0) + sign * term.coeff * n;
      }
    }
  };
  pile(left, 1);
  pile(right, -1);
  const names: Record<string, string> = { H: "氢", O: "氧", C: "碳", N: "氮", Fe: "铁" };
  for (const [el, n] of Object.entries(total)) {
    if (n !== 0) return names[el] ?? el;
  }
  return null;
}

export type Reaction = {
  id: number;
  title: string;
  left: readonly string[];
  right: readonly string[];
  solution: readonly number[];
};

export const reactions: readonly Reaction[] = [
  { id: 1, title: "生成水", left: ["H2", "O2"], right: ["H2O"], solution: [2, 1, 2] },
  { id: 2, title: "碳燃烧", left: ["C", "O2"], right: ["CO2"], solution: [1, 1, 1] },
  { id: 3, title: "合成氨", left: ["N2", "H2"], right: ["NH3"], solution: [1, 3, 2] },
  { id: 4, title: "甲烷燃烧", left: ["CH4", "O2"], right: ["CO2", "H2O"], solution: [1, 2, 1, 2] },
  { id: 5, title: "铁生锈的简化式", left: ["Fe", "O2"], right: ["Fe2O3"], solution: [4, 3, 2] }
];
