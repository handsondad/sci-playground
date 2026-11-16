import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  checkSlitsGoal,
  fringeSpacingMm,
  intensityAtMm,
  slitsLevels,
  wavelengthToRgb,
  type SlitsState
} from "./logic.ts";

const ACCENT = "#f59e0b";
const CY = 164;
const MM_TO_PX = 14; // screen vertical scale: 1 mm = 14 px

function SlitsGame({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  const starMap = useGameStars("slits");
  const [levelId, setLevelId] = useState(slitsLevels[0].id);
  const level = slitsLevels.find((l) => l.id === levelId) ?? slitsLevels[0];

  const [state, setState] = useState<SlitsState>({ ...level.start });
  const [phaseTick, setPhaseTick] = useState(0);
  const [tries, setTries] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [wonStars, setWonStars] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhaseTick((p) => (p + 1) % 60);
    }, 45);
    return () => window.clearInterval(timer);
  }, []);

  function loadStage(id: number) {
    const next = slitsLevels.find((l) => l.id === id) ?? slitsLevels[0];
    setLevelId(next.id);
    setState({ ...next.start });
    setTries(0);
    setUsedHint(false);
    setWonStars(null);
  }

  function patch(partial: Partial<SlitsState>) {
    setState((prev) => ({ ...prev, ...partial }));
    setWonStars(null);
  }

  function verifyInterference() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkSlitsGoal(level, state)) {
      let stars = nextTries <= 1 ? 3 : nextTries <= 3 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      recordStars("slits", level.id, stars);
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

  const dyMm = fringeSpacingMm(state);
  const color = wavelengthToRgb(state.wavelengthNm);
  const activePosMm = level.mode === "bright1" ? dyMm : 0.5 * dyMm;
  const errMm = Math.abs(activePosMm - level.sensorMm);
  const closeness = Math.max(0, Math.min(100, Math.round(100 - errMm * 32)));
  const passedNow = checkSlitsGoal(level, state);

  // Visual geometry
  const barrierX = 128;
  const screenX = 240 + state.screenM * 78; // 333 ~ 458
  const slitHalfGapPx = 12 + state.slitMm * 42;
  const slit1Y = CY - slitHalfGapPx;
  const slit2Y = CY + slitHalfGapPx;
  const waveStepPx = 14 + ((state.wavelengthNm - 400) / 300) * 14;
  const rippleOffset = (phaseTick / 60) * waveStepPx;
  const sensorY = CY - level.sensorMm * MM_TO_PX;

  // Screen intensity bands
  const bands: { y: number; alpha: number }[] = [];
  for (let py = 46; py <= 282; py += 4) {
    const yMm = (CY - py) / MM_TO_PX;
    bands.push({ y: py, alpha: intensityAtMm(state, yMm) });
  }

  const nextLevel = slitsLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🌊"
        title="双缝水波与光纹 · 杨氏干涉实验"
        onBack={exit}
        backLabel="声光电磁馆"
        stars={sumStars(starMap)}
        maxStars={slitsLevels.length * 3}
        settings={settings}
      />

      <StageStrip
        stages={slitsLevels}
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
            aria-label={`双缝干涉：波长 ${state.wavelengthNm}nm，条纹间距 ${dyMm.toFixed(2)}mm`}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, background: "#0b1120" }}
          >
            <defs>
              <clipPath id="slits-tank-clip">
                <rect x={barrierX + 4} y={38} width={Math.max(20, screenX - barrierX - 8)} height={252} />
              </clipPath>
            </defs>

            {/* Incoming plane waves on left */}
            {[0, 1, 2, 3].map((k) => {
              const wx = ((k * waveStepPx + rippleOffset) % (barrierX - 28)) + 24;
              return (
                <line
                  key={k}
                  x1={wx}
                  y1={64}
                  x2={wx}
                  y2={264}
                  stroke={color.hex}
                  strokeOpacity={0.55}
                  strokeWidth={2.2}
                />
              );
            })}

            {/* Double-slit barrier */}
            <line x1={barrierX} y1={38} x2={barrierX} y2={slit1Y - 7} stroke="#94a3b8" strokeWidth={6} strokeLinecap="round" />
            <line x1={barrierX} y1={slit1Y + 7} x2={barrierX} y2={slit2Y - 7} stroke="#94a3b8" strokeWidth={6} strokeLinecap="round" />
            <line x1={barrierX} y1={slit2Y + 7} x2={barrierX} y2={290} stroke="#94a3b8" strokeWidth={6} strokeLinecap="round" />

            {/* Two overlapping circular wave trains */}
            <g clipPath="url(#slits-tank-clip)">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((idx) => {
                const rad = idx * waveStepPx + rippleOffset;
                return (
                  <g key={idx}>
                    <circle
                      cx={barrierX}
                      cy={slit1Y}
                      r={rad}
                      fill="none"
                      stroke={color.hex}
                      strokeOpacity={0.34}
                      strokeWidth={1.8}
                    />
                    <circle
                      cx={barrierX}
                      cy={slit2Y}
                      r={rad}
                      fill="none"
                      stroke={color.hex}
                      strokeOpacity={0.34}
                      strokeWidth={1.8}
                    />
                  </g>
                );
              })}
            </g>

            {/* Screen fringe bar */}
            <rect x={screenX} y={44} width={22} height={240} rx={4} fill="#1e293b" stroke="#475569" />
            {bands.map((b, i) => (
              <rect
                key={i}
                x={screenX + 2}
                y={b.y}
                width={18}
                height={4.2}
                fill={color.hex}
                fillOpacity={0.06 + b.alpha * 0.92}
              />
            ))}

            {/* Intensity profile curve to right of screen */}
            <path
              d={bands
                .map((b, i) => `${i === 0 ? "M" : "L"}${(screenX + 28 + b.alpha * 44).toFixed(1)},${b.y}`)
                .join(" ")}
              fill="none"
              stroke={color.hex}
              strokeWidth={2.2}
            />

            {/* Target sensor marker */}
            <line
              x1={screenX - 14}
              y1={sensorY}
              x2={screenX + 28}
              y2={sensorY}
              stroke={passedNow ? "#2ed573" : "#facc15"}
              strokeWidth={2.5}
              strokeDasharray="4 3"
            />
            <circle
              cx={screenX - 16}
              cy={sensorY}
              r={6}
              fill={passedNow ? "#2ed573" : "#facc15"}
            />

            {/* Non-overlapping top & bottom readouts */}
            <text x={24} y={26} fill="#e2e8f0" fontSize={13} fontWeight={700}>
              {color.name} {state.wavelengthNm}nm · 缝距 d={state.slitMm.toFixed(2)}mm · 屏距 L={state.screenM.toFixed(1)}m
            </text>
            <text x={24} y={308} fill="#cbd5e1" fontSize={13} fontWeight={700}>
              当前{level.mode === "bright1" ? "第1级亮纹" : "第1级暗纹"}：{activePosMm.toFixed(2)} mm（靶标 {level.sensorMm.toFixed(1)} mm）
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          {!level.lockWavelength && (
            <Slider
              label="光波波长 λ"
              value={state.wavelengthNm}
              min={400}
              max={700}
              step={10}
              format={fixed(0, " nm")}
              color={color.hex}
              onChange={(v) => patch({ wavelengthNm: v })}
            />
          )}
          {!level.lockSlit && (
            <Slider
              label="双缝间距 d"
              value={state.slitMm}
              min={0.2}
              max={0.8}
              step={0.02}
              format={fixed(2, " mm")}
              color="#38bdf8"
              onChange={(v) => patch({ slitMm: v })}
            />
          )}
          {!level.lockScreen && (
            <Slider
              label="屏幕距离 L"
              value={state.screenM}
              min={1.2}
              max={2.8}
              step={0.1}
              format={fixed(1, " m")}
              color="#a78bfa"
              onChange={(v) => patch({ screenM: v })}
            />
          )}

          <Meter
            label="对准靶心"
            pct={closeness}
            valueText={`Δy=${dyMm.toFixed(2)}mm`}
          />

          <div className="play-actions">
            <button type="button" className="primary-btn" onClick={verifyInterference}>
              🔬 锁定干涉纹
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

export const slits: GameModule = {
  meta: {
    id: "slits",
    title: "双缝水波与光纹",
    emoji: "🌊",
    category: "physics",
    tag: "光的波动 · 双缝干涉",
    blurb: "调节光波波长与双缝间距，亲眼看波峰叠加成亮纹、波峰撞波谷变成黑夜！",
    maxStars: slitsLevels.length * 3
  },
  Play: SlitsGame
};
