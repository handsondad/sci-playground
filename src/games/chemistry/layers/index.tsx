import { useEffect, useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { fault, liquidBy, liquids, towers } from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#2fb380";
const LIQUID_EMOJI: Record<string, string> = {
  honey: "🍯",
  soap: "🧴",
  water: "💧",
  oil: "🌻",
  alcohol: "🍶"
};

export function LayersGame({ exit, sound, setSound }: GameProps) {
  const [towerId, setTowerId] = useState(towers[0].id);
  const starMap = useGameStars("layers");
  const tower = towers.find((item) => item.id === towerId) ?? towers[0];

  const [slots, setSlots] = useState<(string | null)[]>(() => towers[0].ids.map(() => null));
  const [hand, setHand] = useState<string | null>(null);
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const filled = slots.map((id) => id ?? "");
  const problem = fault(filled);
  const next = towers.find((item) => item.id > tower.id);
  const usedSet = new Set<string>(tower.ids);
  const pool = liquids.filter((item) => usedSet.has(item.id) && !slots.includes(item.id));

  useEffect(() => {
    if (sound) say(dad(`第${tower.id}杯，${tower.title}。${tower.story}`));
  }, [tower.id]);

  function load(id: number) {
    const item = towers.find((entry) => entry.id === id) ?? towers[0];
    setTowerId(item.id);
    setSlots(item.ids.map(() => null));
    setHand(null);
    setWonStars(0);
    setShowHint(false);
  }

  function checkAndAward(nextSlots: (string | null)[]) {
    if (fault(nextSlots.map((id) => id ?? "")) === null) {
      const earned = showHint ? 2 : 3;
      setWonStars(earned);
      recordStars("layers", String(tower.id), earned);
      if (sound) {
        chime(true);
        say(dad(tower.win));
      }
    }
  }

  function place(index: number) {
    if (wonStars > 0) return;
    const copy = slots.slice();
    if (!hand) {
      if (!copy[index]) return;
      setHand(copy[index]);
      copy[index] = null;
      setSlots(copy);
      return;
    }
    const sitting = copy[index];
    copy[index] = hand;
    setSlots(copy);
    setHand(sitting);
    checkAndAward(copy);
  }

  function quickPour(id: string) {
    if (wonStars > 0) return;
    const emptyIdx = slots.findIndex((s) => s === null);
    if (hand === id && emptyIdx >= 0) {
      const copy = slots.slice();
      copy[emptyIdx] = id;
      setSlots(copy);
      setHand(null);
      checkAndAward(copy);
    } else {
      setHand(hand === id ? null : id);
    }
  }

  return (
    <div className="page">
      <TopBar
        emoji="🌈"
        title="杯中彩虹 · 液体密度塔"
        onBack={exit}
        backLabel="化学分子馆"
        stars={sumStars(starMap)}
        maxStars={towers.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={towers.map((t) => ({ id: t.id, title: `${t.id}. ${t.title}`, stars: starMap[String(t.id)] ?? 0 }))}
        activeId={tower.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${tower.id} 杯「${tower.title}」：${tower.story} 选中右边试剂瓶，点量筒里的对应层倒进去！`} />

      <div className="workbench">
        <div className="card cylinder-wrap">
          <small style={{ fontWeight: 700, color: "var(--text-secondary)" }}>⬆️ 量筒顶部（最轻）</small>
          <div className="jar">
            {slots.map((id, index) => {
              const item = id ? liquidBy(id) : null;
              return (
                <button
                  key={index}
                  type="button"
                  className={`band${item ? " is-filled" : ""}`}
                  style={{ background: item?.color ?? "transparent" }}
                  onClick={() => place(index)}
                >
                  <span>{item ? `${LIQUID_EMOJI[item.id] ?? ""} ${item.name}` : `第 ${index + 1} 层（点此倒入）`}</span>
                  <small>{item ? `${item.density.toFixed(2)} g/cm³` : ""}</small>
                </button>
              );
            })}
          </div>
          <small style={{ fontWeight: 700, color: "var(--text-secondary)" }}>⬇️ 量筒杯底（最重）</small>
        </div>

        <div className="workbench-side">
          <div className="card">
            <strong style={{ display: "block", marginBottom: 8 }}>🧪 待倒入的液体瓶（再点一次可直接倒入最底空层）</strong>
            <div className="play-actions">
              {pool.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={hand === item.id ? "primary-btn" : "pill-btn"}
                  onClick={() => quickPour(item.id)}
                >
                  <span>{LIQUID_EMOJI[item.id]}</span>
                  <span>{item.name}</span>
                </button>
              ))}
              {pool.length === 0 && <span className="note">所有液体都已进杯！点杯中任意层可取出调整顺序。</span>}
            </div>

            {hand && (
              <p className="banner" style={{ marginTop: 10 }}>
                手里正拿着 <strong>{LIQUID_EMOJI[hand]} {liquidBy(hand).name}</strong>，点左边量筒的某一层放进去吧！
              </p>
            )}

            <div className="play-actions" style={{ marginTop: 12 }}>
              <button type="button" className="pill-btn" onClick={() => load(tower.id)}>
                🔄 倒空重做
              </button>
              <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
                💡 查看密度表
              </button>
            </div>
          </div>

          {wonStars === 0 && slots.every(Boolean) && problem && (
            <NianSays text={`哎呀！${problem} 点杯子里的那一层把它拿出来换换位置吧！`} />
          )}

          {showHint && (
            <HintBox
              text={`密度从重到轻排行榜：🍯蜂蜜(1.42) > 🧴洗洁精(1.06) > 💧水(1.00) > 🌻植物油(0.91) > 🍶酒精(0.79)。越重的越往杯底放！`}
            />
          )}
        </div>
      </div>

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={`太漂亮啦！${tower.ids.length} 层液体稳稳分层成彩虹塔！`}
          dadLine={tower.win}
          onRetry={() => load(tower.id)}
          onNext={next ? () => load(next.id) : exit}
          nextLabel={next ? `下一杯：${next.title} →` : "回化学馆 →"}
        />
      )}
    </div>
  );
}

export const layers = { meta, Play: LayersGame };
