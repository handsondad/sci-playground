import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Avatar } from "./Avatar.tsx";
import { Chat, DadSays, NianSays, SpeakButton, starRow } from "./Chrome.tsx";
import type { StageStars } from "./progress.ts";
import { dad, isSpeaking, nian, say, stopSpeaking, useSpeaking, type Line, type Pair } from "./speech.ts";

const burstEmojis = ["🎉", "⭐", "✨", "🌟", "🎊", "💛", "⭐", "✨"];

export function Burst() {
  return (
    <div className="burst" aria-hidden="true">
      {burstEmojis.map((emoji, i) => (
        <span key={i} style={{ "--a": `${i * 45}deg` } as CSSProperties}>{emoji}</span>
      ))}
    </div>
  );
}

/** 首页与大馆顶部的「小念和爸爸」互动舞台，完全对齐 fourier-puzzle-game。 */
export function DuoStage({ chats, title = "小念和爸爸" }: { chats: readonly Pair[]; title?: string }) {
  const [index, setIndex] = useState(0);
  const [nianLine, dadLine] = chats[index % chats.length];
  const speaking = useSpeaking();
  const heard = useRef(false);

  function talk() {
    const next = heard.current ? (index + 1) % chats.length : index;
    heard.current = true;
    setIndex(next);
    say(nian(chats[next][0]), dad(chats[next][1]));
  }

  return (
    <section aria-label={title}>
      <h2 className="section-title">{title}</h2>
      <div className="duo">
        <svg className="duo-waves" viewBox="0 0 800 300" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 212 Q 100 152 200 212 T 400 212 T 600 212 T 800 212 T 1000 212" />
          <path d="M0 234 Q 50 202 100 234 T 200 234 T 300 234 T 400 234 T 500 234 T 600 234 T 700 234 T 800 234 T 900 234 T 1000 234" />
        </svg>
        <div className="duo-sparkles" aria-hidden="true">
          <span>✦</span>
          <span>⚛️</span>
          <span>✦</span>
          <span>🪐</span>
        </div>
        <button
          type="button"
          className={`duo-bubble is-nian${isSpeaking(speaking, "nian", nianLine) ? " is-speaking" : ""}`}
          onClick={talk}
        >
          <b>小念</b>{nianLine}
        </button>
        <button
          type="button"
          className={`duo-bubble is-dad${isSpeaking(speaking, "dad", dadLine) ? " is-speaking" : ""}`}
          onClick={talk}
        >
          <b>爸爸</b>{dadLine}
        </button>
        <button type="button" className="duo-people" onClick={talk} aria-label="点一下，小念和爸爸接着聊">
          <span className="duo-dad"><Avatar who="dad" /></span>
          <span className="duo-nian"><Avatar who="nian" /></span>
        </button>
        <span className="duo-hint" aria-hidden="true">点他们，接着聊 👆</span>
      </div>
    </section>
  );
}

