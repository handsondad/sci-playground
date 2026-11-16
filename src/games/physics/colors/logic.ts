export type RGB = { r: number; g: number; b: number }; // each 0..100

export type ColorLevel = {
  id: number;
  title: string;
  target: RGB;
  targetName: string;
  start: RGB;
  story: string;
  hint: string;
  win: string;
};

export function rgbToCss({ r, g, b }: RGB): string {
  const rr = Math.round((Math.max(0, Math.min(100, r)) / 100) * 255);
  const gg = Math.round((Math.max(0, Math.min(100, g)) / 100) * 255);
  const bb = Math.round((Math.max(0, Math.min(100, b)) / 100) * 255);
  return `rgb(${rr}, ${gg}, ${bb})`;
}

export function colorMatch(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);
  const maxDist = Math.sqrt(3 * 100 * 100);
  return Math.max(0, Math.round((1 - dist / maxDist) * 100));
}

export function isExactColor(a: RGB, b: RGB, tol = 6): boolean {
  return Math.abs(a.r - b.r) <= tol && Math.abs(a.g - b.g) <= tol && Math.abs(a.b - b.b) <= tol;
}

export function describeLight({ r, g, b }: RGB): string {
  if (r === 0 && g === 0 && b === 0) return "漆黑暗场";
  if (r >= 90 && g >= 90 && b >= 90) return "纯白聚光";
  if (r >= 90 && g >= 90 && b <= 10) return "柠檬黄光";
  if (r <= 10 && g >= 90 && b >= 90) return "冰川青光";
  if (r >= 90 && g <= 10 && b >= 90) return "霓虹品红";
  if (r >= 90 && g >= 40 && g <= 60 && b <= 10) return "落日琥珀橙";
  if (r >= 40 && r <= 60 && g <= 10 && b >= 90) return "星空紫罗兰";
  if (r >= 80 && g <= 20 && b <= 20) return "红光";
  if (g >= 80 && r <= 20 && b <= 20) return "绿光";
  if (b >= 80 && r <= 20 && g <= 20) return "蓝光";
  return "混合彩光";
}

export const colorLevels: readonly ColorLevel[] = [
  {
    id: 1,
    title: "红光加绿光",
    target: { r: 100, g: 100, b: 0 },
    targetName: "明亮柠檬黄",
    start: { r: 100, g: 0, b: 0 },
    story: "画画颜料里红加绿会变灰棕，可在黑暗舞台上，把红色聚光灯和绿色聚光灯叠在一起，调出『明亮柠檬黄』试试！",
    hint: "把红灯开到 100%、绿灯也推到 100%、蓝灯保持 0%！人眼的红敏和绿敏视锥细胞同时兴奋时，大脑看到的就是亮黄色！",
    win: "太神奇啦！色光是『越叠越亮』的加色混合：红光 + 绿光 = 明亮的黄光！手机屏幕上的黄色像素就是靠红绿小灯珠一起亮骗过眼睛的！"
  },
  {
    id: 2,
    title: "冰川青色光",
    target: { r: 0, g: 100, b: 100 },
    targetName: "冰川青光",
    start: { r: 50, g: 50, b: 0 },
    story: "舞台要演海底世界！关掉暖色调，只用三原色灯调出清澈透亮的『冰川青光』吧。",
    hint: "把红灯关到 0%，把绿灯和蓝灯都开满到 100%，绿光 + 蓝光就能合成清凉的青色光！",
    win: "海底亮起来啦！绿光 + 蓝光 = 青光，而红光 + 蓝光则会变成品红光。"
  },
  {
    id: 3,
    title: "无影纯白光",
    target: { r: 100, g: 100, b: 100 },
    targetName: "耀眼纯白光",
    start: { r: 0, g: 100, b: 100 },
    story: "谢幕啦！舞台上没有白炽灯，只有红、绿、蓝三盏彩灯，怎么让演员身上照出纯白色的追光？",
    hint: "牛顿用三棱镜把白光拆成彩虹，反过来把红、绿、蓝三盏灯全都推满到 100%，三原色光汇合就变回纯白光啦！",
    win: "三灯齐亮化作纯白！如果这时候伸手挡在灯前，墙上还会出现红、绿、蓝、黄、青、品红的彩色影子呢！"
  },
  {
    id: 4,
    title: "落日琥珀橙",
    target: { r: 100, g: 50, b: 0 },
    targetName: "落日琥珀橙",
    start: { r: 25, g: 25, b: 75 },
    story: "最后一幕是黄昏晚霞！我们需要介于正红和柠檬黄之间的『落日琥珀橙』，该怎么调每盏灯的亮度比例？",
    hint: "全红+全绿是柠檬黄；想要偏红的温暖橙色，就把红灯开到 100%、绿灯只开一半（50%）、蓝灯关到 0%！",
    win: "晚霞太美啦！调节红绿蓝三原色各自的强弱比例，就能在屏幕上拼出上千万种大自然的颜色！"
  }
];
