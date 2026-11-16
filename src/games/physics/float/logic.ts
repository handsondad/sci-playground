/** 新鲜鸡蛋比水略重，加盐把水的密度抬上去，蛋就会浮起来。密度用克/立方厘米。 */

export function brine(spoons: number) {
  return (100 + spoons * 2) / 100;
}

export type Pose = "sink" | "hover" | "float";

export function pose(liquid: number, egg: number): Pose {
  const gap = Math.round((liquid - egg) * 1000) / 1000;
  if (gap > 0.02) return "float";
  if (gap >= -0.01) return "hover";
  return "sink";
}

export type FloatLevel = {
  id: number;
  title: string;
  story: string;
  egg: number;
  want: Pose;
  win: string;
};

export const floatLevels: readonly FloatLevel[] = [
  {
    id: 1, title: "让它浮起来", egg: 1.08, want: "float",
    story: "这颗蛋按 1.08 算，清水只有 1.00。加盐，把水变得比蛋更重。",
    win: "盐水更重，就把鸡蛋托起来了。死海能漂人，也是这个道理。"
  },
  {
    id: 2, title: "停在半空", egg: 1.08, want: "hover",
    story: "盐要刚好。水的密度和蛋差不多时，它会悬在中间。",
    win: "两边一样重的时候，蛋既不沉底，也不冒出水面。"
  },
  {
    id: 3, title: "更重的一颗", egg: 1.16, want: "float",
    story: "这颗更重。刚才那点盐不够，还得再加。",
    win: "蛋越重，就要越咸的水才托得住。"
  }
];
