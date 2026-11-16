export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export type CipherLevel = {
  id: number;
  title: string;
  mode: "encrypt" | "decrypt";
  sourceText: string;
  targetText: string;
  /** 密码盘密钥偏移量 k (0..25)：外圈明文 A 对准内圈密文的第 k 个字母。 */
  answerKey: number;
  startKey: number;
  showFrequency?: boolean;
  story: string;
  hint: string;
  win: string;
};

/** 凯撒移位变换：对英文字母按 shift（可正可负）在 26 个字母表上循环移位，保留大小写与标点空格。 */
export function caesarShift(text: string, shift: number): string {
  const k = ((Math.round(shift) % 26) + 26) % 26;
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      out += String.fromCharCode(((code - 65 + k) % 26) + 65);
    } else if (code >= 97 && code <= 122) {
      out += String.fromCharCode(((code - 97 + k) % 26) + 97);
    } else {
      out += text[i];
    }
  }
  return out;
}

/** 统计文本中 A~Z 每个大写字母出现的次数（非字母字符自动忽略）。 */
export function letterFrequencies(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ch of ALPHABET) counts[ch] = 0;
  for (const raw of text.toUpperCase()) {
    if (raw >= "A" && raw <= "Z") {
      counts[raw] += 1;
    }
  }
  return counts;
}

/** 找出出现频次最高的字母及其次数。 */
export function topFrequencyLetter(text: string): { letter: string; count: number } {
  const freq = letterFrequencies(text);
  let bestLetter = "A";
  let bestCount = -1;
  for (const ch of ALPHABET) {
    if (freq[ch] > bestCount) {
      bestCount = freq[ch];
      bestLetter = ch;
    }
  }
  return { letter: bestLetter, count: Math.max(0, bestCount) };
}

/** 根据模式与密钥 k (0..25) 计算当前密码盘输出文本。 */
export function transformWithWheel(text: string, key: number, mode: "encrypt" | "decrypt"): string {
  const normalized = ((Math.round(key) % 26) + 26) % 26;
  return mode === "encrypt" ? caesarShift(text, normalized) : caesarShift(text, -normalized);
}

export const cipherLevels: readonly CipherLevel[] = [
  {
    id: 1,
    title: "向右移三格加密",
    mode: "encrypt",
    sourceText: "CAESAR ROME",
    targetText: "FDHVDU URPH",
    answerKey: 3,
    startKey: 0,
    story: "两千年前古罗马统帅凯撒在军中发明了移位密码：把内圈密文盘转到密钥 k = 3，让外圈明文 A 对准内圈密文 D，每个字母往后推 3 格再发出口令『CAESAR ROME』！",
    hint: "把密钥滑块或转盘调到 k = 3（外圈 A 对准内圈 D），明文 C→F、A→D、E→H，口令就会变成 FDHVDU URPH！",
    win: "加密发报成功！哪怕敌军骑兵半路截获了『FDHVDU URPH』，不知道密钥 +3 也只会看得一头雾水！"
  },
  {
    id: 2,
    title: "截获密文倒推",
    mode: "decrypt",
    sourceText: "KHOOR",
    targetText: "HELLO",
    answerKey: 3,
    startKey: 0,
    story: "滴滴！电台收到爸爸发来的神秘密文『KHOOR』，信封角上画着暗号提示【密钥 +3】。赶紧把密码盘对准密钥 3 逆向破译，看看爸爸说了什么英文问候！",
    hint: "发送方加密往右移了 3 格，破译时就要往回退 3 格！把密钥调到 k = 3（内圈密文 K 对回外圈明文 H），KHOOR 就会还原！",
    win: "K→H、H→E、O→L、O→L、R→O，原来是热情的『HELLO』！加 3 加密、减 3 解密，这就是对称密码的钥匙！"
  },
  {
    id: 3,
    title: "未知密钥盲破译",
    mode: "decrypt",
    sourceText: "VFLHQFH",
    targetText: "SCIENCE",
    answerKey: 3,
    startKey: 14,
    story: "这回截获了乱码单词『VFLHQFH』，而且完全没告诉偏移量！别怕，凯撒密码一共只有 25 种非零钥匙，慢慢转动内盘实时预览译文，直到认出有意义的英文单词！",
    hint: "一格一格转动密码盘观察实时译文框：当密钥 k = 3 时，V→S、F→C、L→I、H→E，熟悉的『科学 SCIENCE』就浮现出来啦！",
    win: "暴力枚举大显神威！找出密钥 k = 3 破译出『SCIENCE』！因为钥匙只有 25 把，现代电脑不到一微秒就能试完所有组合！"
  },
  {
    id: 4,
    title: "字母频率侦探",
    mode: "decrypt",
    sourceText: "RLLW ZLJYLA SLAALYZ ZHML LCLYFDOLYL",
    targetText: "KEEP SECRET LETTERS SAFE EVERYWHERE",
    answerKey: 7,
    startKey: 0,
    showFrequency: true,
    story: "终极侦探关！九世纪学者肯迪发现凯撒密码有个致命破绽：英语文章里字母『E』出现得最多！看看下方柱状图里哪根柱子鹤立鸡群，一步算出密钥破译整句名言！",
    hint: "看频率柱状图：密文字母『L』（第 12 个字母）足足出现了 11 次，稳居第一！它大概率就是明文『E』（第 5 个字母），12 − 5 = 7，把密钥直接拨到 k = 7！",
    win: "神探破案！密文最高峰 L 对应英语之王 E，一招锁定 k = 7，破译出『KEEP SECRET LETTERS SAFE EVERYWHERE』！为了防住频率分析，人类后来才发明了多表密码与现代加密算法！"
  }
];
