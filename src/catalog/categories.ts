import type { Category } from "./types.ts";

/** 馆里的九大科学工程门类（3×3 对称展馆矩阵）。 */
export const categories: readonly Category[] = [
  {
    id: "math",
    title: "数学思维馆",
    emoji: "➗",
    blurb: "一笔画拓扑、汉诺塔递归、三扇门概率、埃氏筛质数、四色地图与黄金角螺旋。",
    color: "#4d96ff"
  },
  {
    id: "physics",
    title: "声光电磁馆",
    emoji: "💡",
    blurb: "正弦拼波泛音、激光反射、RGB 三原色舞台灯、浮力天平、单摆对表与串并联电路。",
    color: "#f59e0b"
  },
  {
    id: "mechanics",
    title: "机械动力馆",
    emoji: "⚙️",
    blurb: "最速降线滑梯、阿基米德杠杆力矩、抛体投石弹道、齿轮变速箱与动滑轮起重机。",
    color: "#ea580c"
  },
  {
    id: "architecture",
    title: "建筑结构馆",
    emoji: "🏛️",
    blurb: "三角形桁架大桥、无胶罗马石拱门、悬臂叠砖桥、摩天楼抗震阻尼器与冬暖夏凉挑檐。",
    color: "#b45309"
  },
  {
    id: "chemistry",
    title: "化学分子馆",
    emoji: "🧪",
    blurb: "酸碱彩虹指示剂、原子天平配平、五层液体密度塔、限量反应物气球、焰色光谱与三态相变。",
    color: "#a66cff"
  },
  {
    id: "biology",
    title: "生命科学馆",
    emoji: "🌿",
    blurb: "DNA 双螺旋碱基配对、生态食物链、半透膜渗透、孟德尔豌豆遗传棋盘与桦尺蠖自然选择。",
    color: "#3bb273"
  },
  {
    id: "earth",
    title: "地球地理馆",
    emoji: "🌍",
    blurb: "等高线地形剖面、大陆板块构造、迎风坡地形雨与焚风、古生物化石地层与海陆季风环流。",
    color: "#0ea5e9"
  },
  {
    id: "astro",
    title: "天文宇宙馆",
    emoji: "🪐",
    blurb: "阴晴圆缺月相、23.5° 地轴四季、开普勒行星公转定律、牛顿高山大炮入轨与日月食交点。",
    color: "#3d5a99"
  },
  {
    id: "computing",
    title: "计算逻辑馆",
    emoji: "💻",
    blurb: "二进制翻牌编码、与或非逻辑门机关、凯撒转盘密码学、天平三分找次品与最短路径寻宝。",
    color: "#14b8a6"
  }
];
