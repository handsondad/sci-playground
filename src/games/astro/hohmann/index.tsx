import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, degrees } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  checkHohmannGoal,
  computeHohmannTransfer,
  hohmannLevels,
  type HohmannState
} from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#3d5a99";
const CX = 280;
const CY = 160;
const AU_PX = 58;

function HohmannGame({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  const starMap = useGameStars("hohmann");
  const [levelId, setLevelId] = useState(hohmannLevels[0].id);
  const level = hohmannLevels.find((l) => l.id === levelId) ?? hohmannLevels[0];

  const [state, setState] = useState<HohmannState>({ ...level.start });
  const [progress, setProgress] = useState(1); // 0..1 along half-orbit transfer
  const [tries, setTries] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [wonStars, setWonStars] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  useEffect(() => {
    setProgress(0);
    const timer = window.setInterval(() => {
      setProgress((p) => (p >= 1 ? 0 : Math.min(1, p + 0.015)));
    }, 36);
    return () => window.clearInterval(timer);
  }, [level.id, state.deltaVKmS, state.windowDeg]);

  function loadStage(id: number) {
    const next = hohmannLevels.find((l) => l.id === id) ?? hohmannLevels[0];
    setLevelId(next.id);
    setState({ ...next.start });
    setTries(0);
    setUsedHint(false);
    setWonStars(null);
  }

  function patch(partial: Partial<HohmannState>) {
    setState((prev) => ({ ...prev, ...partial }));
    setWonStars(null);
  }

  function verifyTransfer() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkHohmannGoal(level, state)) {
      let stars = nextTries <= 1 ? 3 : nextTries <= 3 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      recordStars("hohmann", level.id, stars);
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

  const summary = computeHohmannTransfer(level, state);
  const passedNow = checkHohmannGoal(level, state);

  // Earth starts at right (θ = 0° => x = CX + rE, y = CY). Counter-clockwise is negative SVG y!
  const rEarthPx = 1.0 * AU_PX;
  const rTargetPx = level.targetRadiusAu * AU_PX;
  const rApsisPx = Math.min(132, summary.aphelionOrPerihelionAu * AU_PX);

  // Transfer ellipse spans from x = CX + rEarthPx (right) to x = CX - rApsisPx (left)
  const ellipseCx = CX + (rEarthPx - rApsisPx) / 2;
  const rx = (rEarthPx + rApsisPx) / 2;
  const ry = Math.sqrt(Math.max(64, rEarthPx * rApsisPx));

  // Animated positions at fraction `progress` ∈ [0, 1]
  const shipAngle = progress * Math.PI;
  const shipX = ellipseCx + rx * Math.cos(shipAngle);
  const shipY = CY - ry * Math.sin(shipAngle);

  const earthSweepRad = (summary.transferYears * 2 * Math.PI) * progress;
  const earthX = CX + rEarthPx * Math.cos(earthSweepRad);
  const earthY = CY - rEarthPx * Math.sin(earthSweepRad);

  const targetNowRad = ((state.windowDeg + summary.targetSweepDeg * progress) * Math.PI) / 180;
  const targetX = CX + rTargetPx * Math.cos(targetNowRad);
  const targetY = CY - rTargetPx * Math.sin(targetNowRad);

  const targetArrivalRad = (summary.targetFinalDeg * Math.PI) / 180;
  const arrivalTargetX = CX + rTargetPx * Math.cos(targetArrivalRad);
  const arrivalTargetY = CY - rTargetPx * Math.sin(targetArrivalRad);

  const scorePct = Math.max(
    0,
    Math.min(100, Math.round(100 - summary.radialErrorAu * 110 - summary.angularErrorDeg * 0.9))
  );
  const nextLevel = hohmannLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🚀"
        title="霍曼火星变轨 · 星际发射窗口"
        onBack={exit}
        backLabel="天文宇宙馆"
        stars={sumStars(starMap)}
        maxStars={hohmannLevels.length * 3}
        settings={settings}
      />

      <StageStrip
        stages={hohmannLevels}
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
            aria-label={`霍曼转移轨道：远拱点 ${summary.aphelionOrPerihelionAu.toFixed(2)} AU，飞行 ${summary.transferDays} 天`}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, background: "#070b19" }}
          >
            {/* Reference orbits */}
            <circle cx={CX} cy={CY} r={rEarthPx} fill="none" stroke="#3b82f6" strokeOpacity={0.4} strokeWidth={1.6} />
            <circle
              cx={CX}
              cy={CY}
              r={rTargetPx}
              fill="none"
              stroke={level.targetColor}
              strokeOpacity={0.45}
              strokeWidth={1.8}
              strokeDasharray="5 4"
            />

            {/* Full transfer ellipse */}
            <ellipse
              cx={ellipseCx}
              cy={CY}
              rx={rx}
              ry={ry}
              fill="none"
              stroke={passedNow ? "#2ed573" : "#c084fc"}
              strokeWidth={2.4}
              strokeDasharray="6 4"
            />

            {/* Sun at focus */}
            <circle cx={CX} cy={CY} r={14} fill="#facc15" />
            <circle cx={CX} cy={CY} r={20} fill="#fde047" fillOpacity={0.22} />

            {/* Ghost marker where target planet sits when spacecraft arrives at θ=180° */}
            <circle
              cx={arrivalTargetX}
              cy={arrivalTargetY}
              r={9}
              fill="none"
              stroke={level.targetColor}
              strokeDasharray="2 2"
              strokeWidth={1.8}
            />

            {/* Moving Earth, Target Planet & Spacecraft */}
            <circle cx={earthX} cy={earthY} r={7} fill="#38bdf8" stroke="#ffffff" strokeWidth={1.5} />
            <circle cx={targetX} cy={targetY} r={8} fill={level.targetColor} stroke="#ffffff" strokeWidth={1.5} />
            <circle cx={shipX} cy={shipY} r={5} fill="#f472b6" stroke="#ffffff" strokeWidth={1.5} />

            {/* Departure & Rendezvous markers */}
            <circle cx={CX + rEarthPx} cy={CY} r={4} fill="#93c5fd" />
            <circle cx={CX - rApsisPx} cy={CY} r={5} fill={passedNow ? "#2ed573" : "#c084fc"} />

            <text x={20} y={28} fill="#e2e8f0" fontSize={13} fontWeight={700}>
              目标：{level.targetName} ({level.targetRadiusAu} AU) · 单程巡航 {summary.transferDays} 天
            </text>
            <text x={20} y={302} fill="#cbd5e1" fontSize={13} fontWeight={700}>
              抵达拱点：{summary.aphelionOrPerihelionAu.toFixed(2)} AU · 会合相位差：{summary.angularErrorDeg.toFixed(0)}°
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <Slider
            label="点火变轨 Δv"
            value={state.deltaVKmS}
            min={-3.4}
            max={5.2}
            step={0.05}
            format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)} km/s`}
            color="#c084fc"
            onChange={(v) => patch({ deltaVKmS: v })}
          />

          {!level.lockWindow && (
            <Slider
              label={`${level.targetName}出发角`}
              value={state.windowDeg}
              min={-90}
              max={90}
              step={1}
              format={degrees}
              color={level.targetColor}
              onChange={(v) => patch({ windowDeg: v })}
            />
          )}

          <Meter
            label="交会精度"
            pct={scorePct}
            valueText={passedNow ? "精准入轨" : `差 ${summary.angularErrorDeg.toFixed(0)}°`}
          />

          <div className="play-actions">
            <button type="button" className="primary-btn" onClick={verifyTransfer}>
              🚀 点火发射验证
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

export const hohmann: GameModule = { meta, Play: HohmannGame };
