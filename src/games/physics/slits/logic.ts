/**
 * 「双缝水波与光纹」纯物理逻辑层（杨氏双缝干涉 Δy = λL / d）
 * 灵感致敬 PhET Wave Interference / Double-Slit & Ripple Tank。
 */

export type SlitsState = {
  wavelengthNm: number; // 400 ~ 700 nm
  slitMm: number;       // 0.20 ~ 0.80 mm
  screenM: number;      // 1.2 ~ 2.8 m
};

export type SlitsLevel = {
  id: number;
  title: string;
  story: string;
  dadTip: string;
  cheer: string;
  explain: string;
  lockSlit?: boolean;
  lockWavelength?: boolean;
  lockScreen?: boolean;
  start: SlitsState;
  mode: "bright1" | "dark1";
  sensorMm: number;
  toleranceMm: number;
  sampleSolution: SlitsState;
};

/** 计算相邻两条亮纹（或暗纹）之间的条纹间距 Δy (mm) = λ(mm) * L(mm) / d(mm)。 */
export function fringeSpacingMm(state: SlitsState): number {
  const lambdaMm = state.wavelengthNm * 1e-6;
  const screenMm = state.screenM * 1000;
  return (lambdaMm * screenMm) / state.slitMm;
}

/** 计算观测屏位置 yMm 处的归一化光强 I ∈ [0, 1]，I(y) = cos²(π d y / (λ L))。 */
export function intensityAtMm(state: SlitsState, yMm: number): number {
  const dy = fringeSpacingMm(state);
  if (dy <= 1e-6) return 0;
  const phase = (Math.PI * yMm) / dy;
  const c = Math.cos(phase);
  return c * c;
}

