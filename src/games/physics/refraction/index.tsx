import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, degrees } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  MEDIA,
  checkRefractionGoal,
  getMedium,
  refractionLevels,
  traceSnellRay,
  type MediumId,
  type RefractionState
} from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#f59e0b";
const ORIGIN_X = 240;
const INTERFACE_Y = 160;
const DEPTH_PX = 110;

function RefractionGame({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  const starMap = useGameStars("refraction");
  const [levelId, setLevelId] = useState(refractionLevels[0].id);
  const level = refractionLevels.find((l) => l.id === levelId) ?? refractionLevels[0];

  const [state, setState] = useState<RefractionState>({ ...level.start });
  const [tries, setTries] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [wonStars, setWonStars] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function loadStage(id: number) {
    const next = refractionLevels.find((l) => l.id === id) ?? refractionLevels[0];
    setLevelId(next.id);
    setState({ ...next.start });
    setTries(0);
    setUsedHint(false);
    setWonStars(null);
  }

  function patch(partial: Partial<RefractionState>) {
    setState((prev) => ({ ...prev, ...partial }));
    setWonStars(null);
  }

  function verifyBeam() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkRefractionGoal(level, state)) {
      let stars = nextTries <= 1 ? 3 : nextTries <= 3 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      recordStars("refraction", level.id, stars);
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

  const ray = traceSnellRay(state);
  const topMed = getMedium(state.topMedium);
  const botMed = getMedium(state.bottomMedium);
  const passedNow = checkRefractionGoal(level, state);

  const rad1 = (state.angleDeg * Math.PI) / 180;
  const laserStartX = ORIGIN_X - DEPTH_PX * Math.tan(rad1);
  const laserStartY = INTERFACE_Y - DEPTH_PX;

  const reflectEndX = ORIGIN_X + DEPTH_PX * Math.tan(rad1);
  const reflectEndY = INTERFACE_Y - DEPTH_PX;
  const refractEndX = ORIGIN_X + ray.hitOffsetPx;
  const refractEndY = INTERFACE_Y + DEPTH_PX;

  const targetX = ORIGIN_X + level.targetOffsetPx;
  const targetY = level.expectTIR ? INTERFACE_Y - DEPTH_PX : INTERFACE_Y + DEPTH_PX;

  const errPx =
    ray.totalInternalReflection !== level.expectTIR
      ? 100
      : Math.abs(ray.hitOffsetPx - level.targetOffsetPx);
  const closeness = Math.max(0, Math.min(100, Math.round(100 - errPx * 1.4)));
  const minDeg = level.lockAngleRange?.[0] ?? 15;
  const maxDeg = level.lockAngleRange?.[1] ?? 72;
  const nextLevel = refractionLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="💎"
        title="激光折射与光纤 · 斯涅尔定律"
        onBack={exit}
        backLabel="声光电磁馆"
        stars={sumStars(starMap)}
        maxStars={refractionLevels.length * 3}
        settings={settings}
      />

      <StageStrip
        stages={refractionLevels}
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
            aria-label={`激光折射实验：入射角 ${state.angleDeg} 度`}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, overflow: "hidden" }}
          >
            {/* Upper & lower media layers */}
            <rect x={0} y={0} width={560} height={INTERFACE_Y} fill={topMed.tint} />
            <rect x={0} y={INTERFACE_Y} width={560} height={320 - INTERFACE_Y} fill={botMed.tint} />
            <line x1={0} y1={INTERFACE_Y} x2={560} y2={INTERFACE_Y} stroke="#7dd3fc" strokeWidth={2.5} />

            {/* Normal dashed vertical line */}
            <line
              x1={ORIGIN_X}
              y1={36}
              x2={ORIGIN_X}
              y2={284}
              stroke="rgba(226, 232, 240, 0.45)"
              strokeWidth={1.8}
              strokeDasharray="5 5"
            />

            {/* Straight unbent reference dashed line */}
            <line
              x1={ORIGIN_X}
              y1={INTERFACE_Y}
              x2={ORIGIN_X + DEPTH_PX * Math.tan(rad1)}
              y2={INTERFACE_Y + DEPTH_PX}
              stroke="rgba(255, 255, 255, 0.16)"
              strokeWidth={1.5}
              strokeDasharray="3 4"
            />

            {/* Incident laser beam */}
            <line
              x1={laserStartX}
              y1={laserStartY}
              x2={ORIGIN_X}
              y2={INTERFACE_Y}
              stroke="#fb7185"
              strokeWidth={4}
              strokeLinecap="round"
            />
            <circle cx={laserStartX} cy={laserStartY} r={7} fill="#f43f5e" stroke="#ffffff" strokeWidth={2} />

            {/* Reflected beam (faint partial reflection or bright 100% TIR) */}
            <line
              x1={ORIGIN_X}
              y1={INTERFACE_Y}
              x2={reflectEndX}
              y2={reflectEndY}
              stroke={ray.totalInternalReflection ? "#34d399" : "#fb7185"}
              strokeOpacity={ray.totalInternalReflection ? 0.95 : 0.25}
              strokeWidth={ray.totalInternalReflection ? 4 : 2}
              strokeLinecap="round"
            />

            {/* Refracted beam when not TIR */}
            {!ray.totalInternalReflection && (
              <line
                x1={ORIGIN_X}
                y1={INTERFACE_Y}
                x2={refractEndX}
                y2={refractEndY}
                stroke="#fde047"
                strokeWidth={4}
                strokeLinecap="round"
              />
            )}

            {/* Target gem / sensor */}
            <circle
              cx={targetX}
              cy={targetY}
              r={12}
              fill={passedNow ? "#2ed573" : "#facc15"}
              fillOpacity={0.28}
              stroke={passedNow ? "#2ed573" : "#facc15"}
              strokeWidth={2.5}
            />
            <circle cx={targetX} cy={targetY} r={5} fill={passedNow ? "#2ed573" : "#fde047"} />

            {/* Clean non-overlapping labels */}
            <text x={20} y={28} fill="#e2e8f0" fontSize={13} fontWeight={700}>
              上层：{topMed.name} · 入射角 θ₁={state.angleDeg}°
            </text>
            <text x={20} y={184} fill="#bae6fd" fontSize={13} fontWeight={700}>
              下层：{botMed.name}
            </text>
            <text x={20} y={304} fill="#fef08a" fontSize={13} fontWeight={700}>
              {ray.totalInternalReflection
                ? `✨ 全内反射！(临界角 ${ray.criticalDeg?.toFixed(1)}°) · 落点 +${Math.round(ray.hitOffsetPx)} px`
                : `折射角 θ₂=${ray.refractedDeg?.toFixed(1)}° · 池底落点 +${Math.round(ray.hitOffsetPx)} px（靶标 +${level.targetOffsetPx} px）`}
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <Slider
            label="激光入射角"
            value={state.angleDeg}
            min={minDeg}
            max={maxDeg}
            step={1}
            format={degrees}
            color="#fb7185"
            onChange={(v) => patch({ angleDeg: v })}
          />

          {!level.lockMedia && !level.lockTopMedium && (
            <div>
              <div className="note" style={{ fontWeight: 700, marginBottom: 6 }}>上层介质（发射区）</div>
              <div className="play-actions" style={{ margin: "4px 0 10px" }}>
                {MEDIA.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`pill-btn${state.topMedium === m.id ? " is-active" : ""}`}
                    onClick={() => patch({ topMedium: m.id as MediumId })}
                  >
                    {m.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!level.lockMedia && (
            <div>
              <div className="note" style={{ fontWeight: 700, marginBottom: 6 }}>下层介质（目标区）</div>
              <div className="play-actions" style={{ margin: "4px 0 10px" }}>
                {MEDIA.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`pill-btn${state.bottomMedium === m.id ? " is-active" : ""}`}
                    onClick={() => patch({ bottomMedium: m.id as MediumId })}
                  >
                    {m.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Meter
            label="瞄准精度"
            pct={closeness}
            valueText={ray.totalInternalReflection ? "全反射" : `${ray.refractedDeg?.toFixed(1)}°`}
          />

          <div className="play-actions">
            <button type="button" className="primary-btn" onClick={verifyBeam}>
              💎 点亮激光验证
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

export const refraction: GameModule = { meta, Play: RefractionGame };
