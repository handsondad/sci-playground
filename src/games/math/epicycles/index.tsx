import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  checkEpicycleGoal,
  epicycleChainAt,
  epicycleLevels,
  epicycleMatchScore,
  sampleEpicycleCurve
} from "./logic.ts";

const ACCENT = "#4d96ff";

function EpicyclesGame({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  const starMap = useGameStars("epicycles");
  const [levelId, setLevelId] = useState(epicycleLevels[0].id);
  const level = epicycleLevels.find((l) => l.id === levelId) ?? epicycleLevels[0];

  const [radii, setRadii] = useState<number[]>(() => level.rotors.map((r) => r.startRadius));
  const [theta, setTheta] = useState(0);
  const [tries, setTries] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [wonStars, setWonStars] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTheta((prev) => (prev + 0.045) % (Math.PI * 2));
    }, 32);
    return () => window.clearInterval(id);
  }, []);

  const freqs = useMemo(() => level.rotors.map((r) => r.freq), [level]);
  const targetRadii = useMemo(() => level.rotors.map((r) => r.targetRadius), [level]);

  const targetCurve = useMemo(() => sampleEpicycleCurve(freqs, targetRadii, 160), [freqs, targetRadii]);
  const playerCurve = useMemo(() => sampleEpicycleCurve(freqs, radii, 160), [freqs, radii]);
  const score = useMemo(() => epicycleMatchScore(freqs, radii, targetRadii), [freqs, radii, targetRadii]);
  const matched = checkEpicycleGoal(level, radii);

  const chain = epicycleChainAt(freqs, radii, theta);

  function loadStage(id: number) {
    const next = epicycleLevels.find((l) => l.id === id) ?? epicycleLevels[0];
    setLevelId(next.id);
    setRadii(next.rotors.map((r) => r.startRadius));
    setTries(0);
    setUsedHint(false);
    setWonStars(null);
  }

  function verifyDrawing() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkEpicycleGoal(level, radii)) {
      let stars = nextTries <= 1 ? 3 : nextTries <= 3 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      recordStars("epicycles", level.id, stars);
      setWonStars(stars);
      if (sound) {
        chime(true);
        say(nian(level.cheer), dad(level.explain));
      }
    } else if (sound) {
      chime(false);
      say(dad(level.dadTip));
    }
  }

  const cx = 280;
  const cy = 164;
  const toPath = (pts: [number, number][]) =>
    pts
      .map(([x, y], idx) => `${idx === 0 ? "M" : "L"}${(cx + x).toFixed(1)},${(cy + y).toFixed(1)}`)
      .join(" ");

  const tip = chain[chain.length - 1] ?? [0, 0];
  const nextLevel = epicycleLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🌀"
        title="傅里叶圆周画板 · 旋转圆圈画万物"
        onBack={exit}
        backLabel="数学思维馆"
        stars={sumStars(starMap)}
        maxStars={epicycleLevels.length * 3}
        settings={settings}
      />

      <StageStrip
        stages={epicycleLevels}
        activeId={level.id}
        stars={starMap}
        color={ACCENT}
        onSelect={loadStage}
      />

      <DadSays text={level.story} />

      <section className="card workbench">
        <div className="workbench-canvas">
          <svg
            viewBox="0 0 560 320"
            role="img"
            aria-label={`傅里叶圆周画板：图形吻合度 ${score}%`}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, background: "#0b1326" }}
          >
            {/* Polar grid */}
            <line x1={80} y1={cy} x2={480} y2={cy} stroke="rgba(148,163,184,0.15)" />
            <line x1={cx} y1={38} x2={cx} y2={290} stroke="rgba(148,163,184,0.15)" />

            <text x={28} y={28} fill="#cbd5e1" fontSize={13} fontWeight={700}>
              绿虚线=目标轮廓 · 亮黄线=机械圆臂合成轨迹
            </text>

            {/* Target green dashed contour */}
            <path
              d={toPath(targetCurve)}
              fill="none"
              stroke="#4ade80"
              strokeWidth={3.5}
              strokeDasharray="7 5"
              opacity={0.78}
            />

            {/* Player epicycle contour */}
            <path
              d={toPath(playerCurve)}
              fill="none"
              stroke={matched ? "#22c55e" : "#fde047"}
              strokeWidth={2.8}
            />

            {/* Rotating epicycles and arms */}
            {level.rotors.map((rotor, idx) => {
              const [ox, oy] = chain[idx];
              const [nx, ny] = chain[idx + 1];
              const r = radii[idx] ?? 0;
              return (
                <g key={rotor.label}>
                  {r > 1 && (
                    <circle
                      cx={cx + ox}
                      cy={cy + oy}
                      r={r}
                      fill="none"
                      stroke={rotor.color}
                      strokeOpacity={0.42}
                      strokeWidth={1.6}
                    />
                  )}
                  <line
                    x1={cx + ox}
                    y1={cy + oy}
                    x2={cx + nx}
                    y2={cy + ny}
                    stroke={rotor.color}
                    strokeWidth={2.6}
                    strokeLinecap="round"
                  />
                  <circle cx={cx + ox} cy={cy + oy} r={3.5} fill={rotor.color} />
                </g>
              );
            })}

            {/* Glowing pen tip */}
            <circle cx={cx + tip[0]} cy={cy + tip[1]} r={6} fill="#fde047" stroke="#ffffff" strokeWidth={2} />

            <text
              x={280}
              y={306}
              textAnchor="middle"
              fill={matched ? "#4ade80" : "#93c5fd"}
              fontSize={13}
              fontWeight={800}
            >
              轮廓吻合度 {score}%（达标线 {level.goalScore}%）
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          {level.rotors.map((rotor, idx) =>
            rotor.locked ? (
              <div
                key={rotor.label}
                style={{
                  padding: "8px 12px",
                  borderRadius: 12,
                  background: "rgba(77,150,255,0.12)",
                  fontSize: 13,
                  fontWeight: 700
                }}
              >
                🔒 {rotor.label}：半径固定 {rotor.startRadius}
              </div>
            ) : (
              <Slider
                key={rotor.label}
                label={`${rotor.label}半径`}
                value={radii[idx] ?? 0}
                min={0}
                max={88}
                step={2}
                color={rotor.color}
                onChange={(v) => {
                  setRadii((prev) => prev.map((val, i) => (i === idx ? v : val)));
                  setWonStars(null);
                }}
              />
            )
          )}

          <Meter label="轮廓重合度" pct={score} goal={level.goalScore} valueText={`${score}%`} />

          <div className="play-actions">
            <button type="button" className="primary-btn" onClick={verifyDrawing}>
              ✨ 定格比对图案
            </button>
            <button
              type="button"
              className="pill-btn"
              onClick={() => {
                setUsedHint(true);
                if (sound) say(dad(level.dadTip));
              }}
            >
              💡 听爸爸提示
            </button>
          </div>

          {usedHint && <HintBox text={level.dadTip} />}
        </div>
      </section>

      {wonStars !== null && (
        <WinCard
          stars={wonStars}
          cheer={level.cheer}
          explain={level.explain}
          nextLabel={nextLevel ? `下一关 · ${nextLevel.title} →` : undefined}
          onNext={nextLevel ? () => loadStage(nextLevel.id) : undefined}
          onAgain={() => loadStage(level.id)}
        />
      )}
    </div>
  );
}

export const epicycles: GameModule = {
  meta: {
    id: "epicycles",
    title: "傅里叶圆周画板",
    emoji: "🌀",
    category: "math",
    tag: "傅里叶级数 · 本轮合成",
    blurb: "调节多级正反转速圆臂的半径，亲眼见证纯圆周运动如何合成椭圆、五瓣星花甚至直角正方形！",
    maxStars: epicycleLevels.length * 3
  },
  Play: EpicyclesGame
};
