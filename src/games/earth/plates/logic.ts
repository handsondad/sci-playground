export type PlateType = "continental" | "oceanic";
export type MantleMotion = "divergent" | "convergent" | "transform";

export type BoundaryResult = {
  landform: string;
  subduction: "none" | "left-under-right" | "right-under-left";
  hasVolcano: boolean;
  hasTrench: boolean;
  hasRiftOrRidge: boolean;
  quakeDepth: string;
  elevationLabel: string;
  summary: string;
};

export type PlateLevel = {
  id: number;
  title: string;
  story: string;
  nianLine: string;
  hint: string;
  win: string;
  startLeft: PlateType;
  startRight: PlateType;
  startMotion: MantleMotion;
  goalMotion: MantleMotion;
  goalPair: "cont-cont" | "ocean-cont" | "ocean-ocean" | "any";
};

export const PLATE_META: Record<PlateType, { label: string; rock: string; density: string }> = {
  continental: {
    label: "🏔️ 大陆板块",
    rock: "花岗岩质 · 厚 35~70km",
    density: "密度小 2.7 g/cm³"
  },
  oceanic: {
    label: "🌊 大洋板块",
    rock: "玄武岩质 · 薄 7~10km",
    density: "密度大 3.0 g/cm³"
  }
};

export const MOTION_META: Record<MantleMotion, { label: string; tag: string }> = {
  divergent: { label: "⬅️➡️ 张裂分离", tag: "生长边界" },
  convergent: { label: "➡️⬅️ 碰撞挤压", tag: "消亡边界" },
  transform: { label: "⇅ 错动平移", tag: "保守边界" }
};

/** 根据左右板块类型与地幔运动方向，推演边界地貌与地质活动。 */
export function simulateBoundary(
  leftPlate: PlateType,
  rightPlate: PlateType,
  motion: MantleMotion
): BoundaryResult {
  if (motion === "transform") {
    return {
      landform: "走滑断层带（圣安德烈斯型）",
      subduction: "none",
      hasVolcano: false,
      hasTrench: false,
      hasRiftOrRidge: false,
      quakeDepth: "浅源强震（无火山喷发）",
      elevationLabel: "水平错位断层谷",
      summary: "两块板块肩并肩反向擦肩错动，岩石卡住积蓄弹性能量后突然崩裂，触发频繁浅源地震，但既不俯冲也不张裂出火山。"
    };
  }

  if (motion === "divergent") {
    if (leftPlate === "oceanic" && rightPlate === "oceanic") {
      return {
        landform: "海底洋中脊（大西洋中脊型）",
        subduction: "none",
        hasVolcano: true,
        hasTrench: false,
        hasRiftOrRidge: true,
        quakeDepth: "浅源地震 + 海底玄武岩溢流",
        elevationLabel: "海底山脉高出洋盆 +2500m",
        summary: "两块大洋板块向两侧拉开，软流层炽热岩浆顺裂缝上涌遇海水冷却，不断生长出年轻的洋底地壳与绵延数万千米的海底山脉！"
      };
    }
    if (leftPlate === "continental" && rightPlate === "continental") {
      return {
        landform: "大陆裂谷带（东非大裂谷型）",
        subduction: "none",
        hasVolcano: true,
        hasTrench: false,
        hasRiftOrRidge: true,
        quakeDepth: "浅源张裂地震 + 裂谷火山",
        elevationLabel: "断陷裂谷湖盆 -600m ~ +1500m",
        summary: "厚重的大陆板块被地幔上涌热柱生生撕开地堑裂谷，积水成串珠状深湖；几千万年后海水灌入就会长成新的海洋！"
      };
    }
    return {
      landform: "被动大陆边缘张裂盆地",
      subduction: "none",
      hasVolcano: true,
      hasTrench: false,
      hasRiftOrRidge: true,
      quakeDepth: "浅源张裂微震",
      elevationLabel: "新生海盆扩张带",
      summary: "大陆与大洋岩石圈拉张变薄，地幔岩浆上涌填充新生洋壳，海岸线逐渐远离扩张中心。"
    };
  }

  // motion === "convergent"
  if (leftPlate === "continental" && rightPlate === "continental") {
    return {
      landform: "巨型褶皱山脉（喜马拉雅造山带）",
      subduction: "none",
      hasVolcano: false,
      hasTrench: false,
      hasRiftOrRidge: false,
      quakeDepth: "浅—中源强烈构造地震",
      elevationLabel: "世界屋脊隆起 +8849m",
      summary: "两块大陆板块都是轻飘飘的花岗岩质（2.7 g/cm³），谁也不肯俯冲沉入地幔，只能正面硬碰硬挤压褶皱，把古海底顶上八千米云霄！"
    };
  }

  if (leftPlate === "oceanic" && rightPlate === "continental") {
    return {
      landform: "万米深海沟 + 陆缘火山弧",
      subduction: "left-under-right",
      hasVolcano: true,
      hasTrench: true,
      hasRiftOrRidge: false,
      quakeDepth: "浅—中—深源俯冲带地震",
      elevationLabel: "海沟 -10900m / 火山弧 +4200m",
      summary: "左侧密度大（3.0 g/cm³）的大洋玄武岩板块一头扎进右侧较轻的大陆板块底下，在交界处拖出万米深海沟，俯冲脱水融化岩浆喷出成排陆缘活火山！"
    };
  }

  if (leftPlate === "continental" && rightPlate === "oceanic") {
    return {
      landform: "万米深海沟 + 陆缘火山弧",
      subduction: "right-under-left",
      hasVolcano: true,
      hasTrench: true,
      hasRiftOrRidge: false,
      quakeDepth: "浅—中—深源俯冲带地震",
      elevationLabel: "火山弧 +4200m / 海沟 -10900m",
      summary: "右侧密度大（3.0 g/cm³）的大洋板块俯冲钻入左侧大陆板块之下，交界弯折出深邃海沟，深处部分熔融的岩浆刺穿陆壳喷发成火山山脉！"
    };
  }

  // oceanic + oceanic convergent
  return {
    landform: "大洋深海沟 + 火山群岛弧",
    subduction: "left-under-right",
    hasVolcano: true,
    hasTrench: true,
    hasRiftOrRidge: false,
    quakeDepth: "浅—深源贝尼奥夫带地震",
    elevationLabel: "海沟 -11034m + 海上火山岛链",
    summary: "两块大洋板块相撞，更古老冰冷、密度略大的一块俯冲下潜形成海沟，海底火山喷出水面连成弯弯的群岛弧。"
  };
}

