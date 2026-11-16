export type GearDirection = "cw" | "ccw";

export const GEAR_SIZES = [8, 16, 24, 32] as const;
export const INPUT_RPM = 60;

export type GearLevel = {
  id: number;
  title: string;
  startTeeth: readonly number[];
  targetRatio: number;
  targetDirection?: GearDirection;
  requireThreeShafts?: boolean;
  story: string;
  hint: string;
  win: string;
};

/**
 * 计算齿轮列的速度传动比（末轮转速 / 主动轮转速 = 主动轮齿数 / 末轮齿数）。
 * 例：[24, 8] -> 3.0（三倍加速）；[8, 32] -> 0.25（四倍减速增扭）；[16, 8, 16] -> 1.0。
 */
export function gearRatio(teethList: readonly number[]): number {
  if (teethList.length === 0) return 0;
  const first = teethList[0];
  const last = teethList[teethList.length - 1];
  if (first <= 0 || last <= 0) return 0;
  if (teethList.some((t) => t <= 0)) return 0;
  return first / last;
}

/**
 * 主动轮（第 1 根轴）默认顺时针 ("cw")。
 * 每经过一次外啮合，相邻齿轮转向反转一次：奇数个齿轮末轮顺时针 ("cw")，偶数个逆时针 ("ccw")。
 */
export function outputDirection(teethList: readonly number[]): GearDirection {
  if (teethList.length === 0) return "cw";
  return teethList.length % 2 === 1 ? "cw" : "ccw";
}

export function checkGearGoal(level: GearLevel, teethList: readonly number[]): boolean {
  if (teethList.length < 2) return false;
  if (level.requireThreeShafts && teethList.length < 3) return false;
  const ratio = gearRatio(teethList);
  if (Math.abs(ratio - level.targetRatio) > 0.001) return false;
  if (level.targetDirection && outputDirection(teethList) !== level.targetDirection) {
    return false;
  }
  return true;
}

/** 生成用于 SVG 啮合渲染的标准渐开线风味外齿轮闭合路径。 */
export function buildGearPath(teeth: number, pitchRadius: number): string {
  const addendum = 3.2;
  const dedendum = 3.0;
  const rOuter = pitchRadius + addendum;
  const rRoot = Math.max(4, pitchRadius - dedendum);
  const step = (Math.PI * 2) / teeth;
  const cmds: string[] = [];

  for (let i = 0; i < teeth; i++) {
    const center = i * step;
    const a0 = center - step * 0.36;
    const a1 = center - step * 0.17;
    const a2 = center + step * 0.17;
    const a3 = center + step * 0.36;
    const pts: [number, number][] = [
      [Math.cos(a0) * rRoot, Math.sin(a0) * rRoot],
      [Math.cos(a1) * rOuter, Math.sin(a1) * rOuter],
      [Math.cos(a2) * rOuter, Math.sin(a2) * rOuter],
      [Math.cos(a3) * rRoot, Math.sin(a3) * rRoot]
    ];
    for (let p = 0; p < pts.length; p++) {
      const prefix = i === 0 && p === 0 ? "M" : "L";
      cmds.push(`${prefix}${pts[p][0].toFixed(2)},${pts[p][1].toFixed(2)}`);
    }
  }
  cmds.push("Z");
  return cmds.join(" ");
}

export const gearLevels: readonly GearLevel[] = [
  {
    id: 1,
    title: "风车三倍加速",
    startTeeth: [16, 16],
    targetRatio: 3.0,
    story: "主动轮 A 正以 60 转/分顺时针摇动！想让末端小风车 C 飞快转到【3.0 倍转速（180 转/分）】，应该怎么搭配主动轮和从动轮的齿数？",
    hint: "大齿轮转一圈能拨动小齿轮转好几圈！主动轮选 24 齿、从动轮选 8 齿（24 ÷ 8 = 3.0 倍）试试！",
    win: "呼呼生风！24 齿大轮每转 1 圈，8 齿小轮就得拼命跑完 3 圈（180 RPM）——自行车高速挡就是『大盘带小飞轮』！"
  },
  {
    id: 2,
    title: "吊车大力爬坡",
    startTeeth: [16, 16],
    targetRatio: 0.25,
    story: "矿山绞车要拉起巨石，需要把输出扭矩放大到【4.0 倍】！根据能量守恒，力气放大 4 倍，转速就得降到【0.25×（15 转/分）】——快换上小轮带大轮！",
    hint: "让最小的 8 齿主动轮去啃最大的 32 齿从动轮：8 ÷ 32 = 0.25 倍转速，换来整整 4 倍扭力！",
    win: "稳稳拉起巨石！汽车爬陡坡挂一挡、起重机卷扬机，全靠『小齿轮慢悠悠撬动大齿轮』把力气翻好几倍！"
  },
  {
    id: 3,
    title: "同向等速传动",
    startTeeth: [16, 16],
    targetRatio: 1.0,
    targetDirection: "cw",
    requireThreeShafts: true,
    story: "仔细看：两个咬合齿轮转向总是相反的！可机器要求末轮 C 既保持【1.0× 等速（60 转/分）】，又要跟主动轮 A 一样【顺时针旋转】——快装上中间轴 B 惰轮试试！",
    hint: "点『➕ 装上中间惰轮 B』！只要主动轮 A 和从动轮 C 齿数相同（比如都是 16 齿或 24 齿），中间惰轮不管选几齿，都会把转向翻回顺时针且不改变总传动比！",
    win: "发现机械师的绝招啦！中间齿轮叫『惰轮（过桥轮）』：它的齿数在算式 (N_A/N_B)×(N_B/N_C) = N_A/N_C 里刚好约掉，只负责把转向扭正！"
  },
  {
    id: 4,
    title: "二倍速顺时针钟表针",
    startTeeth: [24, 16, 24],
    targetRatio: 2.0,
    targetDirection: "cw",
    requireThreeShafts: true,
    story: "钟表齿轮箱终极挑战：组合三根轴 A、B、C 的齿轮，同时满足输出转速 = 【2.0×（120 转/分）】并且转向为【顺时针】！",
    hint: "三根轴啮合天然保证顺时针（顺→逆→顺）！再让主动轮 A 的齿数是末轮 C 的 2 倍（例如 16 齿配 8 齿，或 32 齿配 16 齿）就成啦！",
    win: "滴答精准啮合！从瑞士机械表芯到汽车变速箱，再复杂的齿轮迷宫也逃不出『齿数比管快慢、啮合次数管正反』这两条铁律！"
  }
];
