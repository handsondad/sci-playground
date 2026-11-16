import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  checkMotionGoal,
  displacementAt,
  motionLevels,
  motionMatchScore,
  velocityAt,
  type MotionPlan
} from "./logic.ts";

const ACCENT = "#ea580c";

function MotionGame({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  const starMap = useGameStars("motion");
  const [levelId, setLevelId] = useState(motionLevels[0].id);
  const level = motionLevels.find((l) => l.id === levelId) ?? motionLevels[0];

  const [plan, setPlan] = useState<MotionPlan>(() => ({ ...level.start }));
  const [tPlay, setTPlay] = useState(0);
  const [tries, setTries] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [wonStars, setWonStars] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  useEffect(() => {
    setTPlay(0);
    const id = window.setInterval(() => {
      setTPlay((prev) => (prev >= 6 ? 0 : +(prev + 0.08).toFixed(2)));
    }, 45);
    return () => window.clearInterval(id);
  }, [level.id, plan]);

  const score = useMemo(() => motionMatchScore(plan, level.target), [plan, level.target]);
  const matched = checkMotionGoal(level, plan);

  function loadStage(id: number) {
    const next = motionLevels.find((l) => l.id === id) ?? motionLevels[0];
    setLevelId(next.id);
    setPlan({ ...next.start });
    setTries(0);
    setUsedHint(false);
    setWonStars(null);
  }

  function verifyPlan() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkMotionGoal(level, plan)) {
      let stars = nextTries <= 1 ? 3 : nextTries <= 3 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      recordStars("motion", level.id, stars);
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

  // Graph coordinate transform: t in [0..6] -> x in [68..518], v in [-2..12] -> y in [204..44]
  const tToX = (t: number) => 68 + (t / 6) * 450;
  const vToY = (v: number) => {
    const clamped = Math.max(-2, Math.min(12, v));
    return 204 - ((clamped + 2) / 14) * 160;
  };
  const zeroY = vToY(0);

  const buildPolyline = (p: MotionPlan) =>
    [0, 3, 6].map((t) => `${tToX(t).toFixed(1)},${vToY(velocityAt(p, t)).toFixed(1)}`).join(" ");

  const areaPath = `M ${tToX(0)} ${zeroY.toFixed(1)} L ${tToX(0)} ${vToY(velocityAt(plan, 0)).toFixed(1)} L ${tToX(3)} ${vToY(velocityAt(plan, 3)).toFixed(1)} L ${tToX(6)} ${vToY(velocityAt(plan, 6)).toFixed(1)} L ${tToX(6)} ${zeroY.toFixed(1)} Z`;

  const totalDist = displacementAt(plan, 6);
  const targetDist = displacementAt(level.target, 6);
  const curX = Math.max(0, Math.min(48, displacementAt(plan, tPlay)));
  const ghostX = Math.max(0, Math.min(48, displacementAt(level.target, tPlay)));
  const carToSvgX = (xm: number) => 68 + (xm / 48) * 450;

  const nextLevel = motionLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🏎️"
        title="运动图像赛车 · v-t 曲线匹配"
        onBack={exit}
        backLabel="机械动力馆"
        stars={sumStars(starMap)}
        maxStars={motionLevels.length * 3}
        settings={settings}
      />

      <StageStrip
        stages={motionLevels}
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
            aria-label={`运动图像赛车：当前曲线吻合度 ${score}%`}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, background: "#0f172a" }}
          >
            {/* Header */}
            <text x={68} y={26} fill="#f8fafc" fontSize={13} fontWeight={700}>
              绿虚线=目标 v-t 曲线 · 橙实线=你的赛车（面积路程 {totalDist.toFixed(1)}m / 目标 {targetDist.toFixed(1)}m）
            </text>

            {/* v-t chart grid */}
            <rect x={68} y={40} width={450} height={168} rx={8} fill="#131f37" stroke="#334155" />
            {[0, 3, 6, 9, 12].map((v) => {
              const y = vToY(v);
              return (
                <g key={v}>
                  <line x1={68} y1={y} x2={518} y2={y} stroke="rgba(148,163,184,0.16)" strokeDasharray="4 4" />
                  <text x={60} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize={10}>
                    {v}m/s
                  </text>
                </g>
              );
            })}
            {[0, 3, 6].map((t) => {
              const x = tToX(t);
              return (
                <g key={t}>
                  <line x1={x} y1={40} x2={x} y2={208} stroke="rgba(148,163,184,0.22)" strokeDasharray="3 3" />
                  <text x={x} y={224} textAnchor="middle" fill="#cbd5e1" fontSize={11} fontWeight={700}>
                    {t}s
                  </text>
                </g>
              );
            })}

            {/* Area under player's v-t curve */}
            <path d={areaPath} fill="rgba(249, 115, 22, 0.18)" />

            {/* Target green dashed curve */}
            <polyline
              points={buildPolyline(level.target)}
              fill="none"
              stroke="#4ade80"
              strokeWidth={4}
              strokeDasharray="8 5"
              strokeLinecap="round"
            />

            {/* Player orange curve */}
            <polyline
              points={buildPolyline(plan)}
              fill="none"
              stroke={matched ? "#22c55e" : "#fb923c"}
              strokeWidth={3.5}
              strokeLinecap="round"
            />

            {/* Time scrubber dot */}
            <circle
              cx={tToX(tPlay)}
              cy={vToY(velocityAt(plan, tPlay))}
              r={5.5}
              fill="#fde047"
              stroke="#0f172a"
              strokeWidth={1.5}
            />

            {/* Bottom physical race track */}
            <rect x={54} y={244} width={478} height={42} rx={10} fill="#1e293b" stroke="#475569" />
            <line x1={68} y1={265} x2={518} y2={265} stroke="#64748b" strokeDasharray="8 6" />

            {/* Ghost target car */}
            <g transform={`translate(${carToSvgX(ghostX).toFixed(1)}, 255)`} opacity={0.55}>
              <rect x={-12} y={-6} width={24} height={10} rx={4} fill="#4ade80" />
            </g>

            {/* Player rocket car */}
            <g transform={`translate(${carToSvgX(curX).toFixed(1)}, 273)`}>
              <rect x={-14} y={-7} width={28} height={12} rx={4} fill="#fb923c" stroke="#ffffff" strokeWidth={1.2} />
              <circle cx={-8} cy={6} r={3} fill="#0f172a" />
              <circle cx={8} cy={6} r={3} fill="#0f172a" />
            </g>

            <text
              x={280}
              y={306}
              textAnchor="middle"
              fill={matched ? "#4ade80" : "#fde047"}
              fontSize={13}
              fontWeight={800}
            >
              曲线吻合度 {score}%（达标线 {level.goalScore}%）· t={tPlay.toFixed(1)}s 实时车速 {velocityAt(plan, tPlay).toFixed(1)} m/s
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          {!level.lockV0 && (
            <Slider
              label="起步初速度 v₀"
              value={plan.v0}
              min={0}
              max={8}
              step={0.5}
              format={fixed(1, "m/s")}
              color="#38bdf8"
              onChange={(v) => {
                setPlan((p) => {
                  const next = { ...p, v0: v };
                  return level.lockA2 ? { ...next, a2: next.a1 } : next;
                });
                setWonStars(null);
              }}
            />
          )}

          <Slider
            label={level.lockA2 ? "全程加速度 a" : "前 3 秒加速度 a₁"}
            value={plan.a1}
            min={-3}
            max={3}
            step={0.5}
            format={fixed(1, "m/s²")}
            color="#fb923c"
            onChange={(v) => {
              setPlan((p) => ({ ...p, a1: v, a2: level.lockA2 ? v : p.a2 }));
              setWonStars(null);
            }}
          />

          {!level.lockA2 && (
            <Slider
              label="后 3 秒加速度 a₂"
              value={plan.a2}
              min={-3}
              max={3}
              step={0.5}
              format={fixed(1, "m/s²")}
              color="#a855f7"
              onChange={(v) => {
                setPlan((p) => ({ ...p, a2: v }));
                setWonStars(null);
              }}
            />
          )}

          <Meter label="v-t 曲线重合度" pct={score} goal={level.goalScore} valueText={`${score}%`} />

          <div className="play-actions">
            <button type="button" className="primary-btn" onClick={verifyPlan}>
              🏁 发车比对曲线
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

export const motion: GameModule = {
  meta: {
    id: "motion",
    title: "运动图像赛车",
    emoji: "🏎️",
    category: "mechanics",
    tag: "v-t 图像 · 斜率与面积",
    blurb: "亲手编排初速度与分段加速度，让火箭车踩准目标 v-t 曲线，一眼看懂『斜率是加速度、面积是路程』！",
    maxStars: motionLevels.length * 3
  },
  Play: MotionGame
};
