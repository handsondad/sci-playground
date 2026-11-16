import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  TOPOLOGY_LABELS,
  checkCircuitGoal,
  circuitLevels,
  evaluateCircuit,
  type CircuitTopology,
  type SwitchState
} from "./logic.ts";

const ACCENT = "#f59e0b";

function BulbGraphic({
  x,
  y,
  label,
  brightness,
  voltageV
}: {
  x: number;
  y: number;
  label: string;
  brightness: number;
  voltageV: number;
}) {
  const lit = brightness > 0;
  const glowR = lit ? 18 + (brightness / 100) * 18 : 0;
  const rayLen = (brightness / 100) * 11;

  return (
    <g transform={`translate(${x}, ${y})`}>
      {lit && (
        <>
          <circle cx="0" cy="-6" r={glowR} fill="rgba(250, 204, 21, 0.28)" />
          {Array.from({ length: 8 }, (_, idx) => {
            const rad = (idx * Math.PI) / 4;
            const r1 = 19;
            const r2 = 19 + rayLen;
            return (
              <line
                key={idx}
                x1={Math.cos(rad) * r1}
                y1={-6 + Math.sin(rad) * r1}
                x2={Math.cos(rad) * r2}
                y2={-6 + Math.sin(rad) * r2}
                stroke="#fde047"
                strokeWidth="2.3"
                strokeLinecap="round"
              />
            );
          })}
        </>
      )}
      {/* Glass globe */}
      <circle
        cx="0"
        cy="-6"
        r="15"
        fill={lit ? (brightness >= 90 ? "#fef08a" : "#fde68a") : "rgba(148, 163, 184, 0.2)"}
        stroke={lit ? "#f59e0b" : "#94a3b8"}
        strokeWidth="2"
      />
      {/* Filament */}
      <path
        d="M -5 4 L -3 -8 L 0 -4 L 3 -8 L 5 4"
        fill="none"
        stroke={lit ? "#ea580c" : "#64748b"}
        strokeWidth="1.8"
      />
      {/* Screw base */}
      <rect x="-7" y="8" width="14" height="9" rx="2" fill="#94a3b8" stroke="#475569" strokeWidth="1.2" />
      <text x="0" y="30" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#e2e8f0">
        {label} {lit ? `${brightness}% (${voltageV.toFixed(1)}V)` : "熄灭"}
      </text>
    </g>
  );
}

function SwitchGraphic({
  x,
  y,
  label,
  closed,
  onToggle
}: {
  x: number;
  y: number;
  label: string;
  closed: boolean;
  onToggle: () => void;
}) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: "pointer" }}
      onClick={onToggle}
      role="button"
      aria-label={`开关 ${label}：${closed ? "已闭合" : "已断开"}`}
    >
      <rect x="-24" y="-18" width="48" height="34" rx="6" fill="rgba(255,255,255,0.04)" />
      <circle cx="-14" cy="0" r="4" fill="#fbbf24" />
      <circle cx="14" cy="0" r="4" fill="#fbbf24" />
      <line
        x1="-14"
        y1="0"
        x2={closed ? 14 : 10}
        y2={closed ? 0 : -13}
        stroke={closed ? "#4ade80" : "#f87171"}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <text x="0" y="-16" textAnchor="middle" fontSize="10" fontWeight="700" fill={closed ? "#86efac" : "#fca5a5"}>
        {label} {closed ? "合" : "断"}
      </text>
    </g>
  );
}

function CircuitsGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(circuitLevels[0].id);
  const starMap = useGameStars("circuits");
  const level = circuitLevels.find((l) => l.id === levelId) ?? circuitLevels[0];

  const [topology, setTopology] = useState<CircuitTopology>(level.startTopology);
  const [switches, setSwitches] = useState<SwitchState>(level.startSwitches);
  const [phase, setPhase] = useState(0);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  useEffect(() => {
    let raf = 0;
    let last: number | null = null;
    const tick = (ts: number) => {
      if (last !== null) {
        const dt = (ts - last) / 1000;
        setPhase((p) => (p + dt * 68) % 24);
      }
      last = ts;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function load(id: number) {
    const next = circuitLevels.find((l) => l.id === id) ?? circuitLevels[0];
    setLevelId(next.id);
    setTopology(next.startTopology);
    setSwitches(next.startSwitches);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  const res = evaluateCircuit(topology, switches);
  const s2Relevant = topology === "parallel" || topology === "short";

  function toggleS1() {
    setSwitches((prev) => ({ ...prev, s1: !prev.s1 }));
  }

  function toggleS2() {
    setSwitches((prev) => ({ ...prev, s2: !prev.s2 }));
  }

  function verifyCircuit() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkCircuitGoal(level, topology, switches)) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("circuits", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const next = circuitLevels.find((l) => l.id > level.id);
  const wireColor = res.isShortCircuit ? "#ef4444" : res.isClosedLoop ? "#fbbf24" : "#64748b";

  return (
    <div className="page">
      <TopBar
        emoji="🔋"
        title="点亮小灯泡 · 串并联与欧姆定律"
        onBack={exit}
        backLabel="声光电磁馆"
        stars={sumStars(starMap)}
        maxStars={circuitLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={circuitLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#0d1726", borderColor: res.isShortCircuit ? "#ef4444" : "#334155" }}>
          <svg
            viewBox="0 0 390 296"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`电路实验板：${TOPOLOGY_LABELS[topology]}，总电流 ${res.totalCurrentA} 安培`}
          >
            <rect x="0" y="0" width="390" height="296" rx="12" fill="#0b1320" />

            {/* Battery 6.0V on Left */}
            <g transform="translate(52, 150)">
              <rect x="-20" y="-44" width="40" height="88" rx="7" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
              <rect x="-20" y="-44" width="40" height="26" rx="6" fill="#dc2626" />
              <rect x="-8" y="-51" width="16" height="7" rx="2" fill="#fbbf24" />
              <text x="0" y="-26" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">
                ＋
              </text>
              <text x="0" y="6" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#fef08a">
                6.0V
              </text>
              <text x="0" y="34" textAnchor="middle" fontSize="13" fontWeight="800" fill="#93c5fd">
                －
              </text>
            </g>

            {/* Top & Bottom Main Rails from Battery */}
            <path
              d="M 52 99 L 52 62 L 130 62"
              fill="none"
              stroke={wireColor}
              strokeWidth="3.5"
            />
            <path
              d="M 52 194 L 52 242 L 130 242"
              fill="none"
              stroke={wireColor}
              strokeWidth="3.5"
            />

            {/* Topology-Specific Branches */}
            {(topology === "open" || topology === "single") && (
              <g>
                <line x1="130" y1="62" x2="176" y2="62" stroke={wireColor} strokeWidth="3.5" />
                <SwitchGraphic x={190} y={62} label="S1" closed={switches.s1} onToggle={toggleS1} />
                <path d="M 204 62 L 296 62 L 296 124" fill="none" stroke={wireColor} strokeWidth="3.5" />
                <BulbGraphic
                  x={296}
                  y={144}
                  label="L1"
                  brightness={res.l1Brightness}
                  voltageV={res.l1VoltageV}
                />
                {topology === "single" ? (
                  <path
                    d="M 296 162 L 296 242 L 130 242"
                    fill="none"
                    stroke={wireColor}
                    strokeWidth="3.5"
                    strokeDasharray={res.isClosedLoop ? "8 6" : undefined}
                    strokeDashoffset={res.isClosedLoop ? -phase : 0}
                  />
                ) : (
                  <g>
                    <path d="M 296 162 L 296 242 L 228 242" fill="none" stroke="#64748b" strokeWidth="3.5" />
                    <line x1="130" y1="242" x2="178" y2="242" stroke="#64748b" strokeWidth="3.5" />
                    <rect
                      x="176"
                      y="228"
                      width="54"
                      height="26"
                      rx="6"
                      fill="rgba(239, 68, 68, 0.14)"
                      stroke="#f87171"
                      strokeDasharray="4 3"
                    />
                    <text x="203" y="245" textAnchor="middle" fontSize="9.5" fill="#fca5a5" fontWeight="700">
                      断口
                    </text>
                  </g>
                )}
              </g>
            )}

            {topology === "series" && (
              <g>
                <line x1="130" y1="62" x2="162" y2="62" stroke={wireColor} strokeWidth="3.5" />
                <SwitchGraphic x={176} y={62} label="S1" closed={switches.s1} onToggle={toggleS1} />
                <path
                  d="M 190 62 L 324 62 L 324 242 L 130 242"
                  fill="none"
                  stroke={wireColor}
                  strokeWidth="3.5"
                  strokeDasharray={res.isClosedLoop ? "8 6" : undefined}
                  strokeDashoffset={res.isClosedLoop ? -phase : 0}
                />
                <BulbGraphic
                  x={248}
                  y={62}
                  label="L1"
                  brightness={res.l1Brightness}
                  voltageV={res.l1VoltageV}
                />
                <BulbGraphic
                  x={248}
                  y={236}
                  label="L2"
                  brightness={res.l2Brightness}
                  voltageV={res.l2VoltageV}
                />
              </g>
            )}

            {(topology === "parallel" || topology === "short") && (
              <g>
                {/* Upper Branch 1: S1 + L1 */}
                <path
                  d="M 130 62 L 130 112 L 176 112"
                  fill="none"
                  stroke={res.l1Brightness > 0 ? "#fbbf24" : "#64748b"}
                  strokeWidth="3.5"
                />
                <SwitchGraphic x={190} y={112} label="S1" closed={switches.s1} onToggle={toggleS1} />
                <line
                  x1="204"
                  y1="112"
                  x2="338"
                  y2="112"
                  stroke={res.l1Brightness > 0 ? "#fbbf24" : "#64748b"}
                  strokeWidth="3.5"
                  strokeDasharray={res.l1Brightness > 0 ? "8 6" : undefined}
                  strokeDashoffset={res.l1Brightness > 0 ? -phase : 0}
                />
                <BulbGraphic
                  x={284}
                  y={112}
                  label="L1"
                  brightness={res.l1Brightness}
                  voltageV={res.l1VoltageV}
                />

                {/* Lower Branch 2: S2 + L2 */}
                <path
                  d="M 130 112 L 130 202 L 176 202"
                  fill="none"
                  stroke={res.l2Brightness > 0 ? "#fbbf24" : "#64748b"}
                  strokeWidth="3.5"
                />
                <SwitchGraphic x={190} y={202} label="S2" closed={Boolean(switches.s2)} onToggle={toggleS2} />
                <line
                  x1="204"
                  y1="202"
                  x2="338"
                  y2="202"
                  stroke={res.l2Brightness > 0 ? "#fbbf24" : "#64748b"}
                  strokeWidth="3.5"
                  strokeDasharray={res.l2Brightness > 0 ? "8 6" : undefined}
                  strokeDashoffset={res.l2Brightness > 0 ? -phase : 0}
                />
                <BulbGraphic
                  x={284}
                  y={202}
                  label="L2"
                  brightness={res.l2Brightness}
                  voltageV={res.l2VoltageV}
                />

                {/* Right Return Rail */}
                <path
                  d="M 338 112 L 338 242 L 130 242"
                  fill="none"
                  stroke={res.isClosedLoop && !res.isShortCircuit ? "#fbbf24" : "#64748b"}
                  strokeWidth="3.5"
                />

                {/* Short-Circuit Jumper Wire */}
                {topology === "short" && (
                  <g
                    style={{ cursor: "pointer" }}
                    onClick={() => setTopology("parallel")}
                    role="button"
                    aria-label="点击拆除跨接短路导线"
                  >
                    <line
                      x1="104"
                      y1="62"
                      x2="104"
                      y2="242"
                      stroke="#ef4444"
                      strokeWidth="5"
                      strokeDasharray="9 5"
                      strokeDashoffset={-phase * 1.6}
                    />
                    <circle cx="104" cy="152" r="18" fill="rgba(239, 68, 68, 0.28)" stroke="#fca5a5" strokeWidth="1.5" />
                    <text x="104" y="156" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fef08a">
                      ⚡✂️
                    </text>
                  </g>
                )}
              </g>
            )}

            <text x="14" y="23" fontSize="11.5" fontWeight="800" fill={res.isShortCircuit ? "#fca5a5" : "#e2e8f0"}>
              {res.isShortCircuit
                ? "🚨 警告：电源正负极被导线直接跨接短路！保险丝报警！"
                : `🔬 当前接线：${TOPOLOGY_LABELS[topology]}（点开关可直接合/断）`}
            </text>
            <text x="14" y="283" fontSize="10.5" fill="#94a3b8">
              欧姆定律：电池 E = 6.0V · 单灯电阻 R = 10Ω · 干路电流 I = {res.totalCurrentA.toFixed(2)} A
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>灯泡亮度 L1 / L2</small>
                <strong style={{ color: res.isShortCircuit ? "#dc2626" : "#d97706" }}>
                  {res.l1Brightness}% / {res.l2Brightness}%
                </strong>
              </div>
              <div className="readout-box">
                <small>干路电流表</small>
                <strong style={{ color: res.isShortCircuit ? "#dc2626" : "#2563eb" }}>
                  {res.isShortCircuit ? "9.9A 过载!" : `${res.totalCurrentA.toFixed(2)} A`}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <small style={{ fontWeight: 700, color: "#5d4e37" }}>🔌 第 1 步：选择电路接线方案</small>
              <div className="play-actions" style={{ marginTop: 6 }}>
                {level.allowedTopologies.map((topo) => (
                  <button
                    key={topo}
                    type="button"
                    className={`pill-btn${topology === topo ? " is-active" : ""}`}
                    onClick={() => setTopology(topo)}
                  >
                    {TOPOLOGY_LABELS[topo]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <small style={{ fontWeight: 700, color: "#5d4e37" }}>🎛️ 第 2 步：拨动开关测试通断</small>
              <div className="play-actions" style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className={`pill-btn${switches.s1 ? " is-active" : ""}`}
                  onClick={toggleS1}
                >
                  开关 S1：{switches.s1 ? "✅ 闭合" : "⭕ 断开"}
                </button>
                {s2Relevant && (
                  <button
                    type="button"
                    className={`pill-btn${switches.s2 ? " is-active" : ""}`}
                    onClick={toggleS2}
                  >
                    开关 S2：{switches.s2 ? "✅ 闭合" : "⭕ 断开"}
                  </button>
                )}
                {topology === "short" && (
                  <button
                    type="button"
                    className="pill-btn"
                    style={{ borderColor: "#ef4444", color: "#dc2626" }}
                    onClick={() => setTopology("parallel")}
                  >
                    ✂️ 拆除短路导线
                  </button>
                )}
              </div>
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={verifyCircuit}>
                🔋 通电检验电路！
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 电工锦囊
              </button>
            </div>
          </div>

          {tries > 0 && wonStars === 0 && (
            <NianSays
              text={
                res.isShortCircuit
                  ? "哎呀，电池正负极还连着那根冒红光的短路铜线呢！快把它剪断拆掉！"
                  : level.id === 3 && topology === "parallel" && switches.s1 && switches.s2
                    ? "两盏灯都 100% 满亮啦！现在按题目要求把【开关 S1 断开、保留 S2 闭合】，验证 L1 灭而 L2 依然独立发光吧！"
                    : "电路状态还没完全符合本关要求哦，看看接线方式和开关 S1/S2 的开合状态！"
              }
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`${TOPOLOGY_LABELS[topology]} 检验通过！`}
              dadLine={level.win}
              note={`电学读数：L1=${res.l1VoltageV.toFixed(1)}V (${res.l1Brightness}%) · L2=${res.l2VoltageV.toFixed(1)}V (${res.l2Brightness}%) · 总电流=${res.totalCurrentA.toFixed(2)}A`}
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

export const circuits: GameModule = {
  meta: {
    id: "circuits",
    title: "点亮小灯泡",
    category: "physics",
    emoji: "🔋",
    tag: "串并联 · 欧姆定律",
    blurb: "在电路板上亲手搭出单灯回路、串联分压与客厅卧室并联双控，还要排查惊险的电源跨接短路！",
    maxStars: circuitLevels.length * 3
  },
  Play: CircuitsGame
};
