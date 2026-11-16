import { useEffect, useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { chains, ordered } from "./logic.ts";

const ACCENT = "#5ec269";
const ROLES = ["🌱 生产者", "🍽️ 初级消费者", "⚡ 次级消费者", "👑 顶级捕食者"];

export function ChainGame({ exit, sound, setSound }: GameProps) {
  const [puzzleId, setPuzzleId] = useState(chains[0].id);
  const starMap = useGameStars("chain");
  const puzzle = chains.find((item) => item.id === puzzleId) ?? chains[0];

  const [slots, setSlots] = useState<(string | null)[]>(() => chains[0].creatures.map(() => null));
  const [hand, setHand] = useState<string | null>(null);
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const placed = slots.filter((id): id is string => Boolean(id));
  const full = slots.every(Boolean);
  const next = chains.find((item) => item.id > puzzle.id);

  useEffect(() => {
    if (sound) say(dad(`第${puzzle.id}条生态链，${puzzle.title}。${puzzle.story}`));
  }, [puzzle.id]);

  function load(id: number) {
    const item = chains.find((entry) => entry.id === id) ?? chains[0];
    setPuzzleId(item.id);
    setSlots(item.creatures.map(() => null));
    setHand(null);
    setWonStars(0);
    setShowHint(false);
  }

  function evaluate(nextSlots: (string | null)[]) {
    const ids = nextSlots.filter((id): id is string => Boolean(id));
    if (ordered(puzzle.creatures, ids)) {
      const earned = showHint ? 2 : 3;
      setWonStars(earned);
      recordStars("chain", String(puzzle.id), earned);
      if (sound) {
        chime(true);
        say(dad("整条食物链跑通啦！太阳光的能量从绿色植物出发，一级一级传到了顶级捕食者！"));
      }
    } else if (nextSlots.every(Boolean) && sound) {
      chime(false);
    }
  }

  function place(index: number) {
    if (wonStars > 0) return;
    const copy = slots.slice();
    if (!hand) {
      const sitting = copy[index];
      if (sitting) {
        copy[index] = null;
        setSlots(copy);
        setHand(sitting);
      }
      return;
    }
    const sitting = copy[index];
    copy[index] = hand;
    setSlots(copy);
    setHand(sitting);
    evaluate(copy);
  }

  function pickCreature(id: string) {
    if (wonStars > 0) return;
    const emptyIdx = slots.findIndex((s) => s === null);
    if (hand === id && emptyIdx >= 0) {
      const copy = slots.slice();
      copy[emptyIdx] = id;
      setSlots(copy);
      setHand(null);
      evaluate(copy);
    } else {
      setHand(hand === id ? null : id);
    }
  }

  return (
    <div className="page">
      <TopBar
        emoji="🦊"
        title="谁吃谁 · 食物链能量传递"
        onBack={exit}
        backLabel="生物馆"
        stars={sumStars(starMap)}
        maxStars={chains.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={chains.map((c) => ({ id: c.id, title: `${c.id}. ${c.title}`, stars: starMap[String(c.id)] ?? 0 }))}
        activeId={puzzle.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${puzzle.id} 站「${puzzle.title}」：${puzzle.story} 注意箭头「→」代表能量流向吃它的那一级！`} />

      <div className="card">
        <div className="chain-track">
          <span className="chain-step">
            <span className="chain-slot is-filled" style={{ borderColor: "#ffd93d", background: "#fffbeb", minWidth: 88 }}>
              <span className="chain-slot-emoji" aria-hidden="true">☀️</span>
              <strong>太阳光</strong>
              <small>能量源头</small>
            </span>
          </span>

          {slots.map((id, index) => {
            const creature = puzzle.creatures.find((item) => item.id === id);
            const roleLabel = index === slots.length - 1 && slots.length === 3 ? "👑 捕食者" : ROLES[index] ?? `第 ${index + 1} 级`;
            return (
              <span key={index} className="chain-step">
                <span className="chain-arrow" aria-hidden="true">→</span>
                <button
                  type="button"
                  className={`chain-slot${creature ? " is-filled" : ""}`}
                  onClick={() => place(index)}
                >
                  <span className="chain-slot-emoji" aria-hidden="true">{creature ? creature.emoji : "➕"}</span>
                  <strong>{creature ? creature.name : "点此放入"}</strong>
                  <small>{roleLabel}</small>
                </button>
              </span>
            );
          })}
        </div>

        <p className="note" style={{ textAlign: "center", marginTop: 12 }}>
          点下面的生物卡片拿起它，再点上面链条里的空位放下（连点两下生物卡片可直接填入最左空位）：
        </p>

        <div className="play-actions" style={{ justifyContent: "center" }}>
          {puzzle.creatures
            .filter((creature) => !slots.includes(creature.id))
            .map((creature) => (
              <button
                key={creature.id}
                type="button"
                className={hand === creature.id ? "primary-btn" : "pill-btn"}
                onClick={() => pickCreature(creature.id)}
              >
                <span style={{ fontSize: "1.3rem" }}>{creature.emoji}</span>
                <span>{creature.name}</span>
              </button>
            ))}
        </div>

        {hand && (
          <p className="banner" style={{ textAlign: "center" }}>
            正拿着 <strong>{puzzle.creatures.find((c) => c.id === hand)?.emoji} {puzzle.creatures.find((c) => c.id === hand)?.name}</strong>，点上面对应的营养级位置放下吧！
          </p>
        )}

        <div className="play-actions" style={{ justifyContent: "center" }}>
          <button type="button" className="pill-btn" onClick={() => load(puzzle.id)}>
            🔄 清空重排
          </button>
          <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
            💡 生态学提示
          </button>
        </div>
      </div>

      {full && wonStars === 0 && placed.length === puzzle.creatures.length && (
        <NianSays text="顺序好像有点颠倒哦！左边第一棒必须是晒太阳长大的绿色植物，点放错的格子可以把它取下来交换！" />
      )}

      {showHint && (
        <HintBox
          text={`食物链永远从能行光合作用的「生产者」（青草、水稻、绿藻）起步！接着是吃植物的食草小动物，最后是吃肉的捕食者。每往上一级，能量大约只留存十分之一！`}
        />
      )}

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={`生态链贯通！☀️ → ${placed.map((id) => puzzle.creatures.find((c) => c.id === id)?.name).join(" → ")}`}
          dadLine="生态学家发现「十分之一法则」：1000 斤草大约只能养活 100 斤兔子，再养活 10 斤狐狸——所以大自然里老鹰和老虎总是比青草少得多！"
          onRetry={() => load(puzzle.id)}
          onNext={next ? () => load(next.id) : exit}
          nextLabel={next ? `下一站：${next.title} →` : "回生物馆 →"}
        />
      )}
    </div>
  );
}

export const chain = {
  meta: {
    id: "chain",
    category: "biology" as const,
    title: "谁吃谁",
    emoji: "🦊",
    blurb: "从太阳光和绿色植物出发，把草地、稻田和池塘里的生物排成能量传递链！",
    tag: "生态 · 食物链与营养级",
    maxStars: chains.length * 3
  },
  Play: ChainGame
};
