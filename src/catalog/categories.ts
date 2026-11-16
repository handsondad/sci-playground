import type { Category } from "./types.ts";

/** 馆里的门类。多一个学科，就在这里加一行。 */
export const categories: readonly Category[] = [
  { id: "math", title: "数学馆", emoji: "➗", blurb: "一笔画奇偶点、汉诺塔、三扇门概率、埃氏筛质数与四色地图。", color: "#4d96ff" },
  { id: "physics", title: "物理馆", emoji: "🧲", blurb: "最速滑梯、正弦拼波、激光反射、浮力、单摆、抛体、杠杆与三原色光。", color: "#ff9f43" },
  { id: "chemistry", title: "化学馆", emoji: "🧪", blurb: "酸碱指示剂、原子天平配平、密度塔、吹气球、焰色烟花与三态微观镜。", color: "#a66cff" },
  { id: "biology", title: "生物馆", emoji: "🌿", blurb: "DNA 碱基配对、食物链、裸蛋渗透、孟德尔豌豆与桦尺蠖自然选择。", color: "#3bb273" },
  { id: "astro", title: "天文馆", emoji: "🌙", blurb: "阴晴圆缺月相、地轴倾斜四季、开普勒行星赛跑与牛顿高山大炮入轨。", color: "#3d5a99" }
];
