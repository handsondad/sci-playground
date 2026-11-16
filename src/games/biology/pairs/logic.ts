export const complement = { A: "T", T: "A", C: "G", G: "C" } as const;
export type Base = keyof typeof complement;
export const bases = ["A", "T", "C", "G"] as const;

export function partner(base: Base) {
  return complement[base];
}

export function matches(template: string, filled: readonly string[]) {
  return template.split("").every((base, i) => filled[i] === complement[base as Base]);
}

export type Strand = { id: number; title: string; story: string; template: string; given?: readonly string[] };

export const strands: readonly Strand[] = [
  { id: 1, title: "一对", story: "A 对面总是 T。先把这两个格子补上。", template: "AT" },
  { id: 2, title: "四字母", story: "C 对面是 G。点格子，换成正确的碱基。", template: "GCAT" },
  { id: 3, title: "一段基因", story: "这条链长一些。从左到右对过去。", template: "GATTACA" },
  { id: 4, title: "找错", story: "已经填了一部分，但有一格是错的。改到整条都配对。", template: "ACGTAC", given: ["T", "G", "C", "T", "T", "G"] }
];
