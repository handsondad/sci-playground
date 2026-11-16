export type KeystoneChoice = "none" | "flat" | "inverted" | "wedge";
export type StoneChoice = "flat" | "voussoir";
export type ButtressChoice = "none" | "light" | "heavy";

export type ArchChoices = {
  keystone: KeystoneChoice;
  stoneType: StoneChoice;
  buttress: ButtressChoice;
  riseRatio: number;
};

export type ArchFailureMode =
  | "none"
  | "missing_keystone"
  | "slip_keystone"
  | "slip_voussoirs"
  | "wall_pushout"
  | "too_flat_thrust"
  | "too_peaked_buckle";

export type ArchLevel = {
  id: number;
  title: string;
  tallWalls: boolean;
  heavyCrownLoadKn: number;
  controls: {
    keystone?: boolean;
    stoneType?: boolean;
    buttress?: boolean;
    riseRatio?: boolean;
  };
  initial: ArchChoices;
  targetRiseRange?: readonly [number, number];
  story: string;
  hint: string;
  win: string;
};

export type ArchEvaluation = {
  stable: boolean;
  failureMode: ArchFailureMode;
  horizontalThrustKn: number;
  buttressCapacityKn: number;
  thrustLineInside: boolean;
  reason: string;
};

/**
 * 罗马石拱静力学判定：
 * 1) 拱顶必须有上宽下窄的楔形拱顶石（Keystone）闭合传力环；
 * 2) 两侧拱圈必须采用放射状上宽下窄楔形拱石（Voussoirs），否则竖直砖缝无水平夹紧分力而剪切断落；
 * 3) 水平外推力 H ≈ W_total / (4 * riseRatio) 必须被桥台/飞扶壁抗推能力抵住；
 * 4) 重载高拱的悬链推力线（Thrust Line）必须落在拱圈核心厚度内。
 */
export function evaluateArch(level: ArchLevel, choices: ArchChoices): ArchEvaluation {
  const safeRise = Math.max(0.15, Math.min(0.9, choices.riseRatio));
  const deadWeightKn = 80;
  const totalLoadKn = deadWeightKn + level.heavyCrownLoadKn;
  // 简化三铰拱水平推力 H = W * L / (8 * h) = W / (8 * (h/L))，乘高墙放大系数
  const wallLever = level.tallWalls ? 1.85 : 1.0;
  const horizontalThrustKn = Math.round(((totalLoadKn / (8 * safeRise)) * wallLever) * 10) / 10;

  const buttressCapacityKn =
    choices.buttress === "heavy" ? 95 : choices.buttress === "light" ? 32 : level.tallWalls ? 16 : 55;

  if (choices.keystone === "none") {
    return {
      stable: false,
      failureMode: "missing_keystone",
      horizontalThrustKn,
      buttressCapacityKn,
      thrustLineInside: false,
      reason: "拱顶还空着大缺口呢！抽走木架后，左右两排石头没有顶梁互顶，直接朝中间塌下来啦！"
    };
  }

  if (choices.keystone !== "wedge") {
    return {
      stable: false,
      failureMode: "slip_keystone",
      horizontalThrustKn,
      buttressCapacityKn,
      thrustLineInside: false,
      reason:
        choices.keystone === "flat"
          ? "平直方砖上下一样宽，两侧石头卡不住它，重力一拽就从拱顶直直掉下来了！"
          : "倒梯形上窄下宽，朝下根本没有斜面托住它，一松木架就滑脱坠落啦！"
    };
  }

  if (choices.stoneType !== "voussoir") {
    return {
      stable: false,
      failureMode: "slip_voussoirs",
      horizontalThrustKn,
      buttressCapacityKn,
      thrustLineInside: false,
      reason: "平直长砖砌弯拱时，砖缝全靠摩擦力硬撑，没有『上宽下窄』的斜面互卡，一受压就错位滑落！"
    };
  }

  if (horizontalThrustKn > buttressCapacityKn) {
    return {
      stable: false,
      failureMode: "wall_pushout",
      horizontalThrustKn,
      buttressCapacityKn,
      thrustLineInside: false,
      reason: `石拱产生了 ${horizontalThrustKn.toFixed(0)} kN 向外推力，超出了侧墙抗推极限（${buttressCapacityKn} kN），高墙被往两边推劈叉啦！`
    };
  }

  if (level.targetRiseRange) {
    const [minR, maxR] = level.targetRiseRange;
    if (safeRise < minR) {
      return {
        stable: false,
        failureMode: "too_flat_thrust",
        horizontalThrustKn,
        buttressCapacityKn,
        thrustLineInside: false,
        reason: `拱高比只有 ${safeRise.toFixed(2)}，石拱太扁平了！外推力暴涨到 ${horizontalThrustKn.toFixed(0)} kN，推力线冲出拱脚把石缝撑裂啦！`
      };
    }
    if (safeRise > maxR) {
      return {
        stable: false,
        failureMode: "too_peaked_buckle",
        horizontalThrustKn,
        buttressCapacityKn,
        thrustLineInside: false,
        reason: `拱高比高达 ${safeRise.toFixed(2)}，拱顶太尖瘦了！悬链推力线从两侧拱腰内缘钻出，拱腰鼓肚失稳啦！`
      };
    }
  }

  return {
    stable: true,
    failureMode: "none",
    horizontalThrustKn,
    buttressCapacityKn,
    thrustLineInside: true,
    reason: "推力线稳稳穿过每一块楔形石中心，重力化作锁紧整座拱门的纯压应力！"
  };
}

