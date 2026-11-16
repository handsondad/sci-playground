export type IonId = "Li" | "Na" | "K" | "Ca" | "Ba" | "Cu";

export type MetalIon = {
  id: IonId;
  symbol: string;
  salt: string;
  name: string;
  colorName: string;
  wavelengthNm: number;
  outerHex: string;
  innerHex: string;
  lifeUse: string;
};

export const METAL_IONS: readonly MetalIon[] = [
  {
    id: "Li",
    symbol: "Li⁺",
    salt: "氯化锂 LiCl",
    name: "锂离子",
    colorName: "深洋红 / 紫红",
    wavelengthNm: 670,
    outerHex: "#e11d48",
    innerHex: "#fda4af",
    lifeUse: "手机锂电池里的金属，也是红色信号弹与烟花的主角"
  },
  {
    id: "Na",
    symbol: "Na⁺",
    salt: "氯化钠 NaCl",
    name: "钠离子",
    colorName: "明亮金黄",
    wavelengthNm: 589,
    outerHex: "#f59e0b",
    innerHex: "#fef08a",
    lifeUse: "厨房食盐与马路高压钠灯——煮汤溢锅把燃气灶烧成黄火就是它！"
  },
  {
    id: "K",
    symbol: "K⁺",
    salt: "氯化钾 KCl",
    name: "钾离子",
    colorName: "浅丁香紫",
    wavelengthNm: 404,
    outerHex: "#a855f7",
    innerHex: "#e9d5ff",
    lifeUse: "香蕉与低钠盐里的营养元素，透过蓝色钴玻璃看紫色最清晰"
  },
  {
    id: "Ca",
    symbol: "Ca²⁺",
    salt: "氯化钙 CaCl₂",
    name: "钙离子",
    colorName: "砖红 / 橙红",
    wavelengthNm: 622,
    outerHex: "#ea580c",
    innerHex: "#fed7aa",
    lifeUse: "牛奶骨骼与大理石里的钙，在火焰里会绽放温暖的砖红色"
  },
  {
    id: "Ba",
    symbol: "Ba²⁺",
    salt: "氯化钡 BaCl₂",
    name: "钡离子",
    colorName: "苹果黄绿",
    wavelengthNm: 524,
    outerHex: "#65a30d",
    innerHex: "#d9f99d",
    lifeUse: "节日庆典里所有鲜艳绿色烟花的光源担当"
  },
  {
    id: "Cu",
    symbol: "Cu²⁺",
    salt: "氯化铜 CuCl₂",
    name: "铜离子",
    colorName: "孔雀蓝绿",
    wavelengthNm: 510,
    outerHex: "#0d9488",
    innerHex: "#99f6e4",
    lifeUse: "青铜器铜绿里的元素，能调出烟花里最梦幻的蓝绿色火焰"
  }
];

export type FlameLevel = {
  id: number;
  title: string;
  targetIons: readonly IonId[];
  mode: "mystery" | "firework";
  story: string;
  hint: string;
  win: string;
};

export function findIon(id: IonId): MetalIon {
  return METAL_IONS.find((m) => m.id === id) ?? METAL_IONS[0];
}

export function checkFlameAnswer(selected: readonly IonId[], expected: readonly IonId[]): boolean {
  if (selected.length !== expected.length) return false;
  const a = [...selected].sort();
  const b = [...expected].sort();
  return a.every((v, i) => v === b[i]);
}

export const flameLevels: readonly FlameLevel[] = [
  {
    id: 1,
    title: "灶台黄火之谜",
    targetIons: ["Na"],
    mode: "mystery",
    story: "妈妈煮面汤溢出来滴在蓝色燃气灶上，火苗唰地变成了耀眼的金黄色！先点『烧盲样』观察未知火焰，再在试剂架试烧比对，找出是哪种金属离子！",
    hint: "盲样烧出 589nm 的金黄色火焰！去试剂盘点一点氯化钠（食盐 Na⁺）烧烧看，颜色是不是一模一样？",
    win: "破案啦！食盐里的钠离子受热后电子跃迁，落回低能级时精准吐出 589 纳米的金黄光子！"
  },
  {
    id: 2,
    title: "青铜蓝绿鬼火",
    targetIons: ["Cu"],
    mode: "mystery",
    story: "考古队送来一撮绿色粉末盲样，放进本生灯火焰里竟然烧出了神秘的孔雀蓝绿色（510nm）！快用铂丝试烧对照，鉴定它的身份。",
    hint: "依次蘸取钡盐（黄绿 524nm）和铜盐（孔雀蓝绿 510nm）对比一下——更偏青蓝色的就是铜离子 Cu²⁺！",
    win: "火眼金睛！铜离子的 510nm 蓝绿焰色独一无二，古人炼铜时看炉火变青就知道铜矿化开啦！"
  },
  {
    id: 3,
    title: "丁香紫水晶",
    targetIons: ["K"],
    mode: "mystery",
    story: "3 号盲样烧出了温柔高贵的浅丁香紫色（404nm 短波紫光）！在六瓶金属盐里找出这位紫色魔法师吧。",
    hint: "锂是深洋红，钙是橙红，只有钾离子 K⁺（氯化钾）在火焰中会绽放浪漫的浅紫色！",
    win: "鉴定无误！每种元素的原子能级台阶高度都是专属指纹，天文学家甚至靠星光光谱就能认出几百光年外恒星里有什么元素！"
  },
  {
    id: 4,
    title: "双色庆典烟花",
    targetIons: ["Li", "Ba"],
    mode: "firework",
    story: "终极任务：科学馆夜空要放一场『外圈深洋红 + 内芯苹果黄绿』的双色礼花弹！选出正确的【两种】金属盐装进礼花筒点火升空吧！",
    hint: "深洋红来自锂离子 Li⁺（670nm），苹果黄绿来自钡离子 Ba²⁺（524nm）——勾选这两瓶再点发射烟花！",
    win: "砰——漫天红绿星雨太壮观啦！漫天五彩缤纷的烟花，全都是金属原子里电子跳台阶唱出的光之歌！"
  }
];
