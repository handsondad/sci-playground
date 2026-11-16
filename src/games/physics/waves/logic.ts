/** 傅里叶拼波实验室：几列简单的正弦波叠在一起，能拼出任何周期波形与乐器音色。 */

export type Harmonic = {
  freq: number;
  amp: number;
  phase: number; // degrees
};

export function sampleWave(harmonics: readonly Harmonic[], count = 160): number[] {
  const out = new Array<number>(count).fill(0);
  for (let i = 0; i < count; i++) {
    const t = (i / (count - 1)) * 2 * Math.PI;
    let sum = 0;
    for (const h of harmonics) {
      const phi = (h.phase * Math.PI) / 180;
      sum += h.amp * Math.sin(h.freq * t + phi);
    }
    out[i] = sum;
  }
  return out;
}

export function matchScore(yours: readonly number[], target: readonly number[]): number {
  let err = 0;
  let norm = 0;
  for (let i = 0; i < yours.length; i++) {
    const d = yours[i] - target[i];
    err += d * d;
    norm += target[i] * target[i];
  }
  if (norm < 1e-6) return err < 1e-6 ? 100 : 0;
  const r = Math.sqrt(err / norm);
  return Math.max(0, Math.min(100, Math.round((1 - r) * 100)));
}

export type WaveLevel = {
  id: number;
  title: string;
  story: string;
  hint: string;
  win: string;
  goal: number;
  lockPhase?: boolean;
  channels: readonly { freq: number; label: string; color: string; startAmp: number; startPhase: number }[];
  target: readonly Harmonic[];
};

export const waveLevels: readonly WaveLevel[] = [
  {
    id: 1,
    title: "调对高矮",
    story: "绿虚线是目标波。拖动滑块改变橙色基波的「高矮（振幅）」，让两条波贴在一起！",
    hint: "观察波峰有多高——把 1 倍频的高矮调到 1.20 就能完全重合！",
    win: "振幅决定声音的响度！波峰越高，推空气的力气越大，声音就越响。",
    goal: 92,
    lockPhase: true,
    channels: [{ freq: 1, label: "1倍基波", color: "#ff6b6b", startAmp: 0.45, startPhase: 0 }],
    target: [{ freq: 1, amp: 1.2, phase: 0 }]
  },
  {
    id: 2,
    title: "对齐起步角",
    story: "高矮已经差不多了，可是你的波比目标慢了半拍！调一调「起步（相位）」让波峰对齐。",
    hint: "整圈是 360°，往右挪四分之一圈就是 90°！",
    win: "相位就是波从圆周的哪一个角度出发！高矮和相位都对上，两条波就严丝合缝啦。",
    goal: 92,
    channels: [{ freq: 1, label: "1倍基波", color: "#ff6b6b", startAmp: 1.0, startPhase: 0 }],
    target: [{ freq: 1, amp: 1.0, phase: 90 }]
  },
  {
    id: 3,
    title: "双波合体",
    story: "绿虚线变成了一高一低的驼峰波！单靠一条正弦波画不出来，把 1 倍基波和 2 倍泛音加起来试试。",
    hint: "1 倍基波管大轮廓（调到 1.00），2 倍泛音跑得快一倍（调到 0.60），两列波上下相加就出驼峰啦！",
    win: "两列简单的正弦波一相加，就变出了复杂的新形状！小提琴和长笛音色不同，就是因为泛音比例不同。",
    goal: 90,
    lockPhase: true,
    channels: [
      { freq: 1, label: "1倍基波", color: "#ff6b6b", startAmp: 0.5, startPhase: 0 },
      { freq: 2, label: "2倍泛音", color: "#4d96ff", startAmp: 0.1, startPhase: 0 }
    ],
    target: [
      { freq: 1, amp: 1.0, phase: 0 },
      { freq: 2, amp: 0.6, phase: 0 }
    ]
  },
  {
    id: 4,
    title: "方波的平肩膀",
    story: "圆溜溜的正弦波怎么搭出方方正正的「方波肩膀」？傅里叶的秘诀是加上一丁点 3 倍奇次波！",
    hint: "1 倍基波调到 1.10，3 倍奇次波调到 0.35 左右——看！中间凹下去一点，两边肩膀就变平啦！",
    win: "太酷啦！只要继续加 5 倍、7 倍、9 倍奇次正弦波，圆滑的波就能拼出棱角分明的方波！这就是傅里叶级数。",
    goal: 90,
    lockPhase: true,
    channels: [
      { freq: 1, label: "1倍基波", color: "#ff6b6b", startAmp: 0.8, startPhase: 0 },
      { freq: 3, label: "3倍泛音", color: "#a66cff", startAmp: 0.0, startPhase: 0 }
    ],
    target: [
      { freq: 1, amp: 1.1, phase: 0 },
      { freq: 3, amp: 0.35, phase: 0 }
    ]
  }
];
