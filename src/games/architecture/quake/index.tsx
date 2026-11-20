import { useEffect, useRef, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { checkQuakeSafety, quakeLevels, type QuakeConfig } from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#b45309";

function QuakeGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(quakeLevels[0].id);
  const starMap = useGameStars("quake");
  const level = quakeLevels.find((l) => l.id === levelId) ?? quakeLevels[0];

  const [config, setConfig] = useState<QuakeConfig>({ ...level.initial });
  const [simTime, setSimTime] = useState(0);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);
  const [testedFail, setTestedFail] = useState(false);

  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  useEffect(() => {
    let raf = 0;
    const tick = (ts: number) => {
      if (lastRef.current !== null) {
        const dt = Math.min(0.05, (ts - lastRef.current) / 1000);
        setSimTime((prev) => prev + dt);
      }
      lastRef.current = ts;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lastRef.current = null;
    };
  }, []);

  function load(id: number) {
    const next = quakeLevels.find((l) => l.id === id) ?? quakeLevels[0];
    setLevelId(next.id);
    setConfig({ ...next.initial });
    setTries(0);
    setShowHint(false);
    setWonStars(0);
    setTestedFail(false);
  }

  function updateConfig(patch: Partial<QuakeConfig>) {
    setTestedFail(false);
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  const safety = checkQuakeSafety(level, config);

  function runAcceptanceTest() {
    const nextTries = tries + 1;
    setTries(nextTries);
    const res = checkQuakeSafety(level, config);
    if (res.safe) {
      let stars = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) stars = Math.min(stars, 2);
      setWonStars(stars);
      setTestedFail(false);
      recordStars("quake", String(level.id), stars);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else {
      setTestedFail(true);
      if (sound) chime(false);
    }
  }

  // Animated shake table & multi-story bending visualization
  const omega1 = 2 * Math.PI * config.quakeHz;
  const omega2 = 2 * Math.PI * (config.secondaryQuakeHz ?? config.quakeHz);
  const groundWave =
    Math.sin(simTime * omega1) +
    (config.secondaryQuakeHz ? 0.55 * Math.sin(simTime * omega2) : 0);
  const groundX = groundWave * 6.5;

  // Visual roof drift in px (1 cm = 0.65 px, capped for viewport)
  const pxPerCm = 0.65;
  const maxVisualPx = Math.min(46, safety.swayCm * pxPerCm);
  const bldgPhase = Math.sin(simTime * omega1 - 0.55);
  const roofRelX = bldgPhase * maxVisualPx;
  const basePlateX = config.baseIsolated ? groundX * 0.25 : groundX;

  // Golden TMD pendulum motion: out-of-phase (-bldgPhase) when tuned close to quakeHz
  const detune = Math.abs(config.tmdHz - config.quakeHz);
  const phaseLag = detune < 0.16 ? Math.PI : 0.4;
  const tmdSwingPx = config.tmdEnabled
    ? Math.sin(simTime * 2 * Math.PI * config.tmdHz - 0.55 + phaseLag) * (detune < 0.16 ? 15 : 6)
    : 0;

  const baseCx = 180 + basePlateX;
  const baseY = 232;
  const floors = 6;
  const floorH = 27;
  const towerW = 74;
  const limitPx = level.limitCm * pxPerCm;

  const next = quakeLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🏢"
        title="摩天楼抗震 · 调谐阻尼器"
        onBack={exit}
        backLabel="建筑结构馆"
        stars={sumStars(starMap)}
        maxStars={quakeLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={quakeLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#0f172a", borderColor: "#334155" }}>
          <svg
            viewBox="0 0 360 286"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`摩天楼振动台，大楼固有频率 ${safety.buildingHz.toFixed(2)} Hz，楼顶摆幅 ${safety.swayCm.toFixed(1)} cm`}
          >
            <rect x="0" y="0" width="360" height="286" rx="12" fill="#0b1120" />

            {/* Safety drift envelope lines (± limitCm) */}
            <line
              x1={180 - towerW / 2 - limitPx}
              y1="42"
              x2={180 - towerW / 2 - limitPx}
              y2="226"
              stroke="#22c55e"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <line
              x1={180 + towerW / 2 + limitPx}
              y1="42"
              x2={180 + towerW / 2 + limitPx}
              y2="226"
              stroke="#22c55e"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text x={180 + towerW / 2 + limitPx + 4} y="54" fontSize="9" fontWeight="700" fill="#4ade80">
              安全线 ±{level.limitCm}cm
            </text>

            {/* Seismic shake table at bottom */}
            <g transform={`translate(${180 + groundX}, 250)`}>
              <rect x="-112" y="0" width="224" height="16" rx="4" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
              <text x="0" y="11.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#f8fafc">
                〰️ 地震模拟振动台（{config.quakeHz.toFixed(2)} Hz
                {config.secondaryQuakeHz ? ` + ${config.secondaryQuakeHz.toFixed(2)} Hz` : ""}）
              </text>
            </g>

            {/* Laminated rubber base isolators vs rigid foundation */}
            {config.baseIsolated ? (
              <g>
                {[-28, 0, 28].map((dx) => (
                  <polygon
                    key={dx}
                    points={`${180 + groundX + dx - 8},250 ${180 + groundX + dx + 8},250 ${baseCx + dx + 8},${baseY} ${baseCx + dx - 8},${baseY}`}
                    fill="#f59e0b"
                    stroke="#fef3c7"
                    strokeWidth="1.2"
                  />
                ))}
              </g>
            ) : (
              <rect
                x={180 + groundX - 44}
                y={baseY}
                width="88"
                height="18"
                fill="#64748b"
                stroke="#94a3b8"
                strokeWidth="1.2"
              />
            )}

            {/* 6-story skyscraper with shear/cantilever mode shape */}
            {Array.from({ length: floors }).map((_, i) => {
              const fracBot = i / floors;
              const fracTop = (i + 1) / floors;
              const shiftBot = roofRelX * (fracBot ** 1.35);
              const shiftTop = roofRelX * (fracTop ** 1.35);
              const yBot = baseY - i * floorH;
              const yTop = baseY - (i + 1) * floorH;
              const xBotL = baseCx - towerW / 2 + shiftBot;
              const xBotR = baseCx + towerW / 2 + shiftBot;
              const xTopL = baseCx - towerW / 2 + shiftTop;
              const xTopR = baseCx + towerW / 2 + shiftTop;
              const isTopTmdFloor = config.tmdEnabled && i === floors - 1;

              return (
                <g key={i}>
                  <polygon
                    points={`${xBotL},${yBot} ${xBotR},${yBot} ${xTopR},${yTop} ${xTopL},${yTop}`}
                    fill={isTopTmdFloor ? "#1e293b" : "#1e3a5f"}
                    stroke={safety.safe ? "#38bdf8" : "#f87171"}
                    strokeWidth="1.8"
                  />

                  {/* Illuminated windows */}
                  {!isTopTmdFloor && (
                    <g fill="rgba(253, 224, 71, 0.7)">
                      <rect x={(xBotL + xTopL) * 0.5 + 9} y={yTop + 7} width="11" height="11" rx="1.5" />
                      <rect x={(xBotL + xTopL) * 0.5 + 31} y={yTop + 7} width="11" height="11" rx="1.5" />
                      <rect x={(xBotL + xTopL) * 0.5 + 53} y={yTop + 7} width="11" height="11" rx="1.5" />
                    </g>
                  )}

                  {/* Steel diagonal X-bracing when bracingPct > 0 */}
                  {config.bracingPct > 0 && !isTopTmdFloor && (
                    <g
                      stroke="#fb923c"
                      strokeWidth={1 + (config.bracingPct / 100) * 2.4}
                      opacity={0.3 + (config.bracingPct / 100) * 0.7}
                    >
                      <line x1={xBotL + 3} y1={yBot - 2} x2={xTopR - 3} y2={yTop + 2} />
                      <line x1={xBotR - 3} y1={yBot - 2} x2={xTopL + 3} y2={yTop + 2} />
                    </g>
                  )}

                  {/* Taipei 101 Golden Tuned Mass Damper on top observatory */}
                  {isTopTmdFloor && (
                    <g>
                      <line
                        x1={(xTopL + xTopR) * 0.5}
                        y1={yTop + 2}
                        x2={(xBotL + xBotR) * 0.5 + tmdSwingPx}
                        y2={yTop + 16}
                        stroke="#fde047"
                        strokeWidth="2"
                      />
                      <circle
                        cx={(xBotL + xBotR) * 0.5 + tmdSwingPx}
                        cy={yTop + 17}
                        r="8"
                        fill="#fbbf24"
                        stroke="#fef9c3"
                        strokeWidth="1.8"
                      />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Roof spire */}
            <line
              x1={baseCx + roofRelX}
              y1={baseY - floors * floorH}
              x2={baseCx + roofRelX}
              y2={baseY - floors * floorH - 24}
              stroke={safety.safe ? "#4ade80" : "#ef4444"}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle
              cx={baseCx + roofRelX}
              cy={baseY - floors * floorH - 26}
              r="4"
              fill={safety.safe ? "#4ade80" : "#ef4444"}
            />

            {safety.resonanceWarning && (
              <text x="180" y="34" textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#f87171">
                🚨 危险共振！楼体频率与地震波撞车！
              </text>
            )}

            <text x="12" y="19" fontSize="10.5" fontWeight="700" fill="#cbd5e1">
              🏢 固有频率 {safety.buildingHz.toFixed(2)} Hz · 减振率 {safety.reductionPct}%
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>📉 顶层最大摆幅</small>
                <strong style={{ color: safety.safe ? "#16a34a" : "#dc2626" }}>
                  {safety.swayCm.toFixed(1)} cm
                </strong>
              </div>
              <div className="readout-box">
                <small>🛡️ 安全限值</small>
                <strong>
                  ≤ {level.limitCm} cm{level.minReductionPct ? `（减振≥${level.minReductionPct}%）` : ""}
                </strong>
              </div>
            </div>

            {level.controls.isolator && (
              <div style={{ marginTop: 12 }}>
                <small className="note" style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>
                  🛞 地基支座模式：
                </small>
                <div className="play-actions" style={{ margin: 0 }}>
                  <button
                    type="button"
                    className={`pill-btn${!config.baseIsolated ? " is-active" : ""}`}
                    aria-pressed={!config.baseIsolated}
                    onClick={() => updateConfig({ baseIsolated: false })}
                  >
                    🪨 传统刚性地基
                  </button>
                  <button
                    type="button"
                    className={`pill-btn${config.baseIsolated ? " is-active" : ""}`}
                    aria-pressed={config.baseIsolated}
                    onClick={() => updateConfig({ baseIsolated: true })}
                  >
                    🟡 叠层橡胶隔震垫
                  </button>
                </div>
              </div>
            )}

            <div className="sliders" style={{ marginTop: 14 }}>
              {level.controls.bracing && (
                <Slider
                  label="✖️ 斜撑刚度"
                  value={config.bracingPct}
                  min={0}
                  max={100}
                  step={5}
                  color="#ea580c"
                  format={fixed(0, "%")}
                  onChange={(val) => updateConfig({ bracingPct: val })}
                />
              )}

              {level.controls.tmd && (
                <Slider
                  label="🟡 阻尼球频率"
                  value={config.tmdHz}
                  min={0.5}
                  max={2.2}
                  step={0.05}
                  color="#eab308"
                  format={fixed(2, "Hz")}
                  onChange={(val) => updateConfig({ tmdHz: val })}
                />
              )}

              {level.controls.damping && (
                <Slider
                  label="💧 黏滞阻尼比"
                  value={config.dampingRatio}
                  min={0.04}
                  max={0.22}
                  step={0.02}
                  color="#0ea5e9"
                  format={fixed(2, "ζ")}
                  onChange={(val) => updateConfig({ dampingRatio: val })}
                />
              )}
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={runAcceptanceTest}>
                🚨 启动强震验收测试！
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 抗震图谱
              </button>
            </div>
          </div>

          {testedFail && wonStars === 0 && (
            <DadSays
              text={
                safety.swayCm > level.limitCm
                  ? `现在楼顶还在左右猛甩 ${safety.swayCm.toFixed(1)} cm（超过安全限值 ${level.limitCm} cm）！注意看大楼固有频率 ${safety.buildingHz.toFixed(2)} Hz 和阻尼球对准了没！`
                  : `摆幅降下来了，但减振幅度（${safety.reductionPct}%）还没达到 ${level.minReductionPct}% 以上，把黄金阻尼球频率再调准一点点！`
              }
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`强震峰值仅 ${safety.swayCm.toFixed(1)} cm，减振 ${safety.reductionPct}%！`}
              dadLine={level.win}
              note={`初始摇晃 ${safety.baselineSwayCm.toFixed(1)} cm → 调谐后 ${safety.swayCm.toFixed(1)} cm（大楼频率 ${safety.buildingHz.toFixed(2)} Hz）`}
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

export const quake: GameModule = { meta, Play: QuakeGame };
