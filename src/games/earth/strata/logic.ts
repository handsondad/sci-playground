export type StratumItem = {
  id: string;
  name: string;
  era: string;
  fossilEmoji: string;
  envTag: string;
  color: string;
  pattern: "marine" | "coal" | "sand" | "ice" | "dike";
};

export type StrataMode = "stack" | "paleoenv" | "crosscut" | "correlate";

export type StrataLevel = {
  id: number;
  title: string;
  mode: StrataMode;
  story: string;
  nianLine: string;
  hint: string;
  win: string;
  orderPrompt: string;
  items: readonly StratumItem[];
  /** Expected chronological order from earliest/bottom (index 0) to latest/top (last index) */
  expected: readonly string[];
  startOrder: readonly string[];
};

/** 检验玩家排列的地层/事件顺序是否与真实地质年代（由老到新 / 由下到上）完全一致。 */
export function isChronological(
  order: readonly string[],
  expected: readonly string[]
): boolean {
  if (order.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i += 1) {
    if (order[i] !== expected[i]) return false;
  }
  return true;
}

/** 交换数组中两个相邻或指定位置的元素，返回新数组。 */
export function swapAt<T>(arr: readonly T[], i: number, j: number): T[] {
  const next = [...arr];
  if (i < 0 || j < 0 || i >= next.length || j >= next.length) return next;
  const tmp = next[i];
  next[i] = next[j];
  next[j] = tmp;
  return next;
}

