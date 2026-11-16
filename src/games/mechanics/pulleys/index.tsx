import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  checkPulleyGoal,
  pulleyLevels,
  requiredEffort,
  ropePulledMeters,
  type PullDirection
} from "./logic.ts";

const ACCENT = "#ea580c";

function PulleysGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(pulleyLevels[0].id);
  const starMap = useGameStars("pulleys");
  const level = pulleyLevels.find((l) => l.id === levelId) ?? pulleyLevels[0];

  const [strands, setStrands] = useState(level.startStrands);
  const [effortN, setEffortN] = useState(level.startEffortN);
  const [direction, setDirection] = useState<PullDirection>(level.startDirection);
  const [ropeMeters, setRopeMeters] = useState(level.startRopeMeters);
  const [liftProgress, setLiftProgress] = useState(0);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = pulleyLevels.find((l) => l.id === id) ?? pulleyLevels[0];
    setLevelId(next.id);
    setStrands(next.startStrands);
    setEffortN(next.startEffortN);
    setDirection(next.startDirection);
    setRopeMeters(next.startRopeMeters);
    setLiftProgress(0);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  const neededF = requiredEffort(level.loadN, strands);
  const actualRope = ropePulledMeters(level.liftMeters, strands);

  function hoistCargo() {
    const nextTries = tries + 1;
    setTries(nextTries);

    const passed = checkPulleyGoal(level, {
      strands,
      effortN,
      pullDirection: direction,
      ropeMeters
    });

    if (passed) {
      setLiftProgress(1);
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("pulleys", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else {
      setLiftProgress(effortN >= neededF ? 0.35 : 0);
      if (sound) chime(false);
    }
  }

  const next = pulleyLevels.find((l) => l.id > level.id);

  // Crane SVG layout coordinates
  const topY = 58;
  const movableY = 178 - liftProgress * 44;
  const crateY = movableY + 26;
  const centerX = 165;
  const strandSpacing = 18;
  const strandXs = Array.from(
    { length: strands },
    (_, i) => centerX - ((strands - 1) * strandSpacing) / 2 + i * strandSpacing
  );
  const hasMovableBlock = strands >= 2;
  const hasTopFixedSheave = direction === "down" || strands >= 3;

  return (
    <div className="page">
      <TopBar
        emoji="🏗️"
        title="滑轮起重机 · 定滑轮与动滑轮组"
        onBack={exit}
        backLabel="机械动力馆"
        stars={sumStars(starMap)}
        maxStars={pulleyLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={pulleyLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#101827", borderColor: "#475569" }}>
          <svg
            viewBox="0 0 380 302"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`滑轮起重机：${strands} 股承重绳，货物重 ${level.loadN} 牛顿，弹簧秤拉力 ${effortN} 牛顿`}
          >
            <rect x="0" y="0" width="380" height="302" rx="12" fill="#0c1320" />

            {/* Ground & Gantry Frame */}
            <rect x="18" y="258" width="344" height="12" rx="4" fill="#334155" />
            <rect x="44" y="34" width="14" height="224" fill="#475569" />
            <rect x="36" y="28" width="290" height="14" rx="4" fill="#f59e0b" stroke="#fde047" strokeWidth="1" />

            {/* Height Ruler on Left */}
            <line x1="82" y1="120" x2="82" y2="252" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x="86" y="132" fontSize="9.5" fill="#94a3b8">
              +{level.liftMeters}m 目标高
            </text>

            {/* Supporting Rope Strands */}
            {strandXs.map((sx, idx) => (
              <g key={idx}>
                <line
                  x1={sx}
                  y1={topY}
                  x2={sx}
                  y2={hasMovableBlock ? movableY : crateY}
                  stroke="#fbbf24"
                  strokeWidth="3"
                />
                <circle cx={sx} cy={(topY + movableY) / 2} r="7.5" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.2" />
                <text x={sx} y={(topY + movableY) / 2 + 3.5} textAnchor="middle" fontSize="8.5" fill="#fef08a" fontWeight="800">
                  {idx + 1}
                </text>
              </g>
            ))}

            {/* Free Effort Rope Strand & Spring Scale */}
            {direction === "down" ? (
              <g>
                <line
                  x1={strandXs[strandXs.length - 1] + 18}
                  y1={topY}
                  x2="278"
                  y2="188"
                  stroke="#38bdf8"
                  strokeWidth="3"
                />
                {/* Spring Scale */}
                <rect x="262" y="188" width="32" height="44" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                <text x="278" y="205" textAnchor="middle" fontSize="8.5" fill="#bae6fd">
                  弹簧秤
                </text>
                <text x="278" y="220" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fde047">
                  {effortN}N
                </text>
                <text x="278" y="250" textAnchor="middle" fontSize="12" fill="#38bdf8" fontWeight="800">
                  ⬇️ 地面下拉
                </text>
              </g>
            ) : (
              <g>
                <line
                  x1={strandXs[strandXs.length - 1]}
                  y1={hasMovableBlock ? movableY : crateY}
                  x2="278"
                  y2="92"
                  stroke="#38bdf8"
                  strokeWidth="3"
                />
                <rect x="262" y="48" width="32" height="44" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                <text x="278" y="65" textAnchor="middle" fontSize="8.5" fill="#bae6fd">
                  弹簧秤
                </text>
                <text x="278" y="80" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fde047">
                  {effortN}N
                </text>
                <text x="326" y="74" fontSize="11" fill="#38bdf8" fontWeight="800">
                  ⬆️ 上提
                </text>
              </g>
            )}

            {/* Top Fixed Pulley Block */}
            {hasTopFixedSheave && (
              <g transform={`translate(${centerX + 6}, ${topY})`}>
                <rect x="-34" y="-16" width="68" height="28" rx="8" fill="#334155" stroke="#94a3b8" strokeWidth="1.6" />
                <circle cx="-12" cy="0" r="10" fill="#ea580c" stroke="#fed7aa" strokeWidth="1.5" />
                {strands >= 3 && <circle cx="14" cy="0" r="10" fill="#ea580c" stroke="#fed7aa" strokeWidth="1.5" />}
                <text x="0" y="-20" textAnchor="middle" fontSize="9.5" fill="#cbd5e1" fontWeight="700">
                  定滑轮架
                </text>
              </g>
            )}

            {/* Movable Pulley Block */}
            {hasMovableBlock && (
              <g transform={`translate(${centerX}, ${movableY})`} style={{ transition: "transform 0.45s ease" }}>
                <rect x="-32" y="-13" width="64" height="26" rx="8" fill="#1e3a8a" stroke="#93c5fd" strokeWidth="1.6" />
                <circle cx={strands >= 4 ? -12 : 0} cy="0" r="10" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1.5" />
                {strands >= 4 && <circle cx="12" cy="0" r="10" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1.5" />}
                <line x1="0" y1="13" x2="0" y2="26" stroke="#cbd5e1" strokeWidth="3" />
              </g>
            )}

            {/* Cargo Crate */}
            <g transform={`translate(${centerX}, ${crateY})`} style={{ transition: "transform 0.45s ease" }}>
              <rect
                x="-40"
                y="0"
                width="80"
                height="50"
                rx="9"
                fill={wonStars > 0 ? "#166534" : "#78350f"}
                stroke={wonStars > 0 ? "#4ade80" : "#fbbf24"}
                strokeWidth="2.2"
              />
              <text x="0" y="23" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff">
                {level.cargoEmoji} {level.loadN}N
              </text>
              <text x="0" y="40" textAnchor="middle" fontSize="9.5" fill="#fef3c7">
                {level.cargoName}
              </text>
            </g>

            <text x="14" y="20" fontSize="11" fontWeight="800" fill="#f8fafc">
              🏗️ 平衡条件：每股绳分担 {neededF.toFixed(0)}N（共 {strands} 股承重 = {level.loadN}N）
            </text>
            <text x="14" y="290" fontSize="10.5" fill="#94a3b8">
              功的原理：物升 h = {level.liftMeters}m → 绳走 s = n × h = {actualRope}m
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>货物重量 G</small>
                <strong style={{ color: "#ea580c" }}>{level.loadN} N</strong>
              </div>
              <div className="readout-box">
                <small>当前所需平衡力</small>
                <strong style={{ color: Math.abs(effortN - neededF) < 0.5 ? "#16a34a" : "#2563eb" }}>
                  {neededF.toFixed(0)} N（你设 {effortN} N）
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <small style={{ fontWeight: 700, color: "#5d4e37" }}>🪢 承重绳股数 n（分担重物的绳段数）：</small>
              <div className="play-actions" style={{ marginTop: 6 }}>
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`pill-btn${strands === n ? " is-active" : ""}`}
                    onClick={() => {
                      setStrands(n);
                      setLiftProgress(0);
                    }}
                  >
                    {n} 股承重
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <small style={{ fontWeight: 700, color: "#5d4e37" }}>🧭 自由端拉绳方向：</small>
              <div className="play-actions" style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className={`pill-btn${direction === "down" ? " is-active" : ""}`}
                  onClick={() => setDirection("down")}
                >
                  ⬇️ 站地面向下拉
                </button>
                <button
                  type="button"
                  className={`pill-btn${direction === "up" ? " is-active" : ""}`}
                  onClick={() => setDirection("up")}
                >
                  ⬆️ 向上提拉
                </button>
              </div>
            </div>

            <div className="sliders" style={{ marginTop: 12 }}>
              <Slider
                label="💪 拉力 F"
                value={effortN}
                min={20}
                max={120}
                step={10}
                color={ACCENT}
                format={fixed(0, "N")}
                onChange={(v) => {
                  setEffortN(v);
                  setLiftProgress(0);
                }}
              />
              {level.askRopeMeters && (
                <Slider
                  label={`📏 升${level.liftMeters}m拉绳`}
                  value={ropeMeters}
                  min={1}
                  max={10}
                  step={1}
                  color="#2563eb"
                  format={fixed(0, "m")}
                  onChange={setRopeMeters}
                />
              )}
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={hoistCargo}>
                🏗️ 拉动绳索起吊！
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 阿基米德提示
              </button>
            </div>
          </div>

          {tries > 0 && wonStars === 0 && (
            <NianSays
              text={
                strands !== level.targetStrands
                  ? `现在是 ${strands} 股绳承重（需要 ${neededF.toFixed(0)}N），跟本关目标股数还不一样哦！`
                  : level.requiredDirection && direction !== level.requiredDirection
                    ? "力气算对啦，但拉绳方向不对！题目要求站在地面【⬇️ 向下拉】哦！"
                    : level.askRopeMeters && Math.abs(ropeMeters - actualRope) > 0.1
                      ? `拉力对啦！不过货物升起 ${level.liftMeters}m 时，${strands} 股绳每段都要缩短 ${level.liftMeters}m，再算算一共要拉几米绳？`
                      : `现在的拉力 ${effortN}N 不等于刚好平衡所需的 ${neededF.toFixed(0)}N，微调一下拉力滑块吧！`
              }
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`${strands} 股滑轮组 · ${effortN}N 稳稳吊起 ${level.cargoName}！`}
              dadLine={level.win}
              note={`省力账本：F = ${level.loadN}N ÷ ${strands} = ${neededF.toFixed(0)}N · 升 ${level.liftMeters}m 需拉绳 ${actualRope}m`}
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

export const pulleys: GameModule = {
  meta: {
    id: "pulleys",
    title: "滑轮起重机",
    category: "mechanics",
    emoji: "🏗️",
    tag: "定滑轮 · 动滑轮组",
    blurb: "从升旗杆顶改变方向的定滑轮，到四股绳吊起三角钢琴的复合滑轮组，亲手验证省力必费距离。",
    maxStars: pulleyLevels.length * 3
  },
  Play: PulleysGame
};
