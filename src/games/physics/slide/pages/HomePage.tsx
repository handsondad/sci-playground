import type { CSSProperties } from "react";
import { TopBar, starRow, type Settings } from "../../../../kit/Chrome.tsx";
import { DuoStage } from "../../../../kit/GameKit.tsx";
import { levels } from "../data/levels.ts";

type Stars = Partial<Record<number, number>>;

const chats: readonly (readonly [string, string])[] = [
  ["直线不是最近的吗？弯一下为什么还会先到？", "近说的是路程，滑梯比的是时间！先陡陡地掉下去攒足速度，后面就算长一点也飞快。"],
  ["那条最快的线，是怎么画出来的？", "让一个圆贴着天花板滚，圆边上的一个点画出来的轨迹，就叫「摆线」。"],
  ["听说不管从摆线哪儿放手，到谷底时间都一样？", "对！惠更斯用它造出了最准的摆线钟，连大振幅也不会走慢呢。"]
];

export function HomePage({ stars, quiz, settings, onGo, onExit }: {
  stars: Stars;
  quiz: number;
  settings: Settings;
  onGo: (path: string) => void;
  onExit: () => void;
}) {
  const levelTotal = Object.values(stars).reduce<number>((sum, n) => sum + (n ?? 0), 0);
  const maxTotal = levels.length * 3 + 3;
  const learn = [
    { emoji: "🎡", title: "天花板上的圆", hook: "一个圆贴着天花板滚，边缘的点画出摆线。最快的滑梯就是这条线。", count: "先看它怎么画出来", color: "#4d96ff", path: "roll" },
    { emoji: "🏁", title: "三条一起滑", hook: "直线、抛物线和摆线同时出发。看谁的小球先碰到终点旗子。", count: "眼见为实", color: "#ff6b6b", path: "race" },
    { emoji: "⏱️", title: "等时滑到底", hook: "四个小球从不同高度同时放手，居然同一瞬间到达谷底！", count: "惠更斯的秘密", color: "#a66cff", path: "sync" }
  ];
  const play = [
    { emoji: "🏆", title: "滑梯闯关（8关）", hook: "拖动圆点修一条比直线更快的滑梯！有的关还要躲开石头、钻过木窗。", count: `⭐ ${levelTotal} / ${levels.length * 3}`, color: "#ff9f43", path: "levels" },
    { emoji: "🤔", title: "谁先到底（快问）", hook: "红蓝两条滑梯并排，先用眼睛判断谁更快，再放球验证！", count: quiz ? starRow(quiz) : "可拿 3 颗星", color: "#3bb273", path: "quiz" }
  ];

  return (
    <div className="page home">
      <TopBar
        emoji="🛝"
        title="最快的滑梯 · 最速降线"
        onBack={onExit}
        backLabel="物理馆"
        stars={levelTotal + quiz}
        maxStars={maxTotal}
        settings={settings}
      />

      <DuoStage chats={chats} />

      <Modes id="learn-title" title="看一看 · 摆线剧场" modes={learn} onGo={onGo} />
      <Modes id="play-title" title="玩一玩 · 动手挑战" modes={play} onGo={onGo} />

      <p className="home-credit">
        1696 年约翰·伯努利向全欧洲数学家发问：只靠重力，哪条轨道滑下去最快？牛顿一夜之间解出——答案正是摆线。
      </p>
    </div>
  );
}

function Modes({ id, title, modes, onGo }: {
  id: string;
  title: string;
  modes: { emoji: string; title: string; hook: string; count: string; color: string; path: string }[];
  onGo: (path: string) => void;
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="section-title">{title}</h2>
      <div className="modes">
        {modes.map((mode) => (
          <button key={mode.title} type="button" className="mode-card" style={{ "--bubble": mode.color } as CSSProperties} onClick={() => onGo(mode.path)}>
            <span className="mode-emoji" aria-hidden="true">{mode.emoji}</span>
            <strong>{mode.title}</strong>
            <small>{mode.hook}</small>
            <span className="mode-count"><span>{mode.count}</span><span>进入 →</span></span>
          </button>
        ))}
      </div>
    </section>
  );
}
