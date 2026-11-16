import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  cannonLevels,
  checkCannonGoal,
  classifyLaunch,
  outcomeLabel,
  simulateTrajectory
} from "./logic.ts";

const ACCENT = "#3d5a99";
const CX = 190;
const CY = 136;

function CannonGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(cannonLevels[0].id);
  const starMap = useGameStars("cannon");
  const level = cannonLevels.find((l) => l.id === levelId) ?? cannonLevels[0];

  const [speed, setSpeed] = useState(level.startSpeed);
  const [firedSpeed, setFiredSpeed] = useState<number | null>(null);
  const [animStep, setAnimStep] = useState(0);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  const traj = useMemo(
    () => (firedSpeed !== null ? simulateTrajectory(firedSpeed) : null),
    [firedSpeed]
  );

  useEffect(() => {
    if (!traj) return;
    setAnimStep(0);
    let raf = 0;
    let cur = 0;
    const tick = () => {
      cur = Math.min(traj.points.length - 1, cur + 3);
      setAnimStep(cur);
      if (cur < traj.points.length - 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [traj]);

  function load(id: number) {
    const next = cannonLevels.find((l) => l.id === id) ?? cannonLevels[0];
    setLevelId(next.id);
    setSpeed(next.startSpeed);
    setFiredSpeed(null);
    setAnimStep(0);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  function fireCannon() {
    const nextTries = tries + 1;
    setTries(nextTries);
    setFiredSpeed(speed);

    if (checkCannonGoal(level, speed)) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("cannon", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const shownPoints = traj ? traj.points.slice(0, animStep + 1) : [];
  const pathD = shownPoints
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${(CX + x).toFixed(1)},${(CY + y).toFixed(1)}`)
    .join(" ");
  const head = shownPoints[shownPoints.length - 1];
  const outcome = firedSpeed !== null ? classifyLaunch(firedSpeed) : null;
  const next = cannonLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🚀"
        title="牛顿大炮 · 宇宙速度与入轨"
        onBack={exit}
        backLabel="天文宇宙馆"
        stars={sumStars(starMap)}
        maxStars={cannonLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={cannonLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#090d1a", borderColor: "#2b3a67" }}>
          <svg
            viewBox="0 0 400 284"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label="牛顿高山大炮引力轨道图"
          >
            <rect x="0" y="0" width="400" height="284" rx="12" fill="#060a15" />

            {/* Background stars */}
            {[
              [34, 38], [88, 24], [342, 42], [366, 118],
              [44, 232], [338, 244], [122, 258], [292, 22]
            ].map(([sx, sy], idx) => (
              <circle key={idx} cx={sx} cy={sy} r="1.4" fill="rgba(255,255,255,0.65)" />
            ))}

            {/* Atmosphere halo */}
            <circle cx={CX} cy={CY} r="73" fill="rgba(56, 189, 248, 0.12)" />

            {/* Earth Globe */}
            <circle cx={CX} cy={CY} r="64" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="2" />
            {/* Continents */}
            <path
              d={`M ${CX - 28} ${CY - 34} Q ${CX - 5} ${CY - 42} ${CX + 12} ${CY - 22} Q ${CX + 26} ${CY - 4} ${CX + 4} ${CY + 14} Q ${CX - 22} ${CY + 6} ${CX - 28} ${CY - 34} Z`}
              fill="#22c55e"
              opacity="0.85"
            />
            <path
              d={`M ${CX + 18} ${CY + 18} Q ${CX + 38} ${CY + 14} ${CX + 34} ${CY + 38} Q ${CX + 16} ${CY + 44} ${CX + 18} ${CY + 18} Z`}
              fill="#22c55e"
              opacity="0.8"
            />

            {/* Newton's Tall Mountain & Cannon at North Pole */}
            <polygon points={`${CX},${CY - 74} ${CX - 11},${CY - 62} ${CX + 11},${CY - 62}`} fill="#cbd5e1" />
            <rect x={CX - 2} y={CY - 76} width="10" height="4" rx="2" fill="#f59e0b" />

            {/* Trajectory */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={outcome === "crash" ? "#fb923c" : outcome === "escape" ? "#a855f7" : "#4ade80"}
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            )}

            {/* Projectile Head */}
            {head && (
              <circle
                cx={CX + head[0]}
                cy={CY + head[1]}
                r="5"
                fill={traj?.crashed && animStep >= (traj.points.length - 1) ? "#ef4444" : "#fef08a"}
                stroke="#fff"
                strokeWidth="1.5"
              />
            )}

            <text x="14" y="22" fontSize="11" fill="#e2e8f0" fontWeight="800">
              {outcome ? outcomeLabel(outcome) : "🏔️ 调好初速度，点击『开炮发射』观察轨道"}
            </text>
            <text x="14" y="272" fontSize="10" fill="#94a3b8">
              参考线：7.9 km/s 正圆入轨 · 11.2 km/s 脱离地球引力
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>炮口水平速度</small>
                <strong style={{ color: "#2563eb" }}>{speed.toFixed(1)} km/s</strong>
              </div>
              <div className="readout-box">
                <small>相当于音速</small>
                <strong>约 {Math.round((speed * 1000) / 340)} 倍音速</strong>
              </div>
            </div>

            <div className="sliders" style={{ marginTop: 14 }}>
              <Slider
                label="🔥 发射速度"
                value={speed}
                min={3.0}
                max={12.0}
                step={0.1}
                color="#f59e0b"
                format={fixed(1, "km/s")}
                onChange={setSpeed}
              />
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={fireCannon}>
                🔥 点火开炮！
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 牛顿手稿提示
              </button>
            </div>
          </div>

          {firedSpeed !== null && wonStars === 0 && (
            <DadSays
              text={`刚才 ${firedSpeed.toFixed(1)} km/s 的结果是「${outcome ? outcomeLabel(outcome) : ""}」，再微调一下初速度重新开炮试试！`}
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`${firedSpeed?.toFixed(1)} km/s 达成目标轨道！`}
              dadLine={level.win}
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

export const cannon: GameModule = {
  meta: {
    id: "cannon",
    title: "牛顿大炮",
    category: "astro",
    emoji: "🚀",
    tag: "宇宙速度与入轨",
    blurb: "站在牛顿假想的高山之巅水平开炮，从落回大海一路加速到 7.9 km/s 环绕地球与 11.2 km/s 奔向深空。",
    maxStars: cannonLevels.length * 3
  },
  Play: CannonGame
};
