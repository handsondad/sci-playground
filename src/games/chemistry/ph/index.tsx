import { useEffect, useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { cups, drops, indicator, pour, type DropId } from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#2fb380";
const DROP_META: Record<DropId, { icon: string; desc: string }> = {
  a1: { icon: "🍋", desc: "柠檬弱酸" },
  a2: { icon: "⚡", desc: "浓缩强酸" },
  b1: { icon: "🧼", desc: "小苏打弱碱" },
  b2: { icon: "🧪", desc: "强力碱液" }
};

function phNature(v: number) {
  if (v < 7) return "酸性溶液";
  if (v > 7) return "碱性溶液";
  return "中性纯水";
}

export function PhGame({ exit, sound, setSound }: GameProps) {
  const [cupId, setCupId] = useState(cups[0].id);
  const [used, setUsed] = useState<DropId[]>([]);
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const starMap = useGameStars("ph");
  const cup = cups.find((item) => item.id === cupId) ?? cups[0];
  const currentPh = pour(cup.start, used);
  const done = currentPh === cup.target;
  const spent = used.length >= cup.limit;
  const next = cups.find((item) => item.id > cup.id);

  useEffect(() => {
    if (sound) say(dad(`第${cup.id}杯，${cup.title}。${cup.story}`));
  }, [cup.id]);

  function load(id: number) {
    setCupId(id);
    setUsed([]);
    setWonStars(0);
    setShowHint(false);
  }

  function add(id: DropId) {
    if (done || spent) return;
    const nextUsed = [...used, id];
    setUsed(nextUsed);
    const nextPh = pour(cup.start, nextUsed);
    if (nextPh === cup.target) {
      const earned = showHint ? 2 : 3;
      setWonStars(earned);
      recordStars("ph", String(cup.id), earned);
      if (sound) {
        chime(true);
        say(dad(`好准！溶液变成 pH ${cup.target} 的${phNature(cup.target)}啦！`));
      }
    } else if (nextUsed.length >= cup.limit && sound) {
      chime(false);
    }
  }

  return (
    <div className="page">
      <TopBar
        emoji="🧪"
        title="调酸碱 · 彩虹指示剂"
        onBack={exit}
        backLabel="化学分子馆"
        stars={sumStars(starMap)}
        maxStars={cups.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={cups.map((c) => ({ id: c.id, title: `${c.id}. ${c.title}`, stars: starMap[String(c.id)] ?? 0 }))}
        activeId={cup.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${cup.id} 杯「${cup.title}」：${cup.story}`} />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="ph-scale" role="img" aria-label={`pH 色卡，当前 ${currentPh}，目标 ${cup.target}`}>
          {Array.from({ length: 15 }, (_, v) => (
            <div
              key={v}
              className={`ph-tick${v === currentPh ? " is-current" : ""}${v === cup.target ? " is-target" : ""}`}
              style={{ background: indicator(v) }}
            >
              {v}
            </div>
          ))}
        </div>
        <p className="note" style={{ marginTop: 8, textAlign: "center" }}>
          ◀ 0~6 越左越酸（红橙黄） · <strong>7 中性（翠绿）</strong> · 8~14 越右越碱（青蓝紫） ▶
        </p>
      </div>

      <div className="workbench">
        <div className="card" style={{ display: "grid", justifyItems: "center" }}>
          <svg viewBox="0 0 220 210" style={{ width: "100%", maxWidth: 260, display: "block" }} aria-hidden="true">
            {/* Conical flask liquid */}
            <path
              d="M 66 106 L 38 176 Q 32 192 50 192 L 170 192 Q 188 192 182 176 L 154 106 Z"
              fill={indicator(currentPh)}
              style={{ transition: "fill 0.35s ease" }}
            />
            <ellipse
              cx="110"
              cy="106"
              rx="44"
              ry="6"
              fill={indicator(currentPh)}
              filter="brightness(1.12)"
              style={{ transition: "fill 0.35s ease" }}
            />
            {/* Bubbles */}
            {used.map((_, idx) => (
              <circle
                key={idx}
                cx={86 + ((idx * 29) % 52)}
                cy={168 - idx * 14}
                r={4 + (idx % 3)}
                fill="rgba(255,255,255,0.55)"
              />
            ))}
            {/* Erlenmeyer outline */}
            <path
              d="M 88 26 L 88 62 L 38 176 Q 32 192 50 192 L 170 192 Q 188 192 182 176 L 132 62 L 132 26"
              fill="none"
              stroke="#9ec0e6"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="80" y1="26" x2="140" y2="26" stroke="#9ec0e6" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>当前 pH</small>
                <strong style={{ color: indicator(currentPh) }}>pH {currentPh}（{phNature(currentPh)}）</strong>
              </div>
              <div className="readout-box">
                <small>目标 pH</small>
                <strong style={{ color: indicator(cup.target) }}>🎯 pH {cup.target}</strong>
              </div>
              <div className="readout-box">
                <small>剩余滴数</small>
                <strong>{Math.max(0, cup.limit - used.length)} / {cup.limit} 滴</strong>
              </div>
            </div>

            <div className="droppers" style={{ marginTop: 14 }}>
              {drops.map((drop) => (
                <button
                  key={drop.id}
                  type="button"
                  className="dropper-btn"
                  disabled={done || spent}
                  onClick={() => add(drop.id)}
                >
                  <span>{DROP_META[drop.id].icon} {drop.name}</span>
                  <span style={{ color: drop.delta < 0 ? "#d94848" : "#2f74d0" }}>
                    {drop.delta > 0 ? `+${drop.delta}` : drop.delta}
                  </span>
                </button>
              ))}
            </div>

            <div className="play-actions">
              <button
                type="button"
                className="pill-btn"
                disabled={used.length === 0 || done}
                onClick={() => setUsed((prev) => prev.slice(0, -1))}
              >
                ↩ 撤回一滴
              </button>
              <button type="button" className="pill-btn" onClick={() => load(cup.id)}>
                🔄 倒掉重配
              </button>
              <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
                💡 滴定算一算
              </button>
            </div>
          </div>

          {!done && spent && (
            <NianSays text={`哎呀，${cup.limit} 滴都滴完啦，现在是 pH ${currentPh}，离目标 pH ${cup.target} 还差一点点！撤回一滴或重配试试！`} />
          )}

          {showHint && (
            <HintBox
              text={`从起点 pH ${cup.start} 到目标 pH ${cup.target}，一共要改变 ${cup.target - cup.start > 0 ? `+${cup.target - cup.start}` : cup.target - cup.start}，而且最多只能用 ${cup.limit} 滴！优先挑步子大的强酸(-2)或强碱(+2)组合吧。`}
            />
          )}
        </div>
      </div>

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={`滴定成功！用了 ${used.length} 滴精准配出 pH ${cup.target}！`}
          dadLine="紫甘蓝汁、石蕊和广谱试纸里都有会变色的分子：遇到酸里的氢离子变红橙，遇到碱里的氢氧根变蓝紫，中性水正好是温和的绿！"
          onRetry={() => load(cup.id)}
          onNext={next ? () => load(next.id) : exit}
          nextLabel={next ? `下一杯：${next.title} →` : "回化学馆 →"}
        />
      )}
    </div>
  );
}

export const ph = { meta, Play: PhGame };
