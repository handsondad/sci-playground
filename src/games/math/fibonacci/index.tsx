import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  GOLDEN_ANGLE,
  checkFibonacciGoal,
  fibSequence,
  fibonacciLevels,
  packingScore,
  seedPositions
} from "./logic.ts";

const ACCENT = "#4d96ff";
const CX = 180;
const CY = 154;
const SEED_COUNT = 140;
const CANDIDATE_NUMS = [11, 13, 16, 21, 26, 34] as const;

function detectSpokes(angleDeg: number): number | null {
  const candidates: readonly [number, number][] = [
    [90, 4],
    [120, 3],
    [72, 5],
    [144, 5],
    [60, 6],
    [135, 8]
  ];
  for (const [target, spokes] of candidates) {
    if (Math.abs(angleDeg - target) <= 0.6) return spokes;
  }
  return null;
}

function FibonacciGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(fibonacciLevels[0].id);
  const starMap = useGameStars("fibonacci");
  const level = fibonacciLevels.find((l) => l.id === levelId) ?? fibonacciLevels[0];

  const [angle, setAngle] = useState(level.startAngle);
  const [show8, setShow8] = useState(true);
  const [show13, setShow13] = useState(true);
  const [slotIdx, setSlotIdx] = useState<0 | 1>(0);
  const [filled, setFilled] = useState<[number | null, number | null]>([null, null]);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = fibonacciLevels.find((l) => l.id === id) ?? fibonacciLevels[0];
    setLevelId(next.id);
    setAngle(next.startAngle);
    setFilled([null, null]);
    setSlotIdx(0);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  const seeds = useMemo(() => seedPositions(SEED_COUNT, angle, 8.9), [angle]);
  const score = useMemo(() => packingScore(angle), [angle]);
  const spokes = detectSpokes(angle);
  const isGoldenNear = score >= 92;

  const spiral8Paths = useMemo(() => {
    if (!isGoldenNear || !show8) return [];
    const paths: string[] = [];
    for (let arm = 0; arm < 8; arm++) {
      const chain: string[] = [];
      for (let i = arm; i < seeds.length; i += 8) {
        const s = seeds[i];
        chain.push(`${chain.length === 0 ? "M" : "L"}${(CX + s.x).toFixed(1)},${(CY + s.y).toFixed(1)}`);
      }
      if (chain.length > 2) paths.push(chain.join(" "));
    }
    return paths;
  }, [seeds, isGoldenNear, show8]);

  const spiral13Paths = useMemo(() => {
    if (!isGoldenNear || !show13) return [];
    const paths: string[] = [];
    for (let arm = 0; arm < 13; arm++) {
      const chain: string[] = [];
      for (let i = arm; i < seeds.length; i += 13) {
        const s = seeds[i];
        chain.push(`${chain.length === 0 ? "M" : "L"}${(CX + s.x).toFixed(1)},${(CY + s.y).toFixed(1)}`);
      }
      if (chain.length > 2) paths.push(chain.join(" "));
    }
    return paths;
  }, [seeds, isGoldenNear, show13]);

  function pickNumber(num: number) {
    setFilled((prev) => {
      const next: [number | null, number | null] = [prev[0], prev[1]];
      next[slotIdx] = num;
      return next;
    });
    if (slotIdx === 0) setSlotIdx(1);
  }

  function verifyHead() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkFibonacciGoal(level, angle, filled)) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("fibonacci", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const baseFib = fibSequence(6);
  const next = fibonacciLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🌻"
        title="向日葵螺旋 · 黄金角与斐波那契"
        onBack={exit}
        backLabel="数学思维馆"
        stars={sumStars(starMap)}
        maxStars={fibonacciLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={fibonacciLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#14100c", borderColor: "#6b4f2a" }}>
          <svg
            viewBox="0 0 360 308"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`向日葵花盘 ${SEED_COUNT} 颗种子，发散角 ${angle.toFixed(1)} 度，饱满度 ${score}%`}
          >
            <rect x="0" y="0" width="360" height="308" rx="12" fill="#17120d" />

            {/* 21 Golden Petals */}
            {Array.from({ length: 21 }, (_, idx) => {
              const deg = (idx * 360) / 21;
              return (
                <ellipse
                  key={idx}
                  cx={CX}
                  cy={CY - 116}
                  rx="11"
                  ry="22"
                  fill={idx % 2 === 0 ? "#fbbf24" : "#f59e0b"}
                  opacity="0.88"
                  transform={`rotate(${deg.toFixed(1)} ${CX} ${CY})`}
                />
              );
            })}

            {/* Receptacle Disc */}
            <circle cx={CX} cy={CY} r="112" fill="#2c1d11" stroke="#92400e" strokeWidth="3" />

            {/* Rational Spoke Guides when aligned in spokes */}
            {spokes !== null &&
              Array.from({ length: spokes }, (_, sIdx) => {
                const rad = (((sIdx + 1) * angle) * Math.PI) / 180;
                return (
                  <line
                    key={sIdx}
                    x1={CX}
                    y1={CY}
                    x2={CX + Math.cos(rad) * 108}
                    y2={CY + Math.sin(rad) * 108}
                    stroke="rgba(248, 113, 113, 0.45)"
                    strokeWidth="1.6"
                    strokeDasharray="4 4"
                  />
                );
              })}

            {/* Fibonacci 8 & 13 Parastichy Spirals */}
            {spiral8Paths.map((d, i) => (
              <path key={`s8-${i}`} d={d} fill="none" stroke="rgba(56, 189, 248, 0.65)" strokeWidth="1.8" />
            ))}
            {spiral13Paths.map((d, i) => (
              <path key={`s13-${i}`} d={d} fill="none" stroke="rgba(74, 222, 128, 0.65)" strokeWidth="1.6" />
            ))}

            {/* 140 Sunflower Seeds */}
            {seeds.map((s) => {
              const seedR = 2.5 + (s.index / SEED_COUNT) * 2.1;
              const palette = ["#fef08a", "#fde047", "#facc15", "#f59e0b"];
              const fill = isGoldenNear
                ? s.index % 8 === 0
                  ? "#7dd3fc"
                  : s.index % 13 === 0
                    ? "#86efac"
                    : "#fde047"
                : palette[s.index % palette.length];
              return (
                <circle
                  key={s.index}
                  cx={CX + s.x}
                  cy={CY + s.y}
                  r={seedR}
                  fill={fill}
                  stroke="#451a03"
                  strokeWidth="0.7"
                />
              );
            })}

            <text x="14" y="22" fontSize="11.5" fill="#fef3c7" fontWeight="700">
              🌻 发散角 θ = {angle.toFixed(1)}°（约 {(angle / 360).toFixed(3)} 圈）
            </text>
            <text x="14" y="296" fontSize="10.5" fill={isGoldenNear ? "#86efac" : "#fca5a5"}>
              {isGoldenNear
                ? "✨ 黄金密铺已激活：顺时针 8 条蓝旋臂 · 逆时针 13 条绿旋臂"
                : spokes
                  ? `⚠️ 周期重合：种子挤在 ${spokes} 条辐射线上，大片扇区荒废！`
                  : "🔍 继续微调角度，寻找不留缝隙的黄金分割角"}
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>当前发散角</small>
                <strong style={{ color: "#2563eb" }}>{angle.toFixed(1)}°</strong>
              </div>
              <div className="readout-box">
                <small>🎯 本关目标角</small>
                <strong style={{ color: "#d97706" }}>{level.targetAngle.toFixed(1)}°</strong>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <Meter pct={score} goal={level.minPacking} label="花盘密铺饱满度" />
            </div>

            <div className="sliders" style={{ marginTop: 14 }}>
              <Slider
                label="📐 发散角"
                value={angle}
                min={level.minAngle}
                max={level.maxAngle}
                step={level.stepAngle}
                color={ACCENT}
                format={fixed(1, "°")}
                onChange={setAngle}
              />
            </div>

            {level.id <= 2 && (
              <div className="play-actions" style={{ marginTop: 10 }}>
                {[72, 90, 120, 144].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`pill-btn${Math.abs(angle - preset) < 0.2 ? " is-active" : ""}`}
                    onClick={() => setAngle(preset)}
                  >
                    试 {preset}°
                  </button>
                ))}
              </div>
            )}

            {level.id >= 3 && (
              <div className="play-actions" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className={`pill-btn${show8 ? " is-active" : ""}`}
                  onClick={() => setShow8((v) => !v)}
                >
                  🔵 顺时针 8 旋线
                </button>
                <button
                  type="button"
                  className={`pill-btn${show13 ? " is-active" : ""}`}
                  onClick={() => setShow13((v) => !v)}
                >
                  🟢 逆时针 13 旋线
                </button>
              </div>
            )}

            {level.requireSequence && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: "#f5f9ff",
                  border: "2px solid #cfe0f7"
                }}
              >
                <small style={{ fontWeight: 700, color: "#5d4e37" }}>
                  🍍 点击空格并选数补全斐波那契螺旋数序列：
                </small>
                <div className="play-actions" style={{ margin: "8px 0 6px", gap: 6 }}>
                  {baseFib.map((n, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "4px 9px",
                        borderRadius: 8,
                        background: "#fff",
                        border: "1.5px solid #dbe7f6",
                        fontWeight: 700
                      }}
                    >
                      {n}
                    </span>
                  ))}
                  {[0, 1].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`pill-btn${slotIdx === idx ? " is-active" : ""}`}
                      style={{ padding: "4px 12px", minWidth: 46 }}
                      onClick={() => setSlotIdx(idx as 0 | 1)}
                    >
                      {filled[idx] ?? "？"}
                    </button>
                  ))}
                </div>
                <div className="play-actions" style={{ margin: "6px 0 0", gap: 6 }}>
                  {CANDIDATE_NUMS.map((num) => (
                    <button
                      key={num}
                      type="button"
                      className="pill-btn"
                      style={{ padding: "4px 11px" }}
                      onClick={() => pickNumber(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn is-blue" onClick={verifyHead}>
                🌻 检验向日葵花盘！
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 植物学家提示
              </button>
            </div>
          </div>

          {tries > 0 && wonStars === 0 && (
            <NianSays
              text={
                level.requireSequence && Math.abs(angle - GOLDEN_ANGLE) <= 0.3
                  ? `黄金角 137.5° 对上啦！再检查一下两个空格：[${filled[0] ?? "？"}] 和 [${filled[1] ?? "？"}] 是不是前两项相加？`
                  : `现在角度是 ${angle.toFixed(1)}°（饱满度 ${score}%），离目标 ${level.targetAngle.toFixed(1)}° 还差一点点，再调调看！`
              }
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`发散角 ${angle.toFixed(1)}° · 饱满度 ${score}% 验证通过！`}
              dadLine={level.win}
              note={`黄金角公式：360° × (1 − 1/φ) ≈ ${GOLDEN_ANGLE}° · 斐波那契螺旋数：1, 1, 2, 3, 5, 8, 13, 21`}
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

export const fibonacci: GameModule = {
  meta: {
    id: "fibonacci",
    title: "向日葵螺旋",
    category: "math",
    emoji: "🌻",
    tag: "黄金角 · 斐波那契",
    blurb: "拨动 140 颗瓜子的生长发散角，看分数角如何挤成稀疏直线，亲手揭开 137.5° 黄金角与 8/13 斐波那契螺线的秘密。",
    maxStars: fibonacciLevels.length * 3
  },
  Play: FibonacciGame
};
