export type Creature = { id: string; name: string; emoji: string; rank: number };

export type ChainPuzzle = { id: number; title: string; story: string; creatures: readonly Creature[] };

export function ordered(creatures: readonly Creature[], ids: readonly string[]) {
  if (ids.length !== creatures.length || ids.some((id) => !id)) return false;
  const rank = (id: string) => creatures.find((creature) => creature.id === id)!.rank;
  for (let i = 1; i < ids.length; i++) if (rank(ids[i]) <= rank(ids[i - 1])) return false;
  return new Set(ids).size === ids.length;
}

export const chains: readonly ChainPuzzle[] = [
  {
    id: 1, title: "草地上",
    story: "能量从生产者开始，一级一级传上去。把它们按谁被谁吃的顺序排好。",
    creatures: [
      { id: "fox", name: "狐狸", emoji: "🦊", rank: 3 },
      { id: "grass", name: "青草", emoji: "🌿", rank: 1 },
      { id: "rabbit", name: "兔子", emoji: "🐰", rank: 2 }
    ]
  },
  {
    id: 2, title: "稻田",
    story: "水稻自己制造养料。后面每一级都吃前一级。",
    creatures: [
      { id: "frog", name: "青蛙", emoji: "🐸", rank: 3 },
      { id: "snake", name: "蛇", emoji: "🐍", rank: 4 },
      { id: "rice", name: "水稻", emoji: "🌾", rank: 1 },
      { id: "locust", name: "蝗虫", emoji: "🦗", rank: 2 }
    ]
  },
  {
    id: 3, title: "池塘",
    story: "浮游植物是生产者。鱼鹰站在最高一级。",
    creatures: [
      { id: "fish", name: "小鱼", emoji: "🐟", rank: 3 },
      { id: "algae", name: "藻", emoji: "🟢", rank: 1 },
      { id: "hawk", name: "鱼鹰", emoji: "🦅", rank: 4 },
      { id: "shrimp", name: "虾", emoji: "🦐", rank: 2 }
    ]
  }
];
