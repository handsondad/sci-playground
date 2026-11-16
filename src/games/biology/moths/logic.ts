export type BarkEnv = "clean" | "soot";

export type MothLevel = {
  id: number;
  title: string;
  startLightPct: number;
  startEnv: BarkEnv;
  lockEnv?: boolean;
  goalCheck: (lightPct: number, gen: number) => boolean;
  goalText: string;
  parGens: number;
  story: string;
  hint: string;
  win: string;
};

/**
 * 根据树皮环境推进一代自然选择：
 * 浅色桦树皮下浅色蛾存活率高（wL=1, wD=0.38）；煤烟黑树皮下深色蛾存活率高（wL=0.38, wD=1）。
 */
export function nextGeneration(lightPct: number, env: BarkEnv): number {
  const p = Math.max(0.02, Math.min(0.98, lightPct / 100));
  const q = 1 - p;
  const wL = env === "clean" ? 1.0 : 0.38;
  const wD = env === "clean" ? 0.38 : 1.0;
  const nextP = (p * wL) / (p * wL + q * wD);
  return Math.max(2, Math.min(98, Math.round(nextP * 100)));
}

export const mothLevels: readonly MothLevel[] = [
  {
    id: 1,
    title: "工业煤烟黑化",
    startLightPct: 84,
    startEnv: "soot",
    lockEnv: true,
    goalCheck: (lightPct) => 100 - lightPct >= 80,
    goalText: "深色蛾占比 ≥ 80%",
    parGens: 5,
    story: "19 世纪英国曼彻斯特工厂冒出滚滚黑烟，把长满浅色地衣的桦树皮熏得乌黑！原本占 84% 的浅色桦尺蠖一下子暴露在小鸟眼前——连续点击『繁衍下一代』，观察种群怎样演变！",
    hint: "黑树皮上浅色蛾太显眼，每代都被小鸟优先吃掉，幸存的深色蛾生下更多深色宝宝——连按 4~5 次『繁衍下一代』就能看到深色蛾突破 80%！",
    win: "不是浅色蛾自己把自己熏黑了，而是拥有深色突变基因的个体更容易躲过小鸟活下来！这就是达尔文说的『自然选择』！"
  },
  {
    id: 2,
    title: "治污重返银桦林",
    startLightPct: 12,
    startEnv: "soot",
    goalCheck: (lightPct) => lightPct >= 80,
    goalText: "浅色蛾占比 ≥ 80%",
    parGens: 6,
    story: "20 世纪中叶人们给烟囱装上除尘器！请你先切换成『🌿 洁净银白桦树皮』，再推进世代，看浅色桦尺蠖能不能重新夺回森林主角！",
    hint: "先把环境按钮切换到『🌿 洁净银白桦树』，这时候反过来轮到黑蛾子在白树干上暴露啦！再推进 5 代即可过关。",
    win: "真实历史正是如此！英国治理空气污染后，生物学家亲眼观测到浅色桦尺蠖比例重新回升到了 80% 以上！"
  },
  {
    id: 3,
    title: "双色物种平衡",
    startLightPct: 88,
    startEnv: "clean",
    goalCheck: (lightPct, gen) => gen >= 2 && lightPct >= 42 && lightPct <= 58,
    goalText: "浅色与深色各占 42%~58%",
    parGens: 4,
    story: "森林边缘既有白桦林又有黑松树！灵活切换两种树林环境推进至少 2 代，把浅色蛾和深色蛾的比例调控在势均力敌的 42% ~ 58% 之间吧！",
    hint: "当前浅色蛾高达 88%，先切到『🏭 煤烟黑树皮』繁衍 2 代，浅色蛾就会降到 50% 左右，立刻达成双色平衡！",
    win: "太稳啦！当环境丰富多样时，不同颜色的基因都能在种群里保留下来，遗传多样性正是生命应对环境剧变的底牌！"
  }
];
