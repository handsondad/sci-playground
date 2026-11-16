/**
 * 「激光折射与光纤」纯物理逻辑层（斯涅尔定律 n₁·sinθ₁ = n₂·sinθ₂ 与全内反射）
 * 灵感致敬 PhET Bending Light。
 */

export type MediumId = "air" | "water" | "glass" | "diamond";

export type MediumInfo = {
  id: MediumId;
  name: string;
  n: number;
  tint: string;
};

export const MEDIA: readonly MediumInfo[] = [
  { id: "air", name: "空气 (n=1.00)", n: 1.0, tint: "#0f172a" },
  { id: "water", name: "清水 (n=1.33)", n: 1.33, tint: "#0c4a6e" },
  { id: "glass", name: "光学玻璃 (n=1.50)", n: 1.5, tint: "#1e3a5f" },
  { id: "diamond", name: "璀璨钻石 (n=2.42)", n: 2.42, tint: "#312e81" }
];

export type RefractionState = {
  angleDeg: number; // 入射角（与法线夹角 10° ~ 80°）
  topMedium: MediumId;
  bottomMedium: MediumId;
};

export type RayResult = {
  n1: number;
  n2: number;
  totalInternalReflection: boolean;
  refractedDeg: number | null;
  criticalDeg: number | null;
  /** 折射光到达下底板 (Δy = 110) 或全反射光到达上顶板 (Δy = 110) 相对法线的水平偏移 px */
  hitOffsetPx: number;
};

export type RefractionLevel = {
  id: number;
  title: string;
  story: string;
  dadTip: string;
  cheer: string;
  explain: string;
  lockMedia?: boolean;
  lockTopMedium?: boolean;
  lockAngleRange?: readonly [number, number];
  start: RefractionState;
  expectTIR: boolean;
  targetOffsetPx: number;
  tolerancePx: number;
  sampleSolution: RefractionState;
};

export function getMedium(id: MediumId): MediumInfo {
  return MEDIA.find((m) => m.id === id) ?? MEDIA[0];
}

/** 根据斯涅尔定律计算折射角、临界角与落点偏移（垂直深度 110 px）。 */
export function traceSnellRay(state: RefractionState): RayResult {
  const n1 = getMedium(state.topMedium).n;
  const n2 = getMedium(state.bottomMedium).n;
  const rad1 = (state.angleDeg * Math.PI) / 180;
  const sin2 = (n1 * Math.sin(rad1)) / n2;
  const criticalDeg = n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : null;

  if (sin2 >= 0.999999) {
    // 发生全内反射，反射角严格等于入射角，返回上层顶板
    const hitOffsetPx = 110 * Math.tan(rad1);
    return {
      n1,
      n2,
      totalInternalReflection: true,
      refractedDeg: null,
      criticalDeg,
      hitOffsetPx
    };
  }

  const rad2 = Math.asin(sin2);
  const refractedDeg = (rad2 * 180) / Math.PI;
  const hitOffsetPx = 110 * Math.tan(rad2);
  return {
    n1,
    n2,
    totalInternalReflection: false,
    refractedDeg,
    criticalDeg,
    hitOffsetPx
  };
}

export function checkRefractionGoal(level: RefractionLevel, state: RefractionState): boolean {
  const res = traceSnellRay(state);
  if (res.totalInternalReflection !== level.expectTIR) return false;
  return Math.abs(res.hitOffsetPx - level.targetOffsetPx) <= level.tolerancePx;
}