/** 将可见光波长 (400~700nm) 映射为逼真的光谱 RGB 颜色。 */
export function wavelengthToRgb(nm: number): { r: number; g: number; b: number; hex: string; name: string } {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) {
    r = -(nm - 440) / 40;
    b = 1;
  } else if (nm < 490) {
    g = (nm - 440) / 50;
    b = 1;
  } else if (nm < 510) {
    g = 1;
    b = -(nm - 510) / 20;
  } else if (nm < 580) {
    r = (nm - 510) / 70;
    g = 1;
  } else if (nm < 645) {
    r = 1;
    g = -(nm - 645) / 65;
  } else {
    r = 1;
  }
  const R = Math.round(r * 255);
  const G = Math.round(g * 255);
  const B = Math.round(b * 255);
  const hex = `#${[R, G, B].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  const name =
    nm < 450 ? "紫光" : nm < 495 ? "蓝光" : nm < 565 ? "绿光" : nm < 595 ? "黄光" : nm < 625 ? "橙光" : "红光";
  return { r: R, g: G, b: B, hex, name };
}

export function checkSlitsGoal(level: SlitsLevel, state: SlitsState): boolean {
  const dy = fringeSpacingMm(state);
  if (level.mode === "bright1") {
    // 第一级亮纹位置 y1 = Δy 落在传感器容差范围内
    return Math.abs(dy - level.sensorMm) <= level.toleranceMm;
  }
  // 第一级暗纹位置 y_dark1 = 0.5 * Δy 精确覆盖杂光传感器使其相消变暗
  return Math.abs(0.5 * dy - level.sensorMm) <= level.toleranceMm;
}

export const slitsLevels: readonly SlitsLevel[] = [
  {
    id: 1,
    title: "红光撑开亮条纹",
    story: "一束光穿过两道极细的狭缝，墙上竟然出现了明暗相间的斑马条纹！双缝间距锁在 0.30 mm，请调节光波波长，让第 1 级亮纹精准照亮 4.4 mm 处的能量靶！",
    dadTip: "紫光波长短、条纹挤在一起；往右拉到波长更长的橙红光（约 660 nm），条纹间距就会撑开到 4.4 mm！",
    cheer: "哇！光从蓝色滑到红色，墙上的斑马纹像拉手风琴一样撑开命中靶心啦！",
    explain: "1801 年托马斯·杨用双缝实验证明光是一种波！波长 λ 越长，两列波凑齐一个整波长路程差所需的偏转角就越大，亮条纹间距 Δy = λL/d 自然越宽。",
    lockSlit: true,
    lockScreen: true,
    start: { wavelengthNm: 450, slitMm: 0.3, screenM: 2.0 },
    mode: "bright1",
    sensorMm: 4.4,
    toleranceMm: 0.22,
    sampleSolution: { wavelengthNm: 660, slitMm: 0.3, screenM: 2.0 }
  },
  {
    id: 2,
    title: "狭缝越窄纹越宽",
    story: "这次绿光波长固定在 540 nm 不动！想把第 1 级亮纹推到更远的 4.5 mm 靶心，双缝间距 d 应该调宽还是调窄？动手试试这个反直觉现象！",
    dadTip: "公式里双缝间距 d 在分母上！把双缝拉近调窄到 0.24 mm 左右，墙上的干涉条纹反而会大大张开！",
    cheer: "真神奇！两道缝靠得越近，墙上的亮纹反而张得越开！",
    explain: "两道缝离得越近，光要歪得更远才能攒够一个波长的路程差！这就是光学和衍射里最著名的反比法则：微观缝隙越窄，宏观散开的条纹越宽。",
    lockWavelength: true,
    lockScreen: true,
    start: { wavelengthNm: 540, slitMm: 0.55, screenM: 2.0 },
    mode: "bright1",
    sensorMm: 4.5,
    toleranceMm: 0.25,
    sampleSolution: { wavelengthNm: 540, slitMm: 0.24, screenM: 2.0 }
  },
  {
    id: 3,
    title: "波峰撞波谷变黑夜",
    story: "光加光居然能变成一片漆黑！3.0 mm 处有一颗怕光的暗室探测器，请调波长和缝距，把『第 1 级暗纹』精准压在 3.0 mm 上，让两束光相消归零！",
    dadTip: "第 1 级暗纹在亮纹正中间（0.5 × Δy = 3.0 mm），也就是让条纹间距 Δy = 6.0 mm！试试波长 600 nm、缝距 0.20 mm！",
    cheer: "太震撼了！两束明明亮着的光叠在一起，居然把探测器那儿变成了黑夜！",
    explain: "当两道缝传来的光刚好相差半个波长时，一列波的波峰正撞上另一列波的波谷，振动完全抵消！降噪耳机消除飞机轰鸣声，用的也是同样的『波的相消干涉』。",
    lockScreen: true,
    start: { wavelengthNm: 480, slitMm: 0.4, screenM: 2.0 },
    mode: "dark1",
    sensorMm: 3.0,
    toleranceMm: 0.22,
    sampleSolution: { wavelengthNm: 600, slitMm: 0.2, screenM: 2.0 }
  },
  {
    id: 4,
    title: "远屏精密光谱仪",
    story: "终极挑战：把屏幕距离 L、波长 λ 和狭缝间距 d 全都交给你！请把第 1 级亮纹精准投射到超远端 7.5 mm 的高精传感器上！",
    dadTip: "拉开屏幕距离 L 也能放大条纹！比如把屏幕推到 2.5 m、缝距缩到 0.20 mm、波长调到 600 nm，Δy 刚好等于 7.50 mm！",
    cheer: "毫厘不差！你亲手调好了一台能用条纹尺子测量纳米光波长的光谱仪！",
    explain: "光波波长只有头发丝的百分之一（几百纳米），肉眼根本没法拿尺子量；但双缝干涉把它放大了上万倍变成毫米级的条纹，让人类得以精确读出恒星的化学指纹！",
    start: { wavelengthNm: 500, slitMm: 0.45, screenM: 1.6 },
    mode: "bright1",
    sensorMm: 7.5,
    toleranceMm: 0.26,
    sampleSolution: { wavelengthNm: 600, slitMm: 0.2, screenM: 2.5 }
  }
];
