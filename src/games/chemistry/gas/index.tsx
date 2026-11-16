import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  checkGasGoal,
  computeGasState,
  gasLevels,
  type GasState
} from "./logic.ts";

const ACCENT = "#a66cff";

function GasGame({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  const starMap = useGameStars("gas");
  const [levelId, setLevelId] = useState(gasLevels[0].id);
  const level = gasLevels.find((l) => l.id === levelId) ?? gasLevels[0];

  const [state, setState] = useState<GasState>(() => ({ ...level.start }));
  const [tick, setTick] = useState(0);
  const [tries, setTries] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [wonStars, setWonStars] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => (t + 1) % 3600);
    }, 36);
    return () => window.clearInterval(id);
  }, []);

  const gas = useMemo(() => computeGasState(state, level.burstLimitKPa), [state, level.burstLimitKPa]);
  const passed = checkGasGoal(level, state);

  function loadStage(id: number) {
    const next = gasLevels.find((l) => l.id === id) ?? gasLevels[0];
    setLevelId(next.id);
    setState({ ...next.start });
    setTries(0);
    setUsedHint(false);
    setWonStars(null);
  }

  function verifyChamber() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkGasGoal(level, state)) {
      let stars = nextTries <= 1 ? 3 : nextTries <= 3 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      recordStars("gas", level.id, stars);
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

  // Piston chamber geometry: cylinder x=110..330 (width 220), bottom y=256, height proportional to volumeL (2..12L -> 46..196px)
  const chamberBottom = 256;
  const chamberH = 34 + (state.volumeL / 12) * 168;
  const pistonY = chamberBottom - chamberH;

  // Deterministic bouncing molecules inside chamber
  const count = Math.max(6, Math.round(state.moles * 12));
  const speedScale = Math.sqrt(state.tempK / 300) * 3.2;
  const particleColor =
    state.tempK < 275 ? "#38bdf8" : state.tempK < 380 ? "#a78bfa" : "#fb7185";

  const particles = useMemo(() => {
    const arr: { x: number; y: number }[] = [];
    const innerW = 200;
    const innerH = Math.max(24, chamberH - 18);
    for (let i = 0; i < count; i++) {
      const vx = Math.cos(i * 1.9 + 0.4) * speedScale;
      const vy = Math.sin(i * 2.3 + 0.7) * speedScale;
      const rawX = ((i * 37 + tick * vx * 2.4) % (innerW * 2) + innerW * 2) % (innerW * 2);
      const rawY = ((i * 29 + tick * vy * 2.4) % (innerH * 2) + innerH * 2) % (innerH * 2);
      const bx = rawX <= innerW ? rawX : innerW * 2 - rawX;
      const by = rawY <= innerH ? rawY : innerH * 2 - rawY;
      arr.push({ x: 120 + bx, y: pistonY + 12 + by });
    }
    return arr;
  }, [count, speedScale, chamberH, pistonY, tick]);

  // Bourdon pressure gauge needle angle (-130deg .. +130deg)
  const gaugeMax = Math.max(level.burstLimitKPa * 1.15, 500);
  const needleFrac = Math.min(1.08, gas.pressureKPa / gaugeMax);
  const needleRad = ((-130 + needleFrac * 260) * Math.PI) / 180;
  const gaugeCx = 442;
  const gaugeCy = 152;

  const nextLevel = gasLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🎈"
        title="气体分子压力舱 · 理想气体 PV=nRT"
        onBack={exit}
        backLabel="化学分子馆"
        stars={sumStars(starMap)}
        maxStars={gasLevels.length * 3}
        settings={settings}
      />

      <StageStrip
        stages={gasLevels}
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
            aria-label={`气体分子压力舱：当前压强 ${gas.pressureKPa} kPa，分子均速 ${gas.rmsSpeedMS} m/s`}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, background: "#11162b" }}
          >
            <text x={280} y={26} textAnchor="middle" fill="#f8fafc" fontSize={13} fontWeight={700}>
              n={state.moles.toFixed(1)}mol · V={state.volumeL.toFixed(1)}L · T={state.tempK}K ({gas.tempC}°C) · 均速 {gas.rmsSpeedMS}m/s
            </text>

            {/* Cylinder outer walls */}
            <rect
              x={110}
              y={48}
              width={220}
              height={210}
              rx={8}
              fill="#192240"
              stroke={gas.overBurst ? "#ef4444" : "#64748b"}
              strokeWidth={3}
            />

            {/* Movable piston & shaft */}
            <rect x={212} y={34} width={16} height={Math.max(8, pistonY - 34)} fill="#94a3b8" />
            <rect x={113} y={pistonY - 10} width={214} height={12} rx={3} fill="#cbd5e1" />

            {/* Bouncing gas molecules */}
            {particles.map((pt, idx) => (
              <circle key={idx} cx={pt.x} cy={pt.y} r={4.2} fill={particleColor} />
            ))}

            {/* Bottom thermal plate (ice blue vs flame orange) */}
            <rect
              x={130}
              y={262}
              width={180}
              height={12}
              rx={5}
              fill={state.tempK < 280 ? "#38bdf8" : state.tempK > 360 ? "#f97316" : "#475569"}
            />

            {/* Pipe to Bourdon Pressure Gauge */}
            <line x1={330} y1={210} x2={442} y2={210} stroke="#64748b" strokeWidth={6} />
            <line x1={442} y1={210} x2={442} y2={198} stroke="#64748b" strokeWidth={6} />

            {/* Pressure Gauge Dial */}
            <circle
              cx={gaugeCx}
              cy={gaugeCy}
              r={54}
              fill="#0f172a"
              stroke={gas.overBurst ? "#ef4444" : passed ? "#22c55e" : "#a66cff"}
              strokeWidth={4}
            />
            <line
              x1={gaugeCx}
              y1={gaugeCy}
              x2={gaugeCx + Math.sin(needleRad) * 40}
              y2={gaugeCy - Math.cos(needleRad) * 40}
              stroke="#facc15"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx={gaugeCx} cy={gaugeCy} r={5} fill="#f8fafc" />
            <text x={gaugeCx} y={gaugeCy + 28} textAnchor="middle" fill="#e2e8f0" fontSize={12} fontWeight={800}>
              {gas.pressureKPa.toFixed(0)} kPa
            </text>
            <text x={gaugeCx} y={234} textAnchor="middle" fill="#94a3b8" fontSize={11}>
              目标 {level.minPressureKPa}~{level.maxPressureKPa} kPa
            </text>

            <text
              x={280}
              y={305}
              textAnchor="middle"
              fill={gas.overBurst ? "#ef4444" : passed ? "#4ade80" : "#fde047"}
              fontSize={13}
              fontWeight={800}
            >
              {gas.overBurst
                ? `💥 超压警报！当前 ${gas.pressureKPa} kPa 已超过爆破红线 ${level.burstLimitKPa} kPa！`
                : passed
                  ? `✅ 气压与舱温精准达标！（P = ${gas.pressureKPa} kPa）`
                  : `🧪 当前气压 ${gas.pressureKPa} kPa · 请调进目标区间`}
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          {!level.lockMoles && (
            <Slider
              label="充入气体物质的量 n"
              value={state.moles}
              min={0.4}
              max={3.6}
              step={0.1}
              format={fixed(1, "mol")}
              color="#c084fc"
              onChange={(v) => {
                setState((s) => ({ ...s, moles: v }));
                setWonStars(null);
              }}
            />
          )}

          {!level.lockVolume && (
            <Slider
              label="活塞气缸容积 V"
              value={state.volumeL}
              min={2.0}
              max={12.0}
              step={0.5}
              format={fixed(1, "L")}
              color="#38bdf8"
              onChange={(v) => {
                setState((s) => ({ ...s, volumeL: v }));
                setWonStars(null);
              }}
            />
          )}

          {!level.lockTemp && (
            <Slider
              label="绝对热力学温度 T"
              value={state.tempK}
              min={200}
              max={560}
              step={10}
              format={fixed(0, "K")}
              color="#fb7185"
              onChange={(v) => {
                setState((s) => ({ ...s, tempK: v }));
                setWonStars(null);
              }}
            />
          )}

          <Meter
            label="舱内气压精准度"
            pct={
              passed
                ? 100
                : gas.overBurst
                  ? 10
                  : Math.max(
                      15,
                      Math.round(
                        100 -
                          Math.abs(
                            gas.pressureKPa - (level.minPressureKPa + level.maxPressureKPa) / 2
                          ) *
                            0.12
                      )
                    )
            }
            valueText={`${gas.pressureKPa} kPa`}
          />

          <div className="play-actions">
            <button type="button" className="primary-btn" onClick={verifyChamber}>
              🎈 锁定阀门读表
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

export const gas: GameModule = {
  meta: {
    id: "gas",
    title: "气体分子压力舱",
    emoji: "🎈",
    category: "chemistry",
    tag: "理想气体 · PV=nRT",
    blurb: "观察高速飞舞的气体分子撞击活塞，动手验证玻意耳压缩定律、查理热膨胀与空间站标准大气压配方！",
    maxStars: gasLevels.length * 3
  },
  Play: GasGame
};