export const archLevels: readonly ArchLevel[] = [
  {
    id: 1,
    title: "最后嵌上拱顶石",
    tallWalls: false,
    heavyCrownLoadKn: 20,
    controls: { keystone: true },
    initial: {
      keystone: "none",
      stoneType: "voussoir",
      buttress: "heavy",
      riseRatio: 0.5
    },
    story: "古罗马工匠不用一滴水泥就能砌出千年不倒的石桥！木脚手架已经托好左右拱石，请挑一块正确形状的『拱顶石（Keystone）』嵌在最顶端，再撤走木架试试！",
    hint: "观察顶端缺口：上面宽、下面窄！只有选『上宽下窄梯形石』塞进去，它越往下沉就越把左右石头往两边挤紧，自己也绝对掉不下去！",
    win: "木架撤走纹丝不动！拱顶石就像石拱门的『最后一把锁』，重力越往下压，楔形斜面就越把整圈石头挤成铁板一块！"
  },
  {
    id: 2,
    title: "楔形石与平砖",
    tallWalls: false,
    heavyCrownLoadKn: 35,
    controls: { stoneType: true, keystone: true },
    initial: {
      keystone: "flat",
      stoneType: "flat",
      buttress: "heavy",
      riseRatio: 0.5
    },
    story: "小念直接拿砌平墙的『长方平砖』去摆弯拱门，一抽木架哗啦全塌！对比看看：侧拱石和拱顶石分别要换成什么形状才能互卡成拱？",
    hint: "石头怕拉不怕压，但平砖之间没有斜面托举！把侧拱石换成『上宽下窄楔形拱石』，再把顶端也换成『梯形拱顶石』，让每条石缝都指向圆心！",
    win: "块块互锁成半圆！每一块楔形石（Voussoir）都像一个小拱顶石，把竖直向下的重力一步步偏转顺着圆弧传向大地！"
  },
  {
    id: 3,
    title: "飞扶壁抵住外推力",
    tallWalls: true,
    heavyCrownLoadKn: 55,
    controls: { buttress: true },
    initial: {
      keystone: "wedge",
      stoneType: "voussoir",
      buttress: "none",
      riseRatio: 0.5
    },
    story: "中世纪大教堂想把石拱架在又高又薄的彩绘玻璃高墙上，可石拱除了往下压，还会使劲『往左右两边外推』！快给两侧高墙加上抗推机关吧！",
    hint: "单薄小木撑顶不住近百千牛的水平外推力！选『哥特式飞扶壁石墩』从外侧斜斜顶住拱脚，把斜向外的推力掰回竖直方向导入地基！",
    win: "巴黎圣母院同款绝招！哥特式建筑师发明了外墙凌空跨立的『飞扶壁』，既替高墙顶住了石拱外推力，又让墙面能开满绚丽的玫瑰花窗！"
  },
  {
    id: 4,
    title: "悬链线最优高拱",
    tallWalls: false,
    heavyCrownLoadKn: 110,
    controls: { riseRatio: true, buttress: true },
    initial: {
      keystone: "wedge",
      stoneType: "voussoir",
      buttress: "light",
      riseRatio: 0.25
    },
    targetRiseRange: [0.48, 0.62],
    story: "引水渡槽要扛起 110 kN 重载水流！胡克发现『铁链自然下垂的悬链线倒过来，就是最稳的纯受压石拱』。调节拱高比与扶壁，让金色推力线完全留在拱石内！",
    hint: "拱太扁（0.25）外推力会大到爆表，拱太尖（>0.65）拱腰又会鼓裂！先把两侧升为『厚重飞扶壁石墩』，再把拱高跨度比调到 0.50 ~ 0.60 黄金倒悬链区间！",
    win: "倒悬链线神迹达成！英国科学家胡克留下一句建筑名言：『柔链如何下垂，刚拱便如何倒立』——圣路易斯拱门和赵州桥都暗合这条力学曲线！"
  }
];