/** 进度/吻合度计量条。 */
export function Meter({ pct, goal, label = "进度", valueText }: {
  pct: number;
  goal?: number;
  label?: string;
  valueText?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const done = goal !== undefined ? clamped >= goal : clamped >= 100;
  return (
    <div
      className="meter"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={`${label} ${valueText ?? `${clamped}%`}`}
    >
      <span className="meter-label">{label}</span>
      <span className="meter-track">
        <span className={`meter-fill${done ? " is-done" : ""}`} style={{ width: `${clamped}%` }} />
        {goal !== undefined && goal < 100 && <span className="meter-goal" style={{ left: `${goal}%` }} />}
      </span>
      <b>{valueText ?? `${clamped}%`}</b>
    </div>
  );
}

export type StageItem = {
  id: number | string;
  title: string;
  emoji?: string;
  stars?: number;
};

/** 关卡选择条：既能一眼看到每关星星，也能随时切关。 */
export function StageStrip({ stages, activeId, stars, color, accent, onSelect }: {
  stages: readonly StageItem[];
  activeId: number | string;
  stars?: StageStars;
  color?: string;
  accent?: string;
  onSelect: (id: any) => void;
}) {
  const tint = color ?? accent ?? "#ff9f43";
  return (
    <nav className="stage-strip" aria-label="选择关卡">
      {stages.map((stage, idx) => {
        const active = stage.id === activeId;
        const earned = stage.stars ?? stars?.[stage.id] ?? stars?.[String(stage.id)] ?? 0;
        const numbered = /^(\d+\.|[①-⑩])/.test(stage.title.trim());
        return (
          <button
            key={stage.id}
            type="button"
            className={`stage-pill${active ? " is-active" : ""}`}
            style={{ "--bubble": tint } as CSSProperties}
            aria-current={active ? "step" : undefined}
            onClick={() => onSelect(stage.id)}
          >
            <span className="stage-pill-title">
              {stage.emoji ? `${stage.emoji} ` : ""}{numbered ? stage.title : `${idx + 1}. ${stage.title}`}
            </span>
            <span className="stage-pill-stars" aria-label={`最高 ${earned} 颗星`}>
              {starRow(earned)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/** 爸爸的提示框。 */
export function HintBox({ text, children }: { text?: string; children?: ReactNode }) {
  return (
    <div className="hint-box" role="note" aria-label="爸爸的提示">
      <DadSays text={text}>{children ?? text}</DadSays>
    </div>
  );
}

/** 过关庆祝卡：烟花、星星、小念欢呼、爸爸揭秘、下一关按钮。 */
export function WinCard({
  stars,
  verdict,
  cheer = "太棒啦，做出来啦！",
  explain,
  dadLine,
  note,
  nextLabel,
  onNext,
  onAgain,
  onRetry
}: {
  stars: number;
  verdict?: string;
  cheer?: string;
  explain?: string;
  dadLine?: string;
  note?: ReactNode;
  nextLabel?: string;
  onNext?: () => void;
  onAgain?: () => void;
  onRetry?: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const dadText = explain ?? dadLine ?? "";
  const retry = onAgain ?? onRetry;

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  return (
    <section ref={ref} className="card win-card" aria-live="polite">
      <Burst />
      <p className="done-stars" aria-label={`${stars} 颗星`}>{starRow(stars)}</p>
      <p className="verdict is-right">🎉 {verdict ?? "挑战成功！"}</p>
      <NianSays>{cheer}</NianSays>
      {dadText && <DadSays>{dadText}</DadSays>}
      {note && <div className="win-note">{note}</div>}
      <div className="done-actions">
        {onNext && nextLabel && (
          <button type="button" className="primary-btn" onClick={onNext} autoFocus>
            {nextLabel}
          </button>
        )}
        {retry && (
          <button type="button" className="pill-btn" onClick={retry}>🔁 再玩一次</button>
        )}
      </div>
    </section>
  );
}

export type TalkTurn = { nian: string; dad: string };
export type TalkItem = {
  emoji: string;
  category?: string;
  title: string;
  turns: readonly TalkTurn[];
  wrap: string;
};

export function talkToLines(talk: TalkItem): Line[] {
  const list: Line[] = [];
  for (const turn of talk.turns) {
    list.push(nian(turn.nian), dad(turn.dad));
  }
  list.push(nian(talk.wrap));
  return list;
}

/** 首页与各门类的「小念问爸爸」折叠问答。 */
export function TalksSection({ talks, title = "小念问爸爸" }: { talks: readonly TalkItem[]; title?: string }) {
  const [open, setOpen] = useState<number | null>(null);

  function toggle(i: number) {
    if (open === i) {
      setOpen(null);
      stopSpeaking();
      return;
    }
    setOpen(i);
    say(...talkToLines(talks[i]));
  }

  if (talks.length === 0) return null;

  return (
    <section aria-label={title}>
      <h2 className="section-title">{title}</h2>
      <div className="talks">
        {talks.map((item, i) => (
          <article
            key={item.title}
            className={`talk-card${open === i ? " is-open" : ""}`}
            style={{ "--i": i } as CSSProperties}
          >
            <button
              type="button"
              className="talk-head"
              aria-expanded={open === i}
              onClick={() => toggle(i)}
            >
              <span className="talk-emoji" aria-hidden="true">{item.emoji}</span>
              <span className="talk-title">
                <span className="talk-asker"><Avatar who="nian" /></span>
                <strong>{item.title}</strong>
              </span>
              <small>{open === i ? "收起 ▲" : "听他们聊 ▶"}</small>
            </button>
            {open === i && <Chat lines={talkToLines(item)} playLabel="从头再听一遍" />}
          </article>
        ))}
      </div>
    </section>
  );
}

export type WikiCardItem = {
  id: string;
  category: string;
  emoji: string;
  era: string;
  scientist: string;
  title: string;
  story: string;
  homeLab: string;
  relatedGameId: string;
  relatedGameTitle: string;
};

/** 科学百宝箱：科学史大师故事 + Exploratorium 风格居家小实验 + 一键跳对应实验台。 */
export function WikiSection({
  items,
  colorsByCategory,
  title = "📚 科学百宝箱 · 大师故事与家庭小实验",
  subtitle = "读一段科学发现背后的真事，今晚就能在餐桌和厨房亲手试一试"
}: {
  items: readonly WikiCardItem[];
  colorsByCategory?: Record<string, string>;
  title?: string;
  subtitle?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-label={title}>
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {subtitle && <span className="section-sub">{subtitle}</span>}
      </div>
      <div className="wiki-grid">
        {items.map((item) => {
          const accent = colorsByCategory?.[item.category] ?? "#ff9f43";
          return (
            <article
              key={item.id}
              className="wiki-card"
              style={{ "--wiki-accent": accent } as CSSProperties}
            >
              <header className="wiki-head">
                <span className="wiki-emoji" aria-hidden="true">{item.emoji}</span>
                <div className="wiki-meta">
                  <small>{item.era} · {item.scientist}</small>
                  <h3>{item.title}</h3>
                </div>
                <SpeakButton text={`${item.scientist}的故事：${item.title}。${item.story} ${item.homeLab}`} who="dad" />
              </header>
              <p className="wiki-story">{item.story}</p>
              <div className="wiki-lab">{item.homeLab}</div>
              <footer className="wiki-foot">
                <button
                  type="button"
                  className="pill-btn wiki-jump"
                  onClick={() => {
                    stopSpeaking();
                    window.location.hash = `#/g/${item.relatedGameId}`;
                  }}
                >
                  🔬 去玩「{item.relatedGameTitle}」 →
                </button>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
