export type PrimeLevel = {
  id: number;
  title: string;
  limit: number;
  brooms: readonly number[];
  parBrooms: number;
  showTwins?: boolean;
  story: string;
  hint: string;
  win: string;
};

export function isPrime(n: number): boolean {
  if (n < 2 || !Number.isInteger(n)) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let d = 3; d * d <= n; d += 2) {
    if (n % d === 0) return false;
  }
  return true;
}

/** 返回被筛掉的合数映射：合数 -> 第一个把它扫掉的质数扫把。 */
export function sieveMarks(limit: number, activeBrooms: readonly number[]): Record<number, number> {
  const marks: Record<number, number> = {};
  for (const p of activeBrooms) {
    if (p < 2) continue;
    for (let m = p * 2; m <= limit; m += p) {
      if (marks[m] === undefined) marks[m] = p;
    }
  }
  return marks;
}

export function remainingNumbers(limit: number, activeBrooms: readonly number[]): number[] {
  const marks = sieveMarks(limit, activeBrooms);
  const out: number[] = [];
  for (let n = 2; n <= limit; n++) {
    if (marks[n] === undefined) out.push(n);
  }
  return out;
}

export function allPrimesFound(limit: number, activeBrooms: readonly number[]): boolean {
  const left = remainingNumbers(limit, activeBrooms);
  return left.length > 0 && left.every(isPrime);
}

export function twinPrimesUpTo(limit: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let n = 2; n + 2 <= limit; n++) {
    if (isPrime(n) && isPrime(n + 2)) pairs.push([n, n + 2]);
  }
  return pairs;
}

export const primeLevels: readonly PrimeLevel[] = [
  {
    id: 1,
    title: "三十寻宝",
    limit: 30,
    brooms: [2, 3, 5, 7],
    parBrooms: 3,
    story: "两千两百年前古希腊学者埃拉托斯特尼发明了『筛子法』：派出质数扫把，把 2 倍、3 倍、4 倍的合数统统扫走，留下的全是质数宝石！试试用尽量少的扫把筛干净 1~30。",
    hint: "先点 2、3、5 三把扫把！你会发现 7 的最小合数倍数是 7×7=49（7×2、7×3、7×5 早就被扫走啦），所以 30 以内根本不用请 7 出马！",
    win: "太神啦！只靠 2、3、5 三把扫把，30 以内的 10 颗质数宝石就一颗不差地露出来啦！"
  },
  {
    id: 2,
    title: "半百密码",
    limit: 50,
    brooms: [2, 3, 5, 7, 11],
    parBrooms: 4,
    story: "方格扩大到 50 啦！49（7×7）混在里面伪装成质数，这次需要请哪几把扫把才能一个不多、一个不少地扫完所有合数？",
    hint: "因为 7×7=49 ≤ 50，所以必须请 7 号扫把扫掉 49；但 11×11=121 远超 50，所以只开 2、3、5、7 四把扫把就能拿满三星！",
    win: "找准平方根边界啦！49 是 50 以内最后一个躲过前几轮的大合数，7 号扫把一出马就水落石出！"
  },
  {
    id: 3,
    title: "百数孪生星",
    limit: 100,
    brooms: [2, 3, 5, 7, 11, 13],
    parBrooms: 4,
    showTwins: true,
    story: "终极百数表！居然只要 4 把扫把就能把 100 以内的 25 颗质数全筛出来，顺便找出相差 2 的『孪生质数对』！",
    hint: "100 的平方根是 10，10 以内的质数只有 2、3、5、7！把这四把扫把依次点亮，别点多余的 11 和 13 就能三星通关！",
    win: "100 以内共 25 个质数、8 对紧挨着只差 2 的孪生质数！直到今天，数学家还在努力证明无穷远处也有无穷多对孪生质数呢！"
  }
];
