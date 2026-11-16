import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  ALPHABET,
  cipherLevels,
  letterFrequencies,
  topFrequencyLetter,
  transformWithWheel
} from "./logic.ts";

const ACCENT = "#14b8a6";
const CX = 170;
const CY = 170;
const STEP_DEG = 360 / 26;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}

function CipherGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(cipherLevels[0].id);
  const starMap = useGameStars("cipher");
  const level = cipherLevels.find((l) => l.id === levelId) ?? cipherLevels[0];

  const [keyShift, setKeyShift] = useState(level.startKey);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = cipherLevels.find((l) => l.id === id) ?? cipherLevels[0];
    setLevelId(next.id);
    setKeyShift(next.startKey);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  function stepKey(delta: number) {
    setKeyShift((prev) => (((prev + delta) % 26) + 26) % 26);
  }

  const outputText = transformWithWheel(level.sourceText, keyShift, level.mode);
  const isSolvedNow = outputText === level.targetText;
  const alignedCipherChar = ALPHABET[keyShift];

  const freqMap = letterFrequencies(level.sourceText);
  const peak = topFrequencyLetter(level.sourceText);
  const maxFreq = Math.max(1, peak.count);

  function submitCipher() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (isSolvedNow) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("cipher", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const next = cipherLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🔐"
        title="凯撒密码盘 · 移位加密与频率破译"
        onBack={exit}
        backLabel="计算逻辑馆"
        stars={sumStars(starMap)}
        maxStars={cipherLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={cipherLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#0b1324", borderColor: "#243b61", color: "#e2e8f0" }}>
          <svg
            viewBox="0 0 340 340"
            style={{ width: "100%", maxWidth: 350, margin: "0 auto", display: "block" }}
            role="img"
            aria-label={`双环凯撒密码盘，当前密钥 k=${keyShift}，外圈明文 A 对齐内圈密文 ${alignedCipherChar}`}
          >
            {/* Outer Plaintext Ring */}
            <circle cx={CX} cy={CY} r="156" fill="#111c33" stroke="#38bdf8" strokeWidth="2.5" />
            <circle cx={CX} cy={CY} r="122" fill="#172542" stroke="#334155" strokeWidth="1.8" />

            {Array.from(ALPHABET).map((ch, i) => {
              const deg = i * STEP_DEG;
              const lineIn = polar(CX, CY, 122, deg - STEP_DEG / 2);
              const lineOut = polar(CX, CY, 156, deg - STEP_DEG / 2);
              const pos = polar(CX, CY, 139, deg);
              return (
                <g key={`out-${ch}`}>
                  <line x1={lineIn.x} y1={lineIn.y} x2={lineOut.x} y2={lineOut.y} stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="800"
                    fill={i === 0 ? "#fde047" : "#e2e8f0"}
                  >
                    {ch}
                  </text>
                </g>
              );
            })}

            {/* Inner Rotatable Cipher Ring */}
            <g transform={`rotate(${-keyShift * STEP_DEG} ${CX} ${CY})`} style={{ transition: "transform 0.22s ease-out" }}>
              <circle cx={CX} cy={CY} r="120" fill="#0f2937" stroke="#2dd4bf" strokeWidth="2.2" />
              <circle cx={CX} cy={CY} r="84" fill="#091322" stroke="#14b8a6" strokeWidth="1.8" />
              {Array.from(ALPHABET).map((ch, i) => {
                const deg = i * STEP_DEG;
                const lineIn = polar(CX, CY, 84, deg - STEP_DEG / 2);
                const lineOut = polar(CX, CY, 120, deg - STEP_DEG / 2);
                const pos = polar(CX, CY, 102, deg);
                const isAlignedTop = i === keyShift;
                return (
                  <g key={`in-${ch}`}>
                    <line x1={lineIn.x} y1={lineIn.y} x2={lineOut.x} y2={lineOut.y} stroke="rgba(45,212,191,0.25)" strokeWidth="1" />
                    <text
                      x={pos.x}
                      y={pos.y + 4}
                      textAnchor="middle"
                      fontSize="11.5"
                      fontWeight="800"
                      fill={isAlignedTop ? "#fbbf24" : "#5eead4"}
                      transform={`rotate(${keyShift * STEP_DEG} ${pos.x} ${pos.y})`}
                    >
                      {ch}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* 12 o'clock Alignment Window */}
            <rect
              x={CX - 16}
              y="8"
              width="32"
              height="80"
              rx="8"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.5"
            />

            {/* Center Hub */}
            <circle cx={CX} cy={CY} r="68" fill="#0b172a" stroke="#334155" strokeWidth="2" />
            <text x={CX} y={CY - 22} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="700">
              外明文 ↔ 内密文
            </text>
            <text x={CX} y={CY + 2} textAnchor="middle" fontSize="18" fontWeight="800" fill="#fde047">
              k = {keyShift}
            </text>
            <text x={CX} y={CY + 22} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#5eead4">
              A ↔ {alignedCipherChar}
            </text>

            {/* Quick Click Nudge Buttons inside SVG */}
            <g style={{ cursor: "pointer" }} onClick={() => stepKey(-1)}>
              <circle cx={CX - 36} cy={CY + 40} r="14" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
              <text x={CX - 36} y={CY + 44} textAnchor="middle" fontSize="12" fill="#f8fafc" fontWeight="800">
                ↺
              </text>
            </g>
            <g style={{ cursor: "pointer" }} onClick={() => stepKey(1)}>
              <circle cx={CX + 36} cy={CY + 40} r="14" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
              <text x={CX + 36} y={CY + 44} textAnchor="middle" fontSize="12" fill="#f8fafc" fontWeight="800">
                ↻
              </text>
            </g>
          </svg>

          {level.showFrequency && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 10px 8px",
                borderRadius: 12,
                background: "#070e1b",
                border: "1.5px solid #1e293b"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#cbd5e1", marginBottom: 6 }}>
                <span>📊 密文字母频率图（最高峰：<strong style={{ color: "#fde047" }}>{peak.letter} 出现 {peak.count} 次</strong>）</span>
                <span style={{ color: "#5eead4" }}>英语常见之王：E</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(26, minmax(0, 1fr))",
                  gap: 2,
                  alignItems: "end",
                  height: 68
                }}
              >
                {Array.from(ALPHABET).map((ch) => {
                  const c = freqMap[ch];
                  const isTop = ch === peak.letter;
                  const hPct = c === 0 ? 4 : Math.max(12, Math.round((c / maxFreq) * 100));
                  return (
                    <div key={ch} style={{ display: "grid", justifyItems: "center", gap: 2 }}>
                      <span style={{ fontSize: 8.5, color: isTop ? "#fde047" : "#64748b", fontWeight: 700 }}>
                        {c > 0 ? c : ""}
                      </span>
                      <div
                        style={{
                          width: "100%",
                          height: `${(hPct * 40) / 100}px`,
                          borderRadius: "3px 3px 0 0",
                          background: isTop ? "#facc15" : c > 0 ? "#14b8a6" : "#1e293b"
                        }}
                      />
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: isTop ? "#fde047" : ch === "E" ? "#38bdf8" : "#94a3b8"
                        }}
                      >
                        {ch}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>当前工作模式</small>
                <strong style={{ color: "#0d9488" }}>
                  {level.mode === "encrypt" ? "📤 明文 → 密文" : "📥 密文 → 明文"}
                </strong>
              </div>
              <div className="readout-box">
                <small>12点钟刻度对齐</small>
                <strong>明文 A ↔ 密文 {alignedCipherChar}（k={keyShift}）</strong>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: 14,
                background: "#f8fafc",
                border: "2px solid #e2e8f0"
              }}
            >
              <small style={{ color: "var(--text-secondary)", fontWeight: 700 }}>
                {level.mode === "encrypt" ? "📜 原始明文口令：" : "📡 截获密文电报："}
              </small>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 1.5, marginTop: 2 }}>{level.sourceText}</div>
            </div>

            <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                borderRadius: 14,
                background: isSolvedNow ? "#ecfdf5" : "#fffdf5",
                border: `2px solid ${isSolvedNow ? "#34d399" : "#fde68a"}`
              }}
            >
              <small style={{ color: "var(--text-secondary)", fontWeight: 700 }}>
                {level.mode === "encrypt" ? "🔒 密码盘实时加密结果：" : "🔎 密码盘实时破译预览："}
              </small>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: 1.5,
                  marginTop: 2,
                  color: isSolvedNow ? "#15803d" : "#b45309"
                }}
              >
                {outputText}
              </div>
            </div>

            <div className="sliders" style={{ marginTop: 14 }}>
              <Slider
                label="🔐 密钥 k"
                value={keyShift}
                min={0}
                max={25}
                step={1}
                wrap
                color={ACCENT}
                format={(v) => `k = ${v}`}
                onChange={setKeyShift}
              />
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={submitCipher}>
                {level.mode === "encrypt" ? "📡 发送加密电报！" : "🔓 锁定破译结果！"}
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 密码提示
              </button>
            </div>
          </div>

          {tries > 0 && wonStars === 0 && (
            <DadSays
              text={`现在用密钥 k=${keyShift} 转出来是『${outputText}』，看起来还不对哦！继续转动密码盘看看字母怎么变化吧！`}
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`密钥 k = ${keyShift} 命中：${outputText}！`}
              dadLine={level.win}
              note={`字母映射：明文 A ↔ 密文 ${alignedCipherChar}（偏移 ${keyShift} 格）`}
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

export const cipher: GameModule = {
  meta: {
    id: "cipher",
    title: "凯撒密码盘",
    category: "computing",
    emoji: "🔐",
    tag: "移位加密 · 频率破译",
    blurb: "拨动双环凯撒密码盘加密军令、盲破乱码，并用字母频率柱状图一招擒获密钥。",
    maxStars: 12
  },
  Play: CipherGame
};
