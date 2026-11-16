export type Bit = 0 | 1;

export type BinaryLevel = {
  id: number;
  title: string;
  mode: "cards" | "hand" | "pixels";
  width: number;
  target: number;
  startBits: readonly Bit[];
  /** 5×5 像素矩阵模式（第 4 关）：5 行的十进制目标值与初始行（null 表示需要玩家拨出）。 */
  pixelTargetRows?: readonly number[];
  pixelLockedRows?: readonly boolean[];
  story: string;
  hint: string;
  win: string;
};

/** 把高位在前的二进制数组（如 [0,1,1,0,1]）换算成十进制整数。 */
export function bitsToNumber(bits: readonly (number | boolean)[]): number {
  let total = 0;
  for (const bit of bits) {
    total = total * 2 + (bit ? 1 : 0);
  }
  return total;
}

/** 把非负十进制整数转换成指定位宽（高位在前）的 0/1 数组。 */
export function numberToBits(n: number, width: number): Bit[] {
  const safeWidth = Math.max(1, Math.floor(width));
  const clamped = Math.max(0, Math.floor(n));
  const out = new Array<Bit>(safeWidth).fill(0);
  let rest = clamped;
  for (let i = safeWidth - 1; i >= 0; i--) {
    out[i] = (rest & 1) === 1 ? 1 : 0;
    rest = Math.floor(rest / 2);
  }
  return out;
}

/** 返回指定位宽每张灯卡的位权（如 width=5 -> [16, 8, 4, 2, 1]）。 */
export function bitWeights(width: number): number[] {
  return Array.from({ length: width }, (_, idx) => 2 ** (width - 1 - idx));
}

/** 检查像素矩阵所有行是否全部与目标十进制行值吻合。 */
export function pixelGridSolved(rows: readonly (readonly Bit[])[], targets: readonly number[]): boolean {
  if (rows.length !== targets.length) return false;
  return rows.every((row, idx) => bitsToNumber(row) === targets[idx]);
}

export const binaryLevels: readonly BinaryLevel[] = [
  {
    id: 1,
    title: "五张神卡凑 13",
    mode: "cards",
    width: 5,
    target: 13,
    startBits: [0, 0, 0, 0, 0],
    story: "计算机肚子里没有 2~9，只有『亮灯 1』和『灭灯 0』！桌上摆着 16、8、4、2、1 五张翻倍点阵灯卡，点亮哪几张刚好能凑出十进制数字【13】？",
    hint: "从左往右贪心挑选：16 比 13 大先关掉（0）；点亮 8（还差 5），再点亮 4（还差 1），跳过 2（0），最后点亮 1！8 + 4 + 1 = 13（01101）！",
    win: "01101 = 8 + 4 + 1 = 13！神奇吧？从 0 到 31 之间的每一个整数，这五张翻倍神卡都有且只有唯一一种凑法！"
  },
  {
    id: 2,
    title: "单手数到 31",
    mode: "hand",
    width: 5,
    target: 25,
    startBits: [0, 0, 0, 0, 0],
    story: "普通人一只手只能数到 5，懂二进制的小朋友一只手五根手指分别代表 16、8、4、2、1，全伸开能数到 31！试着用单手手指拨出神秘生日暗号【25】吧！",
    hint: "25 里面包含一个 16（剩 9），9 里面包含一个 8（剩 1），最后加上最右边的 1：拨出 16 + 8 + 1 = 25，也就是二进制 11001！",
    win: "单手比出 25（11001）！要是两只手 10 根手指一起用二进制，足足能从 0 数到 1023 呢！"
  },
  {
    id: 3,
    title: "六位字节电报",
    mode: "cards",
    width: 6,
    target: 42,
    startBits: [0, 0, 0, 0, 0, 0],
    story: "左边再添一张 32 点大灯卡，升级成 6 位电报机！请把《银河系漫游指南》里的宇宙终极答案【42】编译成 0 和 1 发射出去！",
    hint: "42 = 32 + 8 + 2！每隔一位点亮一盏灯，拨出交替闪烁的 101010 试试看！",
    win: "电报发出：101010 = 32 + 8 + 2 = 42！你手机里的文字、音乐和照片，底层全都是这样一串串飞速闪烁的 0 和 1！"
  },
  {
    id: 4,
    title: "二进制像素笑脸",
    mode: "pixels",
    width: 5,
    target: 17,
    startBits: [0, 0, 0, 0, 0],
    pixelTargetRows: [10, 0, 4, 17, 14],
    pixelLockedRows: [true, true, false, false, false],
    story: "黑白屏幕是怎么存图画的？把每一行 5 个像素看成一个 5 位二进制数！前两行双眼（10 → 01010）已经亮好，请把后三行拨成目标数【4、17、14】，让大屏幕显影出像素笑脸！",
    hint: "点选右侧或屏幕上的第 3、4、5 行逐行点亮：第 3 行鼻子 4 = 00100；第 4 行嘴角 17 = 16+1 = 10001；第 5 行笑弧 14 = 8+4+2 = 01110！",
    win: "像素笑脸亮起来啦！早期街机与红白机里的可爱小精灵，就是一行一行用二进制数字画在芯片里的！"
  }
];
