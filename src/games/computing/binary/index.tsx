import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  binaryLevels,
  bitsToNumber,
  bitWeights,
  numberToBits,
  pixelGridSolved,
  type BinaryLevel,
  type Bit
} from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#14b8a6";
const FINGER_NAMES = ["小指", "无名指", "中指", "食指", "拇指"] as const;

function initPixelRows(level: BinaryLevel): Bit[][] {
  if (!level.pixelTargetRows || !level.pixelLockedRows) return [];
  return level.pixelTargetRows.map((val, idx) =>
    level.pixelLockedRows?.[idx] ? numberToBits(val, 5) : [0, 0, 0, 0, 0]
  );
}

function renderDots(count: number, lit: boolean) {
  const cols = count >= 16 ? 4 : count >= 4 ? 2 : 1;
  const shown = Math.min(count, 32);
  return (
    <div
      aria-hidden="true"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 6px)`,
        gap: count >= 16 ? 2.5 : 4,
        justifyContent: "center",
        alignContent: "center",
        minHeight: 54
      }}
    >
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          style={{
            width: count >= 32 ? 4.5 : 6,
            height: count >= 32 ? 4.5 : 6,
            borderRadius: "50%",
            background: lit ? "#fef08a" : "rgba(148, 163, 184, 0.25)",
            boxShadow: lit ? "0 0 5px rgba(250, 204, 21, 0.8)" : "none"
          }}
        />
      ))}
    </div>
  );
}

function BinaryGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(binaryLevels[0].id);
  const starMap = useGameStars("binary");
  const level = binaryLevels.find((l) => l.id === levelId) ?? binaryLevels[0];

  const [bits, setBits] = useState<Bit[]>([...level.startBits]);
  const [pixelRows, setPixelRows] = useState<Bit[][]>(() => initPixelRows(level));
  const [activeRow, setActiveRow] = useState(2);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = binaryLevels.find((l) => l.id === id) ?? binaryLevels[0];
    setLevelId(next.id);
    setBits([...next.startBits]);
    setPixelRows(initPixelRows(next));
    setActiveRow(2);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  const isPixelMode = level.mode === "pixels" && level.pixelTargetRows !== undefined;
  const activeBits = isPixelMode ? (pixelRows[activeRow] ?? [0, 0, 0, 0, 0]) : bits;
  const weights = bitWeights(level.width);
  const currentVal = bitsToNumber(activeBits);
  const binaryStr = activeBits.join("");

  function toggleBit(index: number) {
    if (wonStars > 0) return;
    if (isPixelMode) {
      if (level.pixelLockedRows?.[activeRow]) return;
      setPixelRows((prev) =>
        prev.map((row, rIdx) =>
          rIdx === activeRow ? row.map((b, cIdx) => (cIdx === index ? ((b ? 0 : 1) as Bit) : b)) : row
        )
      );
    } else {
      setBits((prev) => prev.map((b, idx) => (idx === index ? ((b ? 0 : 1) as Bit) : b)));
    }
  }

  function togglePixelCell(rIdx: number, cIdx: number) {
    if (wonStars > 0) return;
    if (level.pixelLockedRows?.[rIdx]) return;
    setActiveRow(rIdx);
    setPixelRows((prev) =>
      prev.map((row, r) =>
        r === rIdx ? row.map((b, c) => (c === cIdx ? ((b ? 0 : 1) as Bit) : b)) : row
      )
    );
  }

  function clearCurrent() {
    if (wonStars > 0) return;
    if (isPixelMode) {
      setPixelRows(initPixelRows(level));
    } else {
      setBits(new Array<Bit>(level.width).fill(0));
    }
  }

  const matchedNow = isPixelMode
    ? pixelGridSolved(pixelRows, level.pixelTargetRows ?? [])
    : currentVal === level.target;

  function checkAnswer() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (matchedNow) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("binary", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const next = binaryLevels.find((l) => l.id > level.id);
  const litTerms = weights.filter((_, i) => activeBits[i] === 1);
  const sumFormula = litTerms.length > 0 ? `${litTerms.join(" + ")} = ${currentVal}` : "全灭 = 0";

  return (
    <div className="page">
      <TopBar
        emoji="💡"
        title="二进制灯牌 · 0与1位权编码"
        onBack={exit}
        backLabel="计算逻辑馆"
        stars={sumStars(starMap)}
        maxStars={binaryLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={binaryLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#091322", borderColor: "#1e3a5f", color: "#e2e8f0" }}>
          {level.mode === "hand" && (
            <svg
              viewBox="0 0 360 128"
              style={{ width: "100%", display: "block", marginBottom: 10, borderRadius: 12, background: "#07101d" }}
              role="img"
              aria-label={`二进制单手计数，当前伸出手指代表十进制 ${currentVal}`}
            >
              <text x="14" y="22" fontSize="11" fill="#94a3b8" fontWeight="700">
                🖐️ 点手指或下方灯卡：伸直 = 1，弯曲 = 0（五指全伸 = 31）
              </text>
              <rect x="96" y="88" width="168" height="34" rx="16" fill="#334155" stroke="#475569" strokeWidth="2" />
              {weights.map((w, i) => {
                const up = activeBits[i] === 1;
                const fx = 112 + i * 34;
                return (
                  <g key={w} style={{ cursor: "pointer" }} onClick={() => toggleBit(i)}>
                    <rect
                      x={fx - 11}
                      y={up ? 34 : 66}
                      width="22"
                      height={up ? 60 : 28}
                      rx="11"
                      fill={up ? "#14b8a6" : "#475569"}
                      stroke={up ? "#99f6e4" : "#64748b"}
                      strokeWidth="2"
                    />
                    <text x={fx} y={up ? 50 : 84} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">
                      {w}
                    </text>
                    <text x={fx} y="114" textAnchor="middle" fontSize="8.5" fill="#cbd5e1">
                      {FINGER_NAMES[i]}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {isPixelMode && level.pixelTargetRows && (
            <div
              style={{
                padding: "12px 14px",
                marginBottom: 12,
                borderRadius: 14,
                background: "#060d18",
                border: "2px solid #1e293b"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                <span>📺 5×5 二进制显影屏（点格子或选行翻卡）</span>
                <span>位权：16 · 8 · 4 · 2 · 1</span>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {pixelRows.map((row, rIdx) => {
                  const rowNum = bitsToNumber(row);
                  const goalNum = level.pixelTargetRows![rIdx];
                  const locked = Boolean(level.pixelLockedRows?.[rIdx]);
                  const rowOk = rowNum === goalNum;
                  const selected = activeRow === rIdx;
                  return (
                    <div
                      key={rIdx}
                      onClick={() => !locked && setActiveRow(rIdx)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto repeat(5, 34px) 1fr",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 8px",
                        borderRadius: 10,
                        cursor: locked ? "default" : "pointer",
                        background: selected ? "rgba(20, 184, 166, 0.16)" : "rgba(255,255,255,0.02)",
                        border: selected ? "1.5px solid #14b8a6" : "1.5px solid transparent"
                      }}
                    >
                      <span style={{ fontSize: 11, width: 46, color: locked ? "#64748b" : "#cbd5e1", fontWeight: 700 }}>
                        {locked ? `🔒行${rIdx + 1}` : `👉行${rIdx + 1}`}
                      </span>
                      {row.map((cell, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          disabled={locked}
                          aria-label={`第${rIdx + 1}行第${cIdx + 1}列像素，当前${cell === 1 ? "亮" : "灭"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePixelCell(rIdx, cIdx);
                          }}
                          style={{
                            width: 34,
                            height: 30,
                            borderRadius: 7,
                            border: cell === 1 ? "2px solid #fde047" : "1.5px solid #334155",
                            background: cell === 1 ? "#facc15" : "#0f172a",
                            boxShadow: cell === 1 ? "0 0 10px rgba(250, 204, 21, 0.55)" : "none",
                            color: cell === 1 ? "#1e293b" : "#64748b",
                            fontWeight: 800,
                            fontSize: 12,
                            padding: 0
                          }}
                        >
                          {cell}
                        </button>
                      ))}
                      <span
                        style={{
                          textAlign: "right",
                          fontSize: 12,
                          fontWeight: 700,
                          color: rowOk ? "#4ade80" : "#fbbf24"
                        }}
                      >
                        {rowNum} / 🎯{goalNum} {rowOk ? "✓" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${level.width}, minmax(0, 1fr))`,
              gap: 8
            }}
          >
            {weights.map((weight, idx) => {
              const lit = activeBits[idx] === 1;
              return (
                <button
                  key={weight}
                  type="button"
                  aria-pressed={lit}
                  aria-label={`位权 ${weight} 灯卡，当前 ${lit ? "1 点亮" : "0 熄灭"}`}
                  onClick={() => toggleBit(idx)}
                  style={{
                    display: "grid",
                    justifyItems: "center",
                    gap: 6,
                    padding: "10px 6px",
                    borderRadius: 16,
                    border: lit ? "2.5px solid #2dd4bf" : "2px solid #334155",
                    background: lit
                      ? "linear-gradient(180deg, #134e4a 0%, #0f2937 100%)"
                      : "linear-gradient(180deg, #111c2d 0%, #0b1320 100%)",
                    boxShadow: lit ? "0 0 16px rgba(45, 212, 191, 0.35)" : "none",
                    color: "#f8fafc",
                    transition: "transform 0.15s, border-color 0.15s"
                  }}
                >
                  <span style={{ fontSize: 20 }} aria-hidden="true">
                    {lit ? "💡" : "⚫"}
                  </span>
                  {renderDots(weight, lit)}
                  <strong style={{ fontSize: 16, color: lit ? "#5eead4" : "#94a3b8" }}>{weight}</strong>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 800,
                      background: lit ? "#14b8a6" : "#1e293b",
                      color: lit ? "#042f2e" : "#94a3b8"
                    }}
                  >
                    {lit ? "1" : "0"}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 10,
              background: "rgba(15, 23, 42, 0.85)",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 8,
              fontSize: 13
            }}
          >
            <span>
              {isPixelMode ? `当前编辑第 ${activeRow + 1} 行` : "二进制码"}：
              <strong style={{ color: "#5eead4", letterSpacing: 2, marginLeft: 4 }}>{binaryStr}₂</strong>
            </span>
            <span style={{ color: "#fde68a", fontWeight: 700 }}>位权求和：{sumFormula}</span>
          </div>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>{isPixelMode ? `第 ${activeRow + 1} 行十进制` : "当前灯牌数值"}</small>
                <strong style={{ color: matchedNow ? "#16a34a" : "#0d9488" }}>
                  {isPixelMode
                    ? `${currentVal}（${binaryStr}₂）`
                    : `${currentVal}（${binaryStr}₂）`}
                </strong>
              </div>
              <div className="readout-box">
                <small>🎯 目标任务</small>
                <strong>
                  {isPixelMode
                    ? `拼出像素笑脸（${pixelRows.filter((r, i) => bitsToNumber(r) === level.pixelTargetRows![i]).length}/5 行）`
                    : `十进制 ${level.target}`}
                </strong>
              </div>
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={checkAnswer}>
                💡 点亮电报核验！
              </button>
              <button type="button" className="pill-btn" onClick={clearCurrent}>
                🧹 全灭归零
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 拆数提示
              </button>
            </div>
          </div>

          {tries > 0 && wonStars === 0 && (
            <DadSays
              text={
                isPixelMode
                  ? "还有几行的十进制数字没对上目标哦！点选没打勾 ✓ 的那一行，把对应的位权灯卡加起来凑够目标数试试！"
                  : `现在亮着的灯卡加起来是 ${currentVal}，离目标 ${level.target} 还${currentVal > level.target ? `多了 ${currentVal - level.target}` : `差了 ${level.target - currentVal}`}，翻动对应位权的灯卡调一调！`
              }
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={
                isPixelMode
                  ? "5×5 二进制像素笑脸显影成功！"
                  : `成功编码 ${level.target} = ${numberToBits(level.target, level.width).join("")}₂！`
              }
              dadLine={level.win}
              note={
                isPixelMode
                  ? "笑脸编码：[01010, 00000, 00100, 10001, 01110] = [10, 0, 4, 17, 14]"
                  : `位权验证：${sumFormula}`
              }
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

export const binary: GameModule = { meta, Play: BinaryGame };