export const strataLevels: readonly StrataLevel[] = [
  {
    id: 1,
    title: "下老上新叠覆律",
    mode: "stack",
    story:
      "地质学家斯丹诺发现大地就像一摞摊煎饼：先沉积的泥沙在最底下，后沉积的盖在上面（叠覆律）！快把被打乱的 4 层古生物化石岩层按『最底下最古老 → 最顶上最年轻』重新垒好！",
    nianLine: "5 亿年前的三叶虫最早出现，肯定压在最底下；2 万年前的长毛猛犸象最年轻，应该住在最顶层！",
    hint: "按时间从老到新（从第 1 层底层到第 4 层顶层）：①三叶虫（5亿年）→ ②蕨类煤层（3亿年）→ ③霸王龙砂岩（7000万年）→ ④猛犸象黄土（2万年）！",
    win: "地质时间书装订完成！每一层岩石都是地球写下的一页日记，越往深处挖，看到的世界越古老！",
    orderPrompt: "按『底层最老 → 顶层最新』排列 4 层化石岩层",
    expected: ["trilobite", "fern", "trex", "mammoth"],
    startOrder: ["trex", "trilobite", "mammoth", "fern"],
    items: [
      {
        id: "trilobite",
        name: "三叶虫灰岩层",
        era: "5 亿年前 · 寒武纪",
        fossilEmoji: "🦐",
        envTag: "温暖浅海",
        color: "#38bdf8",
        pattern: "marine"
      },
      {
        id: "fern",
        name: "树蕨乌金煤层",
        era: "3 亿年前 · 石炭纪",
        fossilEmoji: "🌿",
        envTag: "森林沼泽",
        color: "#475569",
        pattern: "coal"
      },
      {
        id: "trex",
        name: "霸王龙红砂岩",
        era: "7000 万年前 · 白垩纪",
        fossilEmoji: "🦖",
        envTag: "炎热陆地",
        color: "#f97316",
        pattern: "sand"
      },
      {
        id: "mammoth",
        name: "猛犸象臼齿砾层",
        era: "2 万年前 · 第四纪",
        fossilEmoji: "🦣",
        envTag: "寒冷冰期",
        color: "#eab308",
        pattern: "ice"
      }
    ]
  },
  {
    id: 2,
    title: "珠峰顶上的海螺化石",
    mode: "paleoenv",
    story:
      "中国科考队在海拔 8000 多米的珠穆朗玛峰岩石里，竟然敲出了菊石和海螺化石！请根据珠峰剖面从底到顶的岩石证据，还原喜马拉雅『沧海变桑田』的古环境演变顺序！",
    nianLine: "世界最高峰以前居然泡在海底？怪不得成语叫『沧海桑田』！",
    hint: "先有最古老的『远古特提斯深海』放射虫硅质岩，接着海水变浅成『珊瑚海螺浅海滩』，最后两块大陆相撞隆起成『冰雪高山陆地』！",
    win: "沧海桑田破译成功！北宋沈括在太行山崖壁看到螺蚌壳和卵石带，比西方早几百年就推断出高山曾是远古海滨！",
    orderPrompt: "按『最早古环境 → 现代环境』排列喜马拉雅演变三部曲",
    expected: ["deep-sea", "shallow-shoal", "high-land"],
    startOrder: ["high-land", "deep-sea", "shallow-shoal"],
    items: [
      {
        id: "deep-sea",
        name: "远古特提斯深海盆",
        era: "阶段一 · 硅质岩与放射虫",
        fossilEmoji: "🪼",
        envTag: "幽暗深海沉积",
        color: "#1d4ed8",
        pattern: "marine"
      },
      {
        id: "shallow-shoal",
        name: "阳光温暖浅海滩",
        era: "阶段二 · 菊石与海百合灰岩",
        fossilEmoji: "🐚",
        envTag: "地壳抬升成浅海",
        color: "#06b6d4",
        pattern: "marine"
      },
      {
        id: "high-land",
        name: "隆起极寒高山陆地",
        era: "阶段三 · 陆相砾岩与冰碛物",
        fossilEmoji: "🏔️",
        envTag: "板块碰撞成屋脊",
        color: "#94a3b8",
        pattern: "ice"
      }
    ]
  },
  {
    id: 3,
    title: "谁先谁后（切割律）",
    mode: "crosscut",
    story:
      "地质侦探推理题！崖壁上一道滚烫凝固的『暗红火山岩脉』一剑刺穿了三叶虫层、蕨类煤层和恐龙砂岩，却在猛犸象砾石层底下戛然而止（没切穿猛犸象层）！请排清这 5 桩事件的先后发生顺序！",
    nianLine: "好比切生日蛋糕——必须先把下面三层蛋糕坯叠好，刀子（火山岩脉）才能切穿它们；最后再铺最上面那层奶油（猛犸象层）盖住刀口！",
    hint: "『切割律』铁则：被切穿的岩层一定比切割它的岩脉更古老；盖在岩脉顶上没被切到的岩层比岩脉更年轻！所以岩脉排在第 4（恐龙之后、猛犸象之前）！",
    win: "福尔摩斯级地质推理！靠叠覆律加切割律，哪怕没有放射性仪器，地质学家看一眼崖壁就能还原亿万年前的火山入侵案！",
    orderPrompt: "按『最早发生 → 最晚发生』排列全部 5 个地质事件",
    expected: ["trilobite", "fern", "trex", "dike", "mammoth"],
    startOrder: ["trilobite", "dike", "fern", "mammoth", "trex"],
    items: [
      {
        id: "trilobite",
        name: "沉积三叶虫灰岩",
        era: "5 亿年前（被岩脉切穿）",
        fossilEmoji: "🦐",
        envTag: "底层海相灰岩",
        color: "#38bdf8",
        pattern: "marine"
      },
      {
        id: "fern",
        name: "沉积蕨类黑煤层",
        era: "3 亿年前（被岩脉切穿）",
        fossilEmoji: "🌿",
        envTag: "中下层沼泽煤",
        color: "#475569",
        pattern: "coal"
      },
      {
        id: "trex",
        name: "沉积恐龙红砂岩",
        era: "7000 万年前（被岩脉切穿）",
        fossilEmoji: "🦖",
        envTag: "中上层陆相砂岩",
        color: "#f97316",
        pattern: "sand"
      },
      {
        id: "dike",
        name: "火山玄武岩脉侵入",
        era: "约 4000 万年前（刺穿前三层）",
        fossilEmoji: "🌋",
        envTag: "岩浆上升冷凝切割",
        color: "#dc2626",
        pattern: "dike"
      },
      {
        id: "mammoth",
        name: "覆盖猛犸象砾石层",
        era: "2 万年前（平铺盖住岩脉顶口）",
        fossilEmoji: "🦣",
        envTag: "顶层未受切割",
        color: "#eab308",
        pattern: "ice"
      }
    ]
  },
  {
    id: 4,
    title: "跨峡谷岩层对比",
    mode: "correlate",
    story:
      "奔腾的大河把高原切出一道深谷，右岸岩层还发生了倾斜错位！幸好同一时代的『标准化石』长相一样。请把右岸 4 块含化石岩层调整到与左岸【从底到顶】一一配对连线的位置！",
    nianLine: "不管岩石被河水冲断还是歪斜了，只要里面埋着同一种标准化石，它们就是同一年龄的亲兄弟地层！",
    hint: "看左崖壁从下到上的 4 种化石图标：①菊石 🐚 → ②硅化木 🪵 → ③剑龙骨板 🦕 → ④剑齿虎牙 🐯，把右侧列表调成完全一致的从底到顶顺序！",
    win: "跨峡谷地层连线严丝合缝！英国工程师威廉·史密斯当年修运河时正是靠化石配对法，画出了人类历史上第一张全国地质图！",
    orderPrompt: "调准右岸岩层（从底到顶），与左岸标准化石一一连线配对",
    expected: ["ammonite", "wood", "stego", "saber"],
    startOrder: ["stego", "ammonite", "saber", "wood"],
    items: [
      {
        id: "ammonite",
        name: "右岸 · 缝合菊石页岩",
        era: "配对左岸第 1 底层 🐚",
        fossilEmoji: "🐚",
        envTag: "古生代末浅海",
        color: "#0284c7",
        pattern: "marine"
      },
      {
        id: "wood",
        name: "右岸 · 玛瑙硅化木层",
        era: "配对左岸第 2 层 🪵",
        fossilEmoji: "🪵",
        envTag: "三叠纪针叶林",
        color: "#64748b",
        pattern: "coal"
      },
      {
        id: "stego",
        name: "右岸 · 剑龙骨板砂岩",
        era: "配对左岸第 3 层 🦕",
        fossilEmoji: "🦕",
        envTag: "侏罗纪河湖平原",
        color: "#ea580c",
        pattern: "sand"
      },
      {
        id: "saber",
        name: "右岸 · 剑齿虎黄土层",
        era: "配对左岸第 4 顶层 🐯",
        fossilEmoji: "🐯",
        envTag: "更新世草原",
        color: "#ca8a04",
        pattern: "ice"
      }
    ]
  }
];
