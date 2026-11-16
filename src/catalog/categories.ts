import type { Category } from "./types.ts";

/** 馆里的九大科学工程门类（3×3 对称展馆矩阵）。 */
export const categories: readonly Category[] = [
  {
    id: "math",
    title: "数学思维馆",
    emoji: "➗",
    blurb: "一笔画拓扑、汉诺塔递归、三扇门概率、埃氏筛质数、四色地图、黄金螺旋与傅里叶圆周画板。",
    color: "#4d96ff"
  },
  {
    id: "physics",
    title: "声光电磁馆",
    emoji: "💡",
    blurb: "正弦拼波、镜面反射、RGB 混光、浮力天平、单摆、串并联电路、电场冰球、双缝干涉与光纤全反射。",
    color: "#f59e0b"
  },
  {
    id: "mechanics",
    title: "机械动力馆",
    emoji: "⚙️",
    blurb: "最速降线滑梯、杠杆力矩、抛体弹道、齿轮变速箱、动滑轮起重机、滑板能量公园与 v-t 图像赛车。",
    color: "#ea580c"
  },
  {
    id: "architecture",
    title: "建筑结构馆",
    emoji: "🏛️",
    blurb: "三角形桁架大桥、无胶罗马石拱门、悬臂叠砖桥、摩天楼抗震阻尼器、四季挑檐与悬索大桥主缆。",
    color: "#b45309"
  },
  {
    id: "chemistry",
    title: "化学分子馆",
    emoji: "🧪",
    blurb: "酸碱彩虹指示剂、原子天平配平、液体密度塔、限量反应气球、焰色光谱、三态相变与理想气体压力舱。",
    color: "#a66cff"
  },
  {
    id: "biology",
    title: "生命科学馆",
    emoji: "🌿",
    blurb: "DNA 双螺旋配对、生态食物链、半透膜渗透、孟德尔豌豆遗传、桦尺蠖演化与 SIR 群体免疫屏障。",
    color: "#3bb273"
  },
  {
    id: "earth",
    title: "地球地理馆",
    emoji: "🌍",
    blurb: "等高线地形剖面、大陆板块构造、迎风坡地形雨与焚风、古生物化石地层、海陆环流与地球温室调温器。",
    color: "#0ea5e9"
  },
  {
    id: "astro",
    title: "天文宇宙馆",
    emoji: "🪐",
    blurb: "阴晴圆缺月相、23.5° 地轴四季、开普勒行星定律、牛顿高山大炮、日月食交点与霍曼火星变轨。",
    color: "#3d5a99"
  },
  {
    id: "computing",
    title: "计算逻辑馆",
    emoji: "💻",
    blurb: "二进制翻牌编码、与或非逻辑门、凯撒密码分析、天平三分查找、最短路径寻宝与元胞森林防火。",
    color: "#14b8a6"
  }
];
