export type Genotype = "AA" | "Aa" | "aa";

export type MendelLevel = {
  id: number;
  title: string;
  domSymbol: string;
  recSymbol: string;
  domLabel: string;
  recLabel: string;
  domEmoji: string;
  recEmoji: string;
  domColor: string;
  recColor: string;
  fixedParentA?: Genotype;
  forbidRecessiveParent?: boolean;
  goalDomCount: number; // out of 4 cells in Punnett square (0..4)
  story: string;
  hint: string;
  win: string;
};

export function gametesOf(g: Genotype): [string, string] {
  if (g === "AA") return ["A", "A"];
  if (g === "Aa") return ["A", "a"];
  return ["a", "a"];
}

export function combineAlleles(x: string, y: string): Genotype {
  if (x === "A" && y === "A") return "AA";
  if (x === "a" && y === "a") return "aa";
  return "Aa";
}

export function punnettSquare(p1: Genotype, p2: Genotype): [Genotype, Genotype, Genotype, Genotype] {
  const [a1, a2] = gametesOf(p1);
  const [b1, b2] = gametesOf(p2);
  return [
    combineAlleles(a1, b1),
    combineAlleles(a1, b2),
    combineAlleles(a2, b1),
    combineAlleles(a2, b2)
  ];
}

export function dominantCount(cells: readonly Genotype[]): number {
  return cells.filter((c) => c !== "aa").length;
}

export function formatGenotype(g: Genotype, domSymbol: string, recSymbol: string): string {
  if (g === "AA") return `${domSymbol}${domSymbol}`;
  if (g === "Aa") return `${domSymbol}${recSymbol}`;
  return `${recSymbol}${recSymbol}`;
}

export const mendelLevels: readonly MendelLevel[] = [
  {
    id: 1,
    title: "白花去哪儿了",
    domSymbol: "P",
    recSymbol: "p",
    domLabel: "紫花",
    recLabel: "白花",
    domEmoji: "🪻",
    recEmoji: "🤍",
    domColor: "#9333ea",
    recColor: "#94a3b8",
    fixedParentA: "aa",
    goalDomCount: 4,
    story: "1856 年孟德尔在修道院花园种豌豆：父本固定是一株纯种白花（pp），母本选哪种基因型，才能让棋盘格里的 4 格后代 100% 全开紫花？",
    hint: "只要子代拿到一个大写显性基因 P 就会开紫花！母本选纯合紫花 PP，每个花粉 p 都会遇上 P，4 格全是 Pp 紫花！",
    win: "白花特征并没有消失，而是作为隐性基因 p 悄悄藏在了 Pp 紫花肚子里！接着看下一关它怎么重见天日！"
  },
  {
    id: 2,
    title: "紫花爸妈生白花",
    domSymbol: "P",
    recSymbol: "p",
    domLabel: "紫花",
    recLabel: "白花",
    domEmoji: "🪻",
    recEmoji: "🤍",
    domColor: "#9333ea",
    recColor: "#94a3b8",
    forbidRecessiveParent: true,
    goalDomCount: 3,
    story: "神奇难题：规定爸爸和妈妈两株亲本都必须开紫花（不能选 pp 白花），怎么配对才能在子代花圃里种出『3 株紫花 : 1 株白花』？",
    hint: "把上一关得到的杂合紫花 Pp 和 Pp 自交试试！当爸爸的 p 和妈妈的 p 在右下角相遇成 pp 时，白花就隔代重现啦！",
    win: "这就是遗传学最著名的 3:1 分离定律！就像双眼皮的爸爸妈妈（Aa × Aa），也有四分之一机会生出单眼皮宝宝（aa）！"
  },
  {
    id: 3,
    title: "圆粒皱粒对半开",
    domSymbol: "R",
    recSymbol: "r",
    domLabel: "饱满圆粒",
    recLabel: "干瘪皱粒",
    domEmoji: "🟢",
    recEmoji: "🫘",
    domColor: "#16a34a",
    recColor: "#ca8a04",
    goalDomCount: 2,
    story: "孟德尔接着研究豌豆种子形状：圆粒（R）对皱粒（r）是显性。怎么选两株亲本，让棋盘格里恰好结出『2 格圆粒 : 2 格皱粒（1:1）』？",
    hint: "一株选杂合圆粒 Rr（各提供一半 R 和 r），另一株选纯合皱粒 rr（只提供 r），子代就是 2 格 Rr 圆粒 + 2 格 rr 皱粒！",
    win: "漂亮！这种『杂合子 × 隐性纯合子 = 1:1』的实验在遗传学里叫『测交』，专门用来检验一株显性植物是不是纯种！"
  },
  {
    id: 4,
    title: "百分之百金黄豆荚",
    domSymbol: "G",
    recSymbol: "g",
    domLabel: "绿豆荚",
    recLabel: "黄豆荚",
    domEmoji: "🫛",
    recEmoji: "🌙",
    domColor: "#15803d",
    recColor: "#eab308",
    goalDomCount: 0,
    story: "冷知识：对豌豆豆荚来说，绿色（G）是显性，金黄色（g）反而是隐性！怎样选双亲，才能保证种出的 4 格后代 100% 全是稀有的金黄豆荚？",
    hint: "隐性性状要想 4 格全部表现出来，不能混进哪怕一个显性 G 基因——让双亲都选纯合隐性 gg 吧！",
    win: "纯种金黄豆荚培育成功！一旦双方都是隐性纯合子 gg，往后世世代代自交就再也不会分离出绿豆荚啦！"
  }
];
