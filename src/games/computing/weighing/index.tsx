import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  comparePans,
  minWeighingsForHeavy,
  resolveAdversaryStep,
  weighingLevels,
  type ScaleResult
} from "./logic.ts";

const ACCENT = "#14b8a6";
type Zone = "aside" | "left" | "right";
type PlaceMode = "auto" | "left" | "right";

type WeighRecord = {
  step: number;
  leftIds: number[];
  rightIds: number[];
  result: ScaleResult;
};

function allIds(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}

function initZones(count: number): Record<number, Zone> {
  const out: Record<number, Zone> = {};
  for (let i = 1; i <= count; i++) out[i] = "aside";
  return out;
}

function WeighingGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(weighingLevels[0].id);
  const starMap = useGameStars("weighing");
  const level = weighingLevels.find((l) => l.id === levelId) ?? weighingLevels[0];

  const [zones, setZones] = useState<Record<number, Zone>>(() => initZones(level.count));
  const [placeMode, setPlaceMode] = useState<PlaceMode>("auto");
  const [candidates, setCandidates] = useState<number[]>(() => allIds(level.count));
  const [history, setHistory] = useState<WeighRecord[]>([]);
  const [lastResult, setLastResult] = useState<ScaleResult | null>(null);
  const [roundSeed, setRoundSeed] = useState(1);
  const [failedRounds, setFailedRounds] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);
  const [foundCoin, setFoundCoin] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = weighingLevels.find((l) => l.id === id) ?? weighingLevels[0];
    setLevelId(next.id);
    setZones(initZones(next.count));
    setPlaceMode("auto");
    setCandidates(allIds(next.count));
    setHistory([]);
    setLastResult(null);
    setRoundSeed((s) => s + 1);
    setFailedRounds(0);
    setFeedback(null);
    setShowHint(false);
    setWonStars(0);
    setFoundCoin(null);
  }

  function resetCurrentRound(keepFailures: boolean) {
    setZones(initZones(level.count));
    setCandidates(allIds(level.count));
    setHistory([]);
    setLastResult(null);
    setRoundSeed((s) => s + 1);
    if (!keepFailures) {
      setFailedRounds(0);
      setFeedback(null);
    }
    setWonStars(0);
    setFoundCoin(null);
  }

  const ids = allIds(level.count);
  const leftIds = ids.filter((id) => zones[id] === "left");
  const rightIds = ids.filter((id) => zones[id] === "right");
  const asideIds = ids.filter((id) => zones[id] === "aside");
  const minReq = minWeighingsForHeavy(level.count);

  function toggleCoin(id: number) {
    if (wonStars > 0) return;
    setLastResult(null);
    setZones((prev) => {
      const cur = prev[id] ?? "aside";
      if (cur !== "aside") {
        return { ...prev, [id]: "aside" };
      }
      if (placeMode === "left") return { ...prev, [id]: "left" };
      if (placeMode === "right") return { ...prev, [id]: "right" };
      const lCount = Object.values(prev).filter((z) => z === "left").length;
      const rCount = Object.values(prev).filter((z) => z === "right").length;
      return { ...prev, [id]: lCount <= rCount ? "left" : "right" };
    });
  }

  function clearPans() {
    if (wonStars > 0) return;
    setZones(initZones(level.count));
    setLastResult(null);
  }

  function weighOnce() {
    if (wonStars > 0) return;
    if (leftIds.length === 0 && rightIds.length === 0) {
      setFeedback("左右托盘还是空的呢！先点下方编号物品放上天平再称重吧。");
      return;
    }
    if (history.length >= level.maxWeighings) return;

    const { result, nextCandidates, chosenHeavyId } = resolveAdversaryStep(
      candidates,
      leftIds,
      rightIds,
      roundSeed + history.length * 5
    );
    const verifiedResult = comparePans(leftIds, rightIds, chosenHeavyId);
    const nextHist: WeighRecord = {
      step: history.length + 1,
      leftIds: [...leftIds],
      rightIds: [...rightIds],
      result: verifiedResult
    };
    setHistory((prev) => [...prev, nextHist]);
    setCandidates(nextCandidates);
    setLastResult(result);

    if (leftIds.length !== rightIds.length) {
      setFeedback(
        `左右枚数不一样（${leftIds.length} 对 ${rightIds.length}），枚数多的一边天然更沉，没法缩小嫌疑范围哦！`
      );
    } else if (nextCandidates.length === 1) {
      setFeedback(`太准啦！经过这 ${nextHist.step} 次称重，嫌疑已经缩小到唯一 1 枚（#${nextCandidates[0]}），快在右侧指认它！`);
    } else {
      setFeedback(
        `第 ${nextHist.step} 次结果：${result === "left" ? "左盘更沉 ↙" : result === "right" ? "右盘更沉 ↘" : "两边平手 ⚖️（重物在桌外！）"}，剩余嫌疑还有 ${nextCandidates.length} 枚。`
      );
    }
  }

  function accuseCoin(accusedId: number) {
    if (wonStars > 0) return;
    if (candidates.length === 1 && candidates[0] === accusedId) {
      const usedAll = history.length;
      let raw = usedAll <= minReq && failedRounds === 0 ? 3 : failedRounds <= 1 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setFoundCoin(accusedId);
      setWonStars(raw);
      recordStars("weighing", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
      return;
    }

    const actualHeavy = candidates.find((c) => c !== accusedId) ?? candidates[0] ?? 1;
    const prevCount = candidates.length;
    setFailedRounds((f) => f + 1);
    if (sound) chime(false);
    setFeedback(
      prevCount > 1
        ? `猜偏啦！刚才还剩 ${prevCount} 枚嫌疑没排查干净，真正偏重的是 #${actualHeavy} 号！已重置新一轮，试试三分法把每堆控制在最小！`
        : `看错盘啦！根据刚才的天平记录，偏重的是 #${actualHeavy} 号！已重置新一轮再试一次！`
    );
    resetCurrentRound(true);
  }

  const tiltDeg = lastResult === "left" ? -10 : lastResult === "right" ? 10 : 0;
  const next = weighingLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="⚖️"
        title="天平找次品 · 三分查找与信息论"
        onBack={exit}
        backLabel="计算逻辑馆"
        stars={sumStars(starMap)}
        maxStars={weighingLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={weighingLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#0b1424", borderColor: "#243b55", color: "#e2e8f0" }}>
          <svg
            viewBox="0 0 360 206"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`精密双盘天平，左盘 ${leftIds.length} 枚，右盘 ${rightIds.length} 枚，桌外 ${asideIds.length} 枚`}
          >
            <rect x="0" y="0" width="360" height="206" rx="12" fill="#070e1a" />
            <text x="14" y="20" fontSize="10.5" fill="#94a3b8" fontWeight="700">
              ⚖️ 左盘 {leftIds.length} 枚 · 右盘 {rightIds.length} 枚 · 桌外留置 {asideIds.length} 枚
            </text>

            {/* Pillar & Base */}
            <rect x="132" y="182" width="96" height="12" rx="6" fill="#475569" />
            <polygon points="180,68 168,182 192,182" fill="#64748b" />
            <circle cx="180" cy="68" r="8" fill="#fbbf24" stroke="#fef08a" strokeWidth="2" />

            {/* Tilting Beam + Pans */}
            <g
              transform={`rotate(${tiltDeg} 180 68)`}
              style={{ transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            >
              <line x1="68" y1="68" x2="292" y2="68" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />

              {/* Left Pan */}
              <g transform={`rotate(${-tiltDeg} 68 68)`} style={{ transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                <line x1="68" y1="68" x2="44" y2="124" stroke="#94a3b8" strokeWidth="1.8" />
                <line x1="68" y1="68" x2="92" y2="124" stroke="#94a3b8" strokeWidth="1.8" />
                <path d="M 24 124 Q 68 142 112 124 Z" fill="#14b8a6" stroke="#99f6e4" strokeWidth="2" />
                <text x="68" y="116" textAnchor="middle" fontSize="10.5" fill="#fde047" fontWeight="800">
                  {leftIds.length > 0 ? leftIds.map((n) => `#${n}`).join(" ") : "左托盘"}
                </text>
              </g>

              {/* Right Pan */}
              <g transform={`rotate(${-tiltDeg} 292 68)`} style={{ transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                <line x1="292" y1="68" x2="268" y2="124" stroke="#94a3b8" strokeWidth="1.8" />
                <line x1="292" y1="68" x2="316" y2="124" stroke="#94a3b8" strokeWidth="1.8" />
                <path d="M 248 124 Q 292 142 336 124 Z" fill="#38bdf8" stroke="#bae6fd" strokeWidth="2" />
                <text x="292" y="116" textAnchor="middle" fontSize="10.5" fill="#fde047" fontWeight="800">
                  {rightIds.length > 0 ? rightIds.map((n) => `#${n}`).join(" ") : "右托盘"}
                </text>
              </g>
            </g>

            {lastResult && (
              <text x="180" y="42" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#4ade80">
                {lastResult === "left"
                  ? "↙ 左盘下沉（重物在左盘！）"
                  : lastResult === "right"
                    ? "↘ 右盘下沉（重物在右盘！）"
                    : "⚖️ 两边平手（重物在桌外！）"}
              </text>
            )}
          </svg>

          {/* Placement Mode Switcher */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 8px", alignItems: "center" }}>
            <small style={{ color: "#94a3b8", fontWeight: 700 }}>点物品放入：</small>
            {(
              [
                ["auto", "🔄 左右轮流放"],
                ["left", "⬅️ 放左盘"],
                ["right", "➡️ 放右盘"]
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setPlaceMode(m)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  border: placeMode === m ? "2px solid #2dd4bf" : "1.5px solid #334155",
                  background: placeMode === m ? "rgba(20, 184, 166, 0.22)" : "#0f172a",
                  color: "#f8fafc"
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Interactive Coins Tray */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))",
              gap: 7
            }}
          >
            {ids.map((id) => {
              const z = zones[id];
              const isSuspect = candidates.includes(id);
              const borderCol = z === "left" ? "#2dd4bf" : z === "right" ? "#38bdf8" : "#475569";
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleCoin(id)}
                  aria-label={`${id}号${level.itemName}，位置：${z === "left" ? "左盘" : z === "right" ? "右盘" : "桌外"}，${isSuspect ? "仍有嫌疑" : "已排除"}`}
                  style={{
                    padding: "7px 4px",
                    borderRadius: 12,
                    border: `2px solid ${borderCol}`,
                    background:
                      z === "left"
                        ? "rgba(20, 184, 166, 0.22)"
                        : z === "right"
                          ? "rgba(56, 189, 248, 0.22)"
                          : "#111c2d",
                    opacity: isSuspect ? 1 : 0.48,
                    color: "#f8fafc",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: 16 }}>
                    {level.itemEmoji} <strong>#{id}</strong>
                  </div>
                  <div style={{ fontSize: 10.5, color: z === "aside" ? "#94a3b8" : "#fde047", fontWeight: 700 }}>
                    {z === "left" ? "⬅️左盘" : z === "right" ? "➡️右盘" : isSuspect ? "桌外待命" : "✓已排除"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>已用称重次数</small>
                <strong style={{ color: history.length >= level.maxWeighings ? "#d97706" : "#0d9488" }}>
                  {history.length} / {level.maxWeighings} 次（下界 {minReq}）
                </strong>
              </div>
              <div className="readout-box">
                <small>剩余嫌疑数量</small>
                <strong style={{ color: candidates.length === 1 ? "#16a34a" : "#6366f1" }}>
                  {candidates.length} / {level.count} 枚
                </strong>
              </div>
            </div>

            <div className="play-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="primary-btn"
                onClick={weighOnce}
                disabled={history.length >= level.maxWeighings || wonStars > 0}
              >
                ⚖️ 称一次！（剩 {level.maxWeighings - history.length} 次）
              </button>
              <button type="button" className="pill-btn" onClick={clearPans} disabled={wonStars > 0}>
                🧹 清空托盘
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 三分法提示
              </button>
            </div>

            {/* Weighing Log */}
            {history.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "#f8fafc",
                  border: "1.5px solid #e2e8f0",
                  fontSize: 12.5
                }}
              >
                <strong style={{ display: "block", marginBottom: 4, color: "var(--text-secondary)" }}>
                  📝 称重记录：
                </strong>
                {history.map((h) => (
                  <div key={h.step} style={{ padding: "2px 0" }}>
                    第 {h.step} 次：[{h.leftIds.join(",") || "空"}] vs [{h.rightIds.join(",") || "空"}] →{" "}
                    <strong>
                      {h.result === "left" ? "左沉 ↙" : h.result === "right" ? "右沉 ↘" : "平手 ⚖️"}
                    </strong>
                  </div>
                ))}
              </div>
            )}

            {/* Accuse Section */}
            <div style={{ marginTop: 12 }}>
              <small style={{ display: "block", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
                🎯 锁定目标后，点击指认唯一偏重{level.itemName}：
              </small>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ids.map((id) => {
                  const isSuspect = candidates.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className="pill-btn"
                      disabled={wonStars > 0}
                      onClick={() => accuseCoin(id)}
                      style={{
                        padding: "5px 11px",
                        fontSize: 12.5,
                        borderColor: isSuspect && candidates.length === 1 ? "#16a34a" : undefined,
                        background: isSuspect && candidates.length === 1 ? "#dcfce7" : undefined,
                        opacity: isSuspect ? 1 : 0.55
                      }}
                    >
                      指认 #{id}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {feedback && wonStars === 0 && <DadSays text={feedback} />}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`仅用 ${history.length} 次称重揪出偏重次品 #${foundCoin}！`}
              dadLine={level.win}
              note={`信息论检验：⌈log₃(${level.count})⌉ = ${minReq} 次（3^${minReq} = ${3 ** minReq} ≥ ${level.count}）`}
              onRetry={() => load(level.id)}
              onNext={next ? () => load(next.id) : undefined}
              nextLabel={next ? `下一关：${next.title} →` : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export const weighing: GameModule = {
  meta: {
    id: "weighing",
    title: "天平找次品",
    category: "computing",
    emoji: "⚖️",
    tag: "三分查找 · 信息论",
    blurb: "利用左沉、右沉、平手三种信号把金币三分天下，在理论最少次数内揪出偏重次品。",
    maxStars: 12
  },
  Play: WeighingGame
};
