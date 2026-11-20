import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  checkSkateGoal,
  simulateSkate,
  skateLevels,
  type SkateState
} from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#ea580c";

function SkateGame({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  const starMap = useGameStars("skate");
  const [levelId, setLevelId] = useState(skateLevels[0].id);
  const level = skateLevels.find((l) => l.id === levelId) ?? skateLevels[0];

  const [state, setState] = useState<SkateState>(() => ({ ...level.start }));
  const [phase, setPhase] = useState(0);
  const [tries, setTries] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [wonStars, setWonStars] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  const sim = useMemo(() => simulateSkate(level, state), [level, state]);

  useEffect(() => {
    setPhase(0);
    const id = window.setInterval(() => {
      setPhase((p) => (p >= 1 ? 0 : +(p + 0.016).toFixed(3)));
    }, 30);
    return () => window.clearInterval(id);
  }, [level.id, state]);

  function loadStage(id: number) {
    const next = skateLevels.find((l) => l.id === id) ?? skateLevels[0];
    setLevelId(next.id);
    setState({ ...next.start });
    setTries(0);
    setUsedHint(false);
    setWonStars(null);
  }

  function verifyRun() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkSkateGoal(level, state)) {
      let stars = nextTries <= 1 ? 3 : nextTries <= 3 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      recordStars("skate", level.id, stars);
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

  // Coordinate helper: ground at y=258, 1m = 24px
  const groundY = 258;
  const scaleY = 24;
  const hToY = (h: number) => groundY - h * scaleY;

  const startY = hToY(state.startHeightM);
  const obsY = hToY(level.obstacleHeightM);
  const deckY = hToY(level.deckHeightM);
  const loopR = (level.obstacleHeightM * scaleY) / 2;

  // Build track SVG path and animated skater point
  const hasLoop = level.kind === "loop" || level.kind === "combo";
  const hasHump = level.kind === "hump";
  const hasRough = level.flatRoughLengthM > 0;

  let trackPath = "";
  if (hasHump) {
    trackPath = `M 56 66 L 56 ${groundY} M 56 ${startY.toFixed(1)} Q 132 ${groundY} 188 ${groundY} C 228 ${groundY} 244 ${obsY.toFixed(1)} 280 ${obsY.toFixed(1)} C 316 ${obsY.toFixed(1)} 332 ${groundY} 372 ${groundY} Q 408 ${groundY} 436 ${deckY.toFixed(1)} L 520 ${deckY.toFixed(1)}`;
  } else if (hasLoop) {
    trackPath = `M 56 ${startY.toFixed(1)} Q 130 ${groundY} 190 ${groundY} L 410 ${groundY} Q 434 ${groundY} 454 ${deckY.toFixed(1)} L 524 ${deckY.toFixed(1)}`;
  } else {
    trackPath = `M 56 ${startY.toFixed(1)} Q 136 ${groundY} 186 ${groundY} L 386 ${groundY} Q 418 ${groundY} 446 ${deckY.toFixed(1)} L 524 ${deckY.toFixed(1)}`;
  }

  // Skater animated position along journey
  const maxProgress =
    sim.outcome === "stalled" && !sim.clearedObstacle
      ? 0.44
      : sim.outcome === "detached"
        ? 0.52
        : sim.outcome === "stalled"
          ? 0.72
          : 0.96;
  const t = Math.min(phase * 1.15, maxProgress);

  let skaterX = 56;
  let skaterY = startY;
  if (t < 0.28) {
    const u = t / 0.28;
    skaterX = 56 + u * 134;
    skaterY = startY + (groundY - startY) * Math.sin((u * Math.PI) / 2);
  } else if (t < 0.62) {
    const u = (t - 0.28) / 0.34;
    if (hasLoop) {
      const cx = 250;
      const cy = groundY - loopR;
      const ang = Math.PI / 2 - u * Math.PI * 2;
      skaterX = cx + loopR * Math.cos(ang);
      skaterY = cy + loopR * Math.sin(ang);
      if (sim.detachedInLoop && u > 0.48) {
        skaterY += (u - 0.48) * 140;
      }
    } else if (hasHump) {
      skaterX = 190 + u * 180;
      const bump = Math.sin(u * Math.PI);
      skaterY = groundY - bump * level.obstacleHeightM * scaleY;
    } else {
      skaterX = 190 + u * 196;
      skaterY = groundY;
    }
  } else {
    const u = Math.min(1, (t - 0.62) / 0.34);
    skaterX = 390 + u * 116;
    skaterY = groundY - u * (groundY - deckY);
  }

  const maxBarE = Math.max(4000, sim.totalEnergyJ);
  const epW = Math.round((sim.potentialJ / maxBarE) * 120);
  const ekW = Math.round((sim.kineticJ / maxBarE) * 120);
  const thW = Math.round((sim.thermalJ / maxBarE) * 120);

  const statusText =
    sim.outcome === "perfect"
      ? "✅ 安全稳停终点台！"
      : sim.outcome === "detached"
        ? "⚠️ 环顶速度不足脱轨！"
        : sim.outcome === "overshoot"
          ? "💥 冲太猛飞出栏杆！"
          : "🛑 能量不足半途滑回";

  const nextLevel = skateLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🛹"
        title="滑板能量公园 · 势能动能与回环"
        onBack={exit}
        backLabel="机械动力馆"
        stars={sumStars(starMap)}
        maxStars={skateLevels.length * 3}
        settings={settings}
      />

      <StageStrip
        stages={skateLevels}
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
            aria-label={`滑板能量公园：${statusText}`}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, background: "#0f172a" }}
          >
            {/* Height grid lines */}
            {[2, 4, 6, 8].map((hm) => {
              const y = hToY(hm);
              return (
                <g key={hm}>
                  <line x1={38} y1={y} x2={534} y2={y} stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
                  <text x={32} y={y + 4} textAnchor="end" fill="#64748b" fontSize={11}>
                    {hm}m
                  </text>
                </g>
              );
            })}

            {/* Top header & energy bar legend */}
            <text x={46} y={28} fill="#f8fafc" fontSize={13} fontWeight={700}>
              起滑 h₀={state.startHeightM.toFixed(1)}m · 终点速 {sim.endSpeedMS.toFixed(1)}m/s (上限 {level.maxSafeEndSpeedMS.toFixed(1)})
            </text>
            <g transform="translate(382, 14)">
              <rect x={0} y={0} width={156} height={42} rx={8} fill="rgba(15,23,42,0.85)" stroke="#334155" />
              <rect x={36} y={7} width={Math.max(2, epW)} height={6} rx={3} fill="#38bdf8" />
              <rect x={36} y={18} width={Math.max(2, ekW)} height={6} rx={3} fill="#4ade80" />
              <rect x={36} y={29} width={Math.max(2, thW)} height={6} rx={3} fill="#f97316" />
              <text x={8} y={13} fill="#7dd3fc" fontSize={9} fontWeight={700}>势能</text>
              <text x={8} y={24} fill="#86efac" fontSize={9} fontWeight={700}>动能</text>
              <text x={8} y={35} fill="#fdba74" fontSize={9} fontWeight={700}>热能</text>
            </g>

            {/* Ground baseline */}
            <line x1={36} y1={groundY} x2={536} y2={groundY} stroke="#475569" strokeWidth={3} />

            {/* Vertical loop if applicable */}
            {hasLoop && (
              <circle
                cx={250}
                cy={groundY - loopR}
                r={loopR}
                fill="none"
                stroke={sim.detachedInLoop ? "#ef4444" : "#38bdf8"}
                strokeWidth={5}
              />
            )}

            {/* Track curve */}
            <path d={trackPath} fill="none" stroke="#94a3b8" strokeWidth={5} strokeLinecap="round" />

            {/* Rough brake pad */}
            {hasRough && (
              <g>
                <rect
                  x={hasLoop ? 302 : 206}
                  y={groundY - 5}
                  width={hasLoop ? 98 : 168}
                  height={9}
                  rx={4}
                  fill="#ea580c"
                />
                <text
                  x={hasLoop ? 351 : 290}
                  y={groundY + 20}
                  textAnchor="middle"
                  fill="#fdba74"
                  fontSize={11}
                  fontWeight={700}
                >
                  粗糙垫 μ={state.frictionMu.toFixed(2)}
                </text>
              </g>
            )}

            {/* Target deck flag & guardrail */}
            <line
              x1={522}
              y1={deckY}
              x2={522}
              y2={deckY - 26}
              stroke={sim.outcome === "overshoot" ? "#ef4444" : "#22c55e"}
              strokeWidth={4}
            />
            <circle cx={522} cy={deckY - 28} r={5} fill={sim.outcome === "perfect" ? "#22c55e" : "#facc15"} />

            {/* Starting height reference line */}
            <line
              x1={56}
              y1={startY}
              x2={340}
              y2={startY}
              stroke="rgba(250,204,21,0.45)"
              strokeDasharray="5 5"
            />

            {/* Animated skateboarder */}
            <g transform={`translate(${skaterX.toFixed(1)}, ${(skaterY - 9).toFixed(1)})`}>
              <rect x={-11} y={3} width={22} height={5} rx={2.5} fill="#fbbf24" />
              <circle cx={-6} cy={9} r={2.5} fill="#f8fafc" />
              <circle cx={6} cy={9} r={2.5} fill="#f8fafc" />
              <circle cx={0} cy={-6} r={6} fill="#38bdf8" stroke="#ffffff" strokeWidth={1.5} />
            </g>

            {/* Bottom status banner */}
            <text
              x={280}
              y={304}
              textAnchor="middle"
              fill={sim.outcome === "perfect" ? "#4ade80" : "#fde047"}
              fontSize={13}
              fontWeight={800}
            >
              {statusText}（总能量 E₀ = {Math.round(sim.totalEnergyJ)} J）
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          {!level.lockHeight && (
            <Slider
              label="起滑台高度 h₀"
              value={state.startHeightM}
              min={2.0}
              max={7.6}
              step={0.2}
              format={fixed(1, "m")}
              color="#38bdf8"
              onChange={(v) => {
                setState((s) => ({ ...s, startHeightM: v }));
                setWonStars(null);
              }}
            />
          )}

          {!level.lockFriction && (
            <Slider
              label="减速垫摩擦系数 μ"
              value={state.frictionMu}
              min={0}
              max={0.45}
              step={0.01}
              format={fixed(2)}
              color="#f97316"
              onChange={(v) => {
                setState((s) => ({ ...s, frictionMu: v }));
                setWonStars(null);
              }}
            />
          )}

          <Meter
            label="终点稳定度"
            pct={sim.outcome === "perfect" ? 100 : sim.clearedObstacle ? 65 : 30}
            valueText={`${sim.endSpeedMS.toFixed(1)} m/s`}
          />

          <div className="play-actions">
            <button type="button" className="primary-btn" onClick={verifyRun}>
              🛹 松手起滑验证
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

export const skate: GameModule = { meta, Play: SkateGame };