/** 判断当前板块与运动组合是否达成关卡目标地貌。 */
export function checkPlateGoal(
  level: PlateLevel,
  leftPlate: PlateType,
  rightPlate: PlateType,
  motion: MantleMotion
): boolean {
  if (motion !== level.goalMotion) return false;
  if (level.goalPair === "any") return true;
  if (level.goalPair === "cont-cont") {
    return leftPlate === "continental" && rightPlate === "continental";
  }
  if (level.goalPair === "ocean-ocean") {
    return leftPlate === "oceanic" && rightPlate === "oceanic";
  }
  return (
    (leftPlate === "oceanic" && rightPlate === "continental") ||
    (leftPlate === "continental" && rightPlate === "oceanic")
  );
}

export const plateLevels: readonly PlateLevel[] = [
  {
    id: 1,
    title: "喜马拉雅造山运动",
    story:
      "5000 万年前印度板块一路北漂撞上亚欧板块，把原本的古特提斯海底硬生生挤成了珠穆朗玛峰！快调配左右板块与地幔流向，重现『两块大陆正面碰撞造山』！",
    nianLine: "花岗岩大陆板块密度小，两块一样轻的木块撞在一起，谁都不往下沉，就会往上拱起大雪山吗？",
    hint: "把左侧和右侧都设为『大陆板块（花岗岩密度小）』，地幔运动选『➡️⬅️ 碰撞挤压』！",
    win: "世界屋脊拔地而起！至今印度板块每年还在往北推挤约 5 厘米，珠穆朗玛峰现在依然在悄悄长高呢！",
    startLeft: "continental",
    startRight: "oceanic",
    startMotion: "divergent",
    goalMotion: "convergent",
    goalPair: "cont-cont"
  },
  {
    id: 2,
    title: "马里亚纳海沟与火山弧",
    story:
      "为什么环太平洋一圈既有地球最深的万米海沟，又紧挨着一串冒烟的活火山？请组合出『大洋板块俯冲钻入大陆板块底下』的壮观消亡边界！",
    nianLine: "大洋板块是玄武岩做的，密度 3.0 比大陆花岗岩 2.7 更沉，撞上时一定会往底下钻吧！",
    hint: "一侧选『大洋板块（玄武岩密度大）』，另一侧选『大陆板块（花岗岩密度小）』，运动方式选『➡️⬅️ 碰撞挤压』。",
    win: "俯冲带完美重现！沉重的大洋地壳斜插进地幔拖出深海沟，带下去的海水降低岩石熔点，化作岩浆向上喷出成排火山弧！",
    startLeft: "continental",
    startRight: "continental",
    startMotion: "convergent",
    goalMotion: "convergent",
    goalPair: "ocean-cont"
  },
  {
    id: 3,
    title: "大西洋洋中脊扩张",
    story:
      "大西洋海底藏着一条纵贯南北的『S 形水下山脉』，大洋正在以每年约 2.5 厘米（跟指甲生长差不多快！）的速度变宽。调出海底诞生新地壳的生长边界吧！",
    nianLine: "海底在往两边拉开？那中间裂开的缝隙岂不是会有地幔岩浆冒出来补上？",
    hint: "左右两侧都选『大洋板块』，地幔运动选『⬅️➡️ 张裂分离』，让软流层岩浆上涌建造海底洋中脊！",
    win: "年轻洋壳诞生啦！科学家发现越靠近洋中脊的岩石年龄越年轻，冰岛就是整座露在海面上的大西洋洋中脊火山岛！",
    startLeft: "oceanic",
    startRight: "oceanic",
    startMotion: "convergent",
    goalMotion: "divergent",
    goalPair: "ocean-ocean"
  },
  {
    id: 4,
    title: "圣安德烈斯走滑断层",
    story:
      "加州海岸的公路和果园围栏有时在一夜地震后左右错开好几米，却连一座火山都没有！调出两块板块『擦肩错动平移』的走滑断层边界吧！",
    nianLine: "既不互相对撞挤压，也不向两边拉开，只是肩擦肩错过去，难怪岩浆找不到缝隙喷火山！",
    hint: "把地幔运动方式切换为『⇅ 错动平移』，观察板块水平错位产生的浅源地震波与断裂带！",
    win: "走滑断层破案成功！板块水平擦肩摩擦锁死后突然弹开，只会释放浅源地震能量，不会制造海沟或火山！",
    startLeft: "oceanic",
    startRight: "continental",
    startMotion: "convergent",
    goalMotion: "transform",
    goalPair: "any"
  }
];