export const refractionLevels: readonly RefractionLevel[] = [
  {
    id: 1,
    title: "池底寻宝会拐弯",
    story: "激光从空气斜射进清澈的水池！如果按直线瞄准，光进水后会朝法线方向折弯偏近。请调节入射角，让水下折射光精准照亮池底 +74 px 处的珍珠贝！",
    dadTip: "光从空气进水变慢，折射角比入射角小！把入射角调大到 49° 左右，水下光束就会刚好扫中珍珠贝！",
    cheer: "命中珍珠贝！原来站在岸上看水里的鱼，位置全都是被折射『抬高』的假象！",
    explain: "光在空气里跑得快、在水里跑得慢，就像玩具车斜着冲进草地，先压草地的轮子变慢，车身就往法线方向拐弯啦！这就是斯涅尔折射定律。",
    lockMedia: true,
    start: { angleDeg: 28, topMedium: "air", bottomMedium: "water" },
    expectTIR: false,
    targetOffsetPx: 74,
    tolerancePx: 9,
    sampleSolution: { angleDeg: 49, topMedium: "air", bottomMedium: "water" }
  },
  {
    id: 2,
    title: "钻石的超强弯折力",
    story: "激光架卡在了 55°~65° 的大倾角区间，可宝箱却藏在离法线很近的池底 +44 px 处！清水弯折力不够，快换一种折射率超高的下层介质试试！",
    dadTip: "折射率 n 越大，把光线往法线拉回来的本领越强！把下层换成『璀璨钻石 (n=2.42)』，再微调角度到 61° 左右！",
    cheer: "哇！一换成钻石，斜斜射进来的激光一下子被狠狠拽弯，直插近处宝箱！",
    explain: "钻石的折射率高达 2.42，光钻进钻石后速度骤降到原来的五分之二，折射拐角极大，这就是钻石比普通玻璃火彩璀璨得多的秘密！",
    lockTopMedium: true,
    lockAngleRange: [55, 65],
    start: { angleDeg: 60, topMedium: "air", bottomMedium: "water" },
    expectTIR: false,
    targetOffsetPx: 44,
    tolerancePx: 8,
    sampleSolution: { angleDeg: 61, topMedium: "air", bottomMedium: "diamond" }
  },
  {
    id: 3,
    title: "临界角全内反射",
    story: "反过来让激光从『光学玻璃 (n=1.50)』射向『空气 (n=1.00)』！慢慢调大入射角，一旦跨过神奇的临界角，光居然一滴都不漏出去，100% 反射回玻璃顶部的接收靶 (+132 px)！",
    dadTip: "玻璃对空气的临界角约为 41.8°！把入射角推到 50° 左右，不仅触发全内反射，还能精准命中顶部 +132 px 接收器！",
    cheer: "太神奇了！没有放镜子，透明的空气分界面竟然自己变成了一面完美反射镜！",
    explain: "当光从慢介质（高折射率）斜射向快介质（低折射率）且角度超过临界角时，折射角被撑满 90° 无路可走，全部能量 100% 反射回来，叫作『全内反射』。",
    lockMedia: true,
    start: { angleDeg: 30, topMedium: "glass", bottomMedium: "air" },
    expectTIR: true,
    targetOffsetPx: 132,
    tolerancePx: 11,
    sampleSolution: { angleDeg: 50, topMedium: "glass", bottomMedium: "air" }
  },
  {
    id: 4,
    title: "深海光纤全反射",
    story: "海底光缆泡在『清水 (n=1.33)』里，怎样锁住信号光不漏进海水，并精准弹到顶壁 +158 px 传感器？请亲自挑选上层纤芯材料并调准发射角！",
    dadTip: "要发生全内反射，上层纤芯折射率必须大于下层清水 (1.33)！选光学玻璃或钻石当上层纤芯，再把入射角调到 55° 左右！",
    cheer: "跨洋光纤打通啦！激光被牢牢锁在纤芯里一路狂奔，一丁点都没漏进海水！",
    explain: "现代互联网的海底光纤就是高折射率玻璃芯包着低折射率外衣：激光以大于临界角的角度在纤芯壁上亿万次全反射前进，一秒钟就能绕地球七圈半！",
    start: { angleDeg: 35, topMedium: "water", bottomMedium: "water" },
    expectTIR: true,
    targetOffsetPx: 158,
    tolerancePx: 12,
    sampleSolution: { angleDeg: 55, topMedium: "diamond", bottomMedium: "water" }
  }
];
