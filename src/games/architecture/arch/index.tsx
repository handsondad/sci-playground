import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  archLevels,
  evaluateArch,
  type ArchChoices,
  type ButtressChoice,
  type KeystoneChoice,
  type StoneChoice
} from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#b45309";

function ArchGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(archLevels[0].id);
  const starMap = useGameStars("arch");
  const level = archLevels.find((l) => l.id === levelId) ?? archLevels[0];

  const [choices, setChoices] = useState<ArchChoices>({ ...level.initial });
  const [centeringRemoved, setCenteringRemoved] = useState(false);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = archLevels.find((l) => l.id === id) ?? archLevels[0];
    setLevelId(next.id);
    setChoices({ ...next.initial });
    setCenteringRemoved(false);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  function updateChoices(patch: Partial<ArchChoices>) {
    setCenteringRemoved(false);
    setChoices((prev) => ({ ...prev, ...patch }));
  }

  const evalRes = evaluateArch(level, choices);

  function removeCenteringTest() {
    setCenteringRemoved(true);
    const nextTries = tries + 1;
    setTries(nextTries);
    const res = evaluateArch(level, choices);
    if (res.stable) {
      let stars = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) stars = Math.min(stars, 2);
      setWonStars(stars);
      recordStars("arch", String(level.id), stars);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const next = archLevels.find((l) => l.id > level.id);

  // SVG arch geometry
  const cx = 180;
  const spanHalf = 78;
  const springY = level.tallWalls ? 168 : 204;
  const risePx = Math.round(spanHalf * 2 * choices.riseRatio * 0.72);
  const rInner = 64;
  const rOuter = 90;
  const yScale = risePx / 76;

  // Build 7 arch ring segments: indices -3,-2,-1 (left), 0 (keystone), 1,2,3 (right)
  const segments = [-3, -2, -1, 0, 1, 2, 3];
  const halfStepDeg = 180 / 14; // 7 stones across 180°

  function archPoint(degFromCrown: number, r: number) {
    const rad = ((90 - degFromCrown) * Math.PI) / 180;
    return {
      x: cx + Math.cos(rad) * r * (spanHalf / 78),
      y: springY - Math.sin(rad) * r * yScale
    };
  }

  const failed = centeringRemoved && !evalRes.stable;
  const wallTilt = failed && evalRes.failureMode === "wall_pushout" ? 9 : 0;

  // Thrust line curve points (inverted catenary)
  const thrustPathParts: string[] = [];
  for (let i = -10; i <= 10; i++) {
    const u = i / 10; // -1..1
    const x = cx + u * (rInner + rOuter) * 0.5 * (spanHalf / 78);
    // Catenary shape normalized vs actual arch crown
    const catNorm = (Math.cosh(1.35) - Math.cosh(1.35 * u)) / (Math.cosh(1.35) - 1);
    const idealRisePx = 78 * 2 * 0.54 * 0.72;
    const crownMidY = springY - ((rInner + rOuter) * 0.5) * yScale;
    const thrustY = springY - catNorm * (centeringRemoved ? idealRisePx : risePx) * 0.98;
    const blendedY = level.targetRiseRange ? thrustY : springY - catNorm * (springY - crownMidY);
    thrustPathParts.push(`${i === -10 ? "M" : "L"} ${x.toFixed(1)} ${blendedY.toFixed(1)}`);
  }

  return (
    <div className="page">
      <TopBar
        emoji="🏛️"
        title="罗马石拱门 · 压应力传导"
        onBack={exit}
        backLabel="建筑结构馆"
        stars={sumStars(starMap)}
        maxStars={archLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={archLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#fefce8", borderColor: "#fde68a" }}>
          <svg
            viewBox="0 0 360 284"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`${level.title} 石拱实验台，水平外推力 ${evalRes.horizontalThrustKn} kN`}
          >
            <rect x="0" y="0" width="360" height="284" rx="12" fill="#fffbeb" />
            {/* Ground */}
            <rect x="0" y="252" width="360" height="32" fill="#d6d3d1" />
            <line x1="0" y1="252" x2="360" y2="252" stroke="#78716c" strokeWidth="2.5" />

            {/* Flying / heavy buttresses on left & right */}
            {choices.buttress === "heavy" && (
              <g fill="#a8a29e" stroke="#57534e" strokeWidth="1.8">
                {/* Left Gothic flying buttress + pier */}
                <polygon points={`22,252 54,252 58,${springY - 12} 30,${springY + 4}`} />
                <polygon points={`54,${springY + 12} 96,${springY - 6} 96,${springY + 10} 54,${springY + 28}`} />
                {/* Right Gothic flying buttress + pier */}
                <polygon points={`338,252 306,252 302,${springY - 12} 330,${springY + 4}`} />
                <polygon points={`306,${springY + 12} 264,${springY - 6} 264,${springY + 10} 306,${springY + 28}`} />
              </g>
            )}

            {choices.buttress === "light" && (
              <g stroke="#b45309" strokeWidth="4" strokeLinecap="round">
                <line x1="48" y1="252" x2="88" y2={springY + 6} />
                <line x1="312" y1="252" x2="272" y2={springY + 6} />
              </g>
            )}

            {/* Left & Right masonry piers / cathedral walls */}
            <g transform={`rotate(${-wallTilt}, 92, 252)`}>
              <rect
                x={level.tallWalls ? 84 : 74}
                y={springY}
                width={level.tallWalls ? 22 : 32}
                height={252 - springY}
                fill="#d6d3d1"
                stroke="#57534e"
                strokeWidth="2"
              />
            </g>
            <g transform={`rotate(${wallTilt}, 268, 252)`}>
              <rect
                x={level.tallWalls ? 254 : 254}
                y={springY}
                width={level.tallWalls ? 22 : 32}
                height={252 - springY}
                fill="#d6d3d1"
                stroke="#57534e"
                strokeWidth="2"
              />
            </g>

            {/* Wooden centering scaffold (drops down when removed) */}
            <g
              transform={`translate(0, ${centeringRemoved ? 56 : 0})`}
              opacity={centeringRemoved ? 0.28 : 0.95}
              style={{ transition: "transform 0.45s ease, opacity 0.45s ease" }}
            >
              <path
                d={`M ${cx - rInner * (spanHalf / 78)} ${springY} A ${rInner * (spanHalf / 78)} ${rInner * yScale} 0 0 1 ${cx + rInner * (spanHalf / 78)} ${springY} Z`}
                fill="rgba(180, 83, 9, 0.2)"
                stroke="#92400e"
                strokeWidth="2.5"
              />
              <line x1={cx} y1={springY} x2={cx} y2={springY - rInner * yScale} stroke="#92400e" strokeWidth="2.5" />
              <line x1={cx - 34} y1={springY} x2={cx} y2={springY - rInner * yScale * 0.6} stroke="#92400e" strokeWidth="2" />
              <line x1={cx + 34} y1={springY} x2={cx} y2={springY - rInner * yScale * 0.6} stroke="#92400e" strokeWidth="2" />
              <line x1={cx - 28} y1={springY} x2={cx - 28} y2="252" stroke="#78350f" strokeWidth="3.5" />
              <line x1={cx + 28} y1={springY} x2={cx + 28} y2="252" stroke="#78350f" strokeWidth="3.5" />
              {!centeringRemoved && (
                <text x={cx} y={springY + 18} textAnchor="middle" fontSize="10" fontWeight="700" fill="#78350f">
                  🪵 临时木脚手架（托举中）
                </text>
              )}
            </g>

            {/* Arch stones (6 side stones + 1 center keystone) */}
            {segments.map((idx) => {
              const centerDeg = idx * halfStepDeg * 2;
              const a1 = centerDeg - halfStepDeg * 0.96;
              const a2 = centerDeg + halfStepDeg * 0.96;

              if (idx === 0) {
                if (choices.keystone === "none") {
                  const pL = archPoint(-halfStepDeg, (rInner + rOuter) * 0.5);
                  const pR = archPoint(halfStepDeg, (rInner + rOuter) * 0.5);
                  return (
                    <rect
                      key="key-gap"
                      x={pL.x + 2}
                      y={pL.y - 14}
                      width={Math.max(14, pR.x - pL.x - 4)}
                      height="26"
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  );
                }

                const dropY =
                  failed && evalRes.failureMode === "slip_keystone"
                    ? 52
                    : failed && evalRes.failureMode === "too_peaked_buckle"
                      ? -8
                      : 0;

                const oL = archPoint(a1, rOuter + 3);
                const oR = archPoint(a2, rOuter + 3);
                const iL = archPoint(a1, rInner);
                const iR = archPoint(a2, rInner);

                let pts = `${oL.x},${oL.y} ${oR.x},${oR.y} ${iR.x},${iR.y} ${iL.x},${iL.y}`;
                if (choices.keystone === "flat") {
                  const midW = 11;
                  pts = `${cx - midW},${oL.y} ${cx + midW},${oR.y} ${cx + midW},${iR.y} ${cx - midW},${iL.y}`;
                } else if (choices.keystone === "inverted") {
                  pts = `${cx - 7},${oL.y} ${cx + 7},${oR.y} ${cx + 15},${iR.y} ${cx - 15},${iL.y}`;
                }

                return (
                  <g
                    key="keystone"
                    transform={`translate(0, ${dropY})`}
                    style={{ transition: "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                  >
                    <polygon
                      points={pts}
                      fill={choices.keystone === "wedge" ? "#f59e0b" : "#ef4444"}
                      stroke="#78350f"
                      strokeWidth="2.2"
                    />
                    <text
                      x={cx}
                      y={(oL.y + iL.y) * 0.5 + 3}
                      textAnchor="middle"
                      fontSize="8.5"
                      fontWeight="800"
                      fill="#fff"
                    >
                      拱顶
                    </text>
                  </g>
                );
              }

              // Side stone (voussoir vs flat brick)
              let dx = 0;
              let dy = 0;
              if (failed) {
                if (evalRes.failureMode === "missing_keystone" && Math.abs(idx) <= 2) {
                  dx = idx < 0 ? 10 : -10;
                  dy = 28;
                } else if (evalRes.failureMode === "slip_voussoirs") {
                  dy = (4 - Math.abs(idx)) * 13;
                } else if (evalRes.failureMode === "wall_pushout") {
                  dx = idx < 0 ? -9 : 9;
                  dy = 14;
                } else if (evalRes.failureMode === "too_flat_thrust" || evalRes.failureMode === "too_peaked_buckle") {
                  dy = Math.abs(idx) === 2 ? -9 : 10;
                }
              }

              let polyPts: string;
              if (choices.stoneType === "voussoir") {
                const o1 = archPoint(a1, rOuter);
                const o2 = archPoint(a2, rOuter);
                const i2 = archPoint(a2, rInner);
                const i1 = archPoint(a1, rInner);
                polyPts = `${o1.x},${o1.y} ${o2.x},${o2.y} ${i2.x},${i2.y} ${i1.x},${i1.y}`;
              } else {
                const c = archPoint(centerDeg, (rInner + rOuter) * 0.5);
                polyPts = `${c.x - 13},${c.y - 10} ${c.x + 13},${c.y - 10} ${c.x + 13},${c.y + 10} ${c.x - 13},${c.y + 10}`;
              }

              return (
                <polygon
                  key={idx}
                  points={polyPts}
                  transform={`translate(${dx}, ${dy})`}
                  style={{ transition: "transform 0.45s ease" }}
                  fill={choices.stoneType === "voussoir" ? "#fde68a" : "#fca5a5"}
                  stroke="#92400e"
                  strokeWidth="1.8"
                />
              );
            })}

            {/* Thrust line visualization */}
            {(centeringRemoved || level.targetRiseRange) && (
              <path
                d={thrustPathParts.join(" ")}
                fill="none"
                stroke={evalRes.stable ? "#16a34a" : "#dc2626"}
                strokeWidth="2.8"
                strokeDasharray="5 4"
              />
            )}

            {/* Heavy crown weight indicator */}
            <g transform={`translate(${cx}, ${springY - rOuter * yScale - 18})`}>
              <rect x="-32" y="-14" width="64" height="16" rx="4" fill="#475569" />
              <text x="0" y="-3" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#f8fafc">
                ⬇️ 荷载 {level.heavyCrownLoadKn} kN
              </text>
            </g>

            {/* Outward horizontal thrust arrows */}
            <g fontSize="10" fontWeight="800" fill={evalRes.horizontalThrustKn > evalRes.buttressCapacityKn ? "#dc2626" : "#b45309"}>
              <text x="16" y={springY - 18}>
                ← 外推 {evalRes.horizontalThrustKn.toFixed(0)}kN
              </text>
              <text x="266" y={springY - 18}>
                外推 {evalRes.horizontalThrustKn.toFixed(0)}kN →
              </text>
            </g>

            <text x="12" y="20" fontSize="10.5" fontWeight="700" fill="#78350f">
              🏛️ 无砂浆纯受压石拱 · 虚线为拱内悬链推力线
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>↔️ 水平外推力</small>
                <strong style={{ color: evalRes.horizontalThrustKn <= evalRes.buttressCapacityKn ? "#16a34a" : "#dc2626" }}>
                  {evalRes.horizontalThrustKn.toFixed(0)} kN
                </strong>
              </div>
              <div className="readout-box">
                <small>🛡️ 侧墙抗推力</small>
                <strong>{evalRes.buttressCapacityKn} kN</strong>
              </div>
            </div>

            {level.controls.keystone && (
              <div style={{ marginTop: 12 }}>
                <small className="note" style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>
                  🔑 选择顶端拱顶石（Keystone）：
                </small>
                <div className="play-actions" style={{ margin: 0 }}>
                  {(
                    [
                      ["wedge", "▽ 上宽下窄楔形石"],
                      ["flat", "▭ 平直方砖"],
                      ["inverted", "△ 上窄下宽倒石"],
                      ["none", "🕳️ 不放"]
                    ] as readonly [KeystoneChoice, string][]
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={`pill-btn${choices.keystone === val ? " is-active" : ""}`}
                      aria-pressed={choices.keystone === val}
                      onClick={() => updateChoices({ keystone: val })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {level.controls.stoneType && (
              <div style={{ marginTop: 12 }}>
                <small className="note" style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>
                  🧱 选择两侧砌筑石料：
                </small>
                <div className="play-actions" style={{ margin: 0 }}>
                  {(
                    [
                      ["flat", "▭ 普通平直砖"],
                      ["voussoir", "⏢ 楔形拱石（Voussoir）"]
                    ] as readonly [StoneChoice, string][]
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={`pill-btn${choices.stoneType === val ? " is-active" : ""}`}
                      aria-pressed={choices.stoneType === val}
                      onClick={() => updateChoices({ stoneType: val })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {level.controls.buttress && (
              <div style={{ marginTop: 12 }}>
                <small className="note" style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>
                  🏰 两侧墙体外推支撑：
                </small>
                <div className="play-actions" style={{ margin: 0 }}>
                  {(
                    [
                      ["none", "无扶壁薄墙"],
                      ["light", "细木斜撑"],
                      ["heavy", "哥特式飞扶壁石墩"]
                    ] as readonly [ButtressChoice, string][]
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={`pill-btn${choices.buttress === val ? " is-active" : ""}`}
                      aria-pressed={choices.buttress === val}
                      onClick={() => updateChoices({ buttress: val })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {level.controls.riseRatio && (
              <div className="sliders" style={{ marginTop: 14 }}>
                <Slider
                  label="📐 拱高跨度比"
                  value={choices.riseRatio}
                  min={0.2}
                  max={0.8}
                  step={0.02}
                  color={ACCENT}
                  format={fixed(2, "h/S")}
                  onChange={(val) => updateChoices({ riseRatio: val })}
                />
              </div>
            )}

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={removeCenteringTest}>
                🪵 撤走木脚手架承重！
              </button>
              {centeringRemoved && !evalRes.stable && (
                <button type="button" className="pill-btn" onClick={() => setCenteringRemoved(false)}>
                  🔧 重新支起木架
                </button>
              )}
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 工匠秘籍
              </button>
            </div>
          </div>

          {centeringRemoved && !evalRes.stable && wonStars === 0 && <DadSays text={evalRes.reason} />}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict="木架撤除，石拱纹丝不动！"
              dadLine={level.win}
              note={evalRes.reason}
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

export const arch: GameModule = { meta, Play: ArchGame };
