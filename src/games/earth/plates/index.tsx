import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  MOTION_META,
  PLATE_META,
  checkPlateGoal,
  plateLevels,
  simulateBoundary,
  type MantleMotion,
  type PlateType
} from "./logic.ts";

const ACCENT = "#0ea5e9";

function PlatesGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(plateLevels[0].id);
  const starMap = useGameStars("plates");
  const level = plateLevels.find((l) => l.id === levelId) ?? plateLevels[0];

  const [leftPlate, setLeftPlate] = useState<PlateType>(level.startLeft);
  const [rightPlate, setRightPlate] = useState<PlateType>(level.startRight);
  const [motion, setMotion] = useState<MantleMotion>(level.startMotion);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) {
      say(dad(`第${level.id}关，${level.title}。${level.story}`), nian(level.nianLine));
    }
  }, [level.id]);

  function load(id: number) {
    const next = plateLevels.find((l) => l.id === id) ?? plateLevels[0];
    setLevelId(next.id);
    setLeftPlate(next.startLeft);
    setRightPlate(next.startRight);
    setMotion(next.startMotion);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  const sim = simulateBoundary(leftPlate, rightPlate, motion);
  const onGoal = checkPlateGoal(level, leftPlate, rightPlate, motion);

  function triggerTectonics() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (onGoal) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("plates", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
      say(dad(`当前形成的是${sim.landform}，和本关目标地貌还不一样，再调调板块或地幔运动方向吧！`));
    }
  }

  const next = plateLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🌋"
        title="板块构造局 · 大陆漂移与造山"
        onBack={exit}
        backLabel="地球地理馆"
        stars={sumStars(starMap)}
        maxStars={plateLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={plateLevels.map((l) => ({
          id: l.id,
          title: l.title,
          stars: starMap[String(l.id)] ?? 0
        }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />
      <NianSays text={level.nianLine} />

      <div className="workbench">
        <div className="card" style={{ background: "#0c1526", borderColor: "#334155" }}>
          <svg
            viewBox="0 0 400 288"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`岩石圈与软流层地幔剖面：${sim.landform}`}
          >
            <defs>
              <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#7dd3fc" />
              </linearGradient>
              <linearGradient id="mantleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="55%" stopColor="#b91c1c" />
                <stop offset="100%" stopColor="#7f1d1d" />
              </linearGradient>
            </defs>

            {/* Sky */}
            <rect x="0" y="0" width="400" height="128" fill="url(#skyGrad)" />

            {/* Ocean water layer where oceanic plates sit */}
            {leftPlate === "oceanic" && (
              <rect x="0" y="96" width="205" height="36" fill="rgba(2, 132, 199, 0.78)" />
            )}
            {rightPlate === "oceanic" && (
              <rect x="195" y="96" width="205" height="36" fill="rgba(2, 132, 199, 0.78)" />
            )}

            {/* Asthenosphere Mantle */}
            <rect x="0" y="168" width="400" height="120" fill="url(#mantleGrad)" />

            {/* Left Plate Crust + Lithosphere */}
            {sim.subduction === "left-under-right" ? (
              <path
                d="M 0,126 L 176,130 L 278,224 L 258,242 L 166,154 L 0,154 Z"
                fill="#334155"
                stroke="#1e293b"
                strokeWidth="2"
              />
            ) : (
              <rect
                x="0"
                y={leftPlate === "continental" ? 86 : 126}
                width={motion === "divergent" ? 182 : 198}
                height={leftPlate === "continental" ? 82 : 34}
                fill={leftPlate === "continental" ? "#b45309" : "#334155"}
                stroke="#1e293b"
                strokeWidth="2"
              />
            )}

            {/* Right Plate Crust + Lithosphere */}
            {sim.subduction === "right-under-left" ? (
              <path
                d="M 400,126 L 224,130 L 122,224 L 142,242 L 234,154 L 400,154 Z"
                fill="#334155"
                stroke="#1e293b"
                strokeWidth="2"
              />
            ) : (
              <rect
                x={motion === "divergent" ? 218 : 202}
                y={rightPlate === "continental" ? 86 : 126}
                width={motion === "divergent" ? 182 : 198}
                height={rightPlate === "continental" ? 82 : 34}
                fill={rightPlate === "continental" ? "#b45309" : "#334155"}
                stroke="#1e293b"
                strokeWidth="2"
              />
            )}

            {/* Continental green surface cap */}
            {leftPlate === "continental" && (
              <rect
                x="0"
                y="82"
                width={motion === "divergent" ? 182 : 198}
                height="8"
                fill="#22c55e"
              />
            )}
            {rightPlate === "continental" && (
              <rect
                x={motion === "divergent" ? 218 : 202}
                y="82"
                width={motion === "divergent" ? 182 : 198}
                height="8"
                fill="#22c55e"
              />
            )}

            {/* Case A: Himalaya Folded Mountain Range (Continental + Continental + Convergent) */}
            {motion === "convergent" && leftPlate === "continental" && rightPlate === "continental" && (
              <g>
                <polygon
                  points="126,86 164,46 184,62 204,24 228,58 248,40 280,86"
                  fill="#92400e"
                  stroke="#78350f"
                  strokeWidth="2"
                />
                {/* Snow caps */}
                <polygon points="189,52 204,24 219,48 209,52 201,46" fill="#f8fafc" />
                <polygon points="154,57 164,46 174,56" fill="#f8fafc" />
                <polygon points="239,52 248,40 258,53" fill="#f8fafc" />
                {/* Folded strata arcs */}
                <path
                  d="M 150,122 Q 204,76 256,122"
                  fill="none"
                  stroke="#fde68a"
                  strokeWidth="2.2"
                  strokeDasharray="4 2"
                />
                <text x="164" y="18" fontSize="10" fontWeight="800" fill="#fef08a">
                  🏔️ 珠穆朗玛褶皱峰 8849m
                </text>
              </g>
            )}

            {/* Case B: Trench + Magma Plumes + Volcanic Arc (Subduction) */}
            {sim.subduction !== "none" && (
              <g>
                {/* Deep V-shaped Ocean Trench */}
                <polygon
                  points={
                    sim.subduction === "left-under-right"
                      ? "172,126 202,162 214,126"
                      : "186,126 198,162 228,126"
                  }
                  fill="#082f49"
                />
                <text
                  x={sim.subduction === "left-under-right" ? 142 : 186}
                  y="118"
                  fontSize="9"
                  fontWeight="800"
                  fill="#bae6fd"
                >
                  🌊 万米深海沟
                </text>

                {/* Rising magma blobs + Volcano Arc on overriding plate */}
                {sim.subduction === "left-under-right" ? (
                  <g>
                    <circle cx="258" cy="182" r="5" fill="#fef08a" />
                    <circle cx="264" cy="148" r="4.5" fill="#fb923c" />
                    <polygon points="244,86 268,42 292,86" fill="#57534e" />
                    <polygon points="262,52 268,42 274,52" fill="#ef4444" />
                    <circle cx="270" cy="30" r="7" fill="rgba(226, 232, 240, 0.75)" />
                    <circle cx="280" cy="22" r="9" fill="rgba(226, 232, 240, 0.55)" />
                    <text x="234" y="18" fontSize="9.5" fontWeight="800" fill="#fed7aa">
                      🌋 陆缘火山弧
                    </text>
                  </g>
                ) : (
                  <g>
                    <circle cx="142" cy="182" r="5" fill="#fef08a" />
                    <circle cx="136" cy="148" r="4.5" fill="#fb923c" />
                    <polygon points="108,86 132,42 156,86" fill="#57534e" />
                    <polygon points="126,52 132,42 138,52" fill="#ef4444" />
                    <circle cx="130" cy="30" r="7" fill="rgba(226, 232, 240, 0.75)" />
                    <text x="96" y="18" fontSize="9.5" fontWeight="800" fill="#fed7aa">
                      🌋 陆缘火山弧
                    </text>
                  </g>
                )}
              </g>
            )}

            {/* Case C: Divergent Mid-Ocean Ridge or Continental Rift */}
            {motion === "divergent" && (
              <g>
                <polygon points="168,160 194,110 200,122 206,110 232,160" fill="#475569" />
                <polygon points="193,168 200,114 207,168" fill="#fbbf24" />
                <circle cx="200" cy="112" r="5" fill="#ef4444" />
                <text x="142" y="88" fontSize="9.5" fontWeight="800" fill="#fef08a">
                  {leftPlate === "oceanic" && rightPlate === "oceanic"
                    ? "🌊 海底洋中脊新洋壳"
                    : "⚡ 张裂大裂谷与岩浆上涌"}
                </text>
              </g>
            )}

            {/* Case D: Transform Strike-Slip Fault + Shallow Quake Rings */}
            {motion === "transform" && (
              <g>
                <line
                  x1="200"
                  y1="80"
                  x2="200"
                  y2="170"
                  stroke="#fde047"
                  strokeWidth="3"
                  strokeDasharray="5 3"
                />
                {/* Seismic concentric rings */}
                <circle cx="200" cy="122" r="14" fill="none" stroke="#fde047" strokeWidth="2" />
                <circle
                  cx="200"
                  cy="122"
                  r="28"
                  fill="none"
                  stroke="rgba(253, 224, 71, 0.55)"
                  strokeWidth="1.6"
                />
                {/* Offset road/fence markers */}
                <line x1="145" y1="96" x2="198" y2="96" stroke="#f8fafc" strokeWidth="3" />
                <line x1="202" y1="112" x2="255" y2="112" stroke="#f8fafc" strokeWidth="3" />
                <text x="134" y="68" fontSize="10" fontWeight="800" fill="#fef08a">
                  ⚡ 走滑错动断层（浅源强震 · 无火山）
                </text>
              </g>
            )}

            {/* Plate labels */}
            <text x="14" y="146" fontSize="9.5" fontWeight="700" fill="#f8fafc">
              左：{PLATE_META[leftPlate].label}
            </text>
            <text x="266" y="146" fontSize="9.5" fontWeight="700" fill="#f8fafc">
              右：{PLATE_META[rightPlate].label}
            </text>

            {/* Asthenosphere Mantle Convection Arrows */}
            <text x="128" y="276" fontSize="10" fontWeight="700" fill="#fed7aa">
              🔥 软流层地幔热对流（{MOTION_META[motion].label}）
            </text>
            {motion === "divergent" && (
              <g stroke="#fde047" strokeWidth="2.6" fill="none">
                <path d="M 190,248 L 190,196 L 116,196" />
                <polygon points="116,191 106,196 116,201" fill="#fde047" stroke="none" />
                <path d="M 210,248 L 210,196 L 284,196" />
                <polygon points="284,191 294,196 284,201" fill="#fde047" stroke="none" />
              </g>
            )}
            {motion === "convergent" && (
              <g stroke="#fde047" strokeWidth="2.6" fill="none">
                <path d="M 106,196 L 180,196 L 180,248" />
                <polygon points="175,191 185,196 175,201" fill="#fde047" stroke="none" />
                <path d="M 294,196 L 220,196 L 220,248" />
                <polygon points="225,191 215,196 225,201" fill="#fde047" stroke="none" />
              </g>
            )}
            {motion === "transform" && (
              <g fill="#fde047" fontSize="16" fontWeight="800">
                <text x="148" y="226">
                  ↗ 水平擦肩错动 ↙
                </text>
              </g>
            )}
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>生成边界地貌</small>
                <strong style={{ fontSize: "0.98rem", color: onGoal ? "#16a34a" : "#0369a1" }}>
                  {sim.landform}
                </strong>
              </div>
              <div className="readout-box">
                <small>地震与火山活动</small>
                <strong style={{ fontSize: "0.92rem" }}>{sim.quakeDepth}</strong>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <div>
                <small style={{ fontWeight: 700, color: "#64748b" }}>① 左侧板块岩石圈</small>
                <div className="play-actions" style={{ margin: "6px 0 0" }}>
                  {(["continental", "oceanic"] as const).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      className={`pill-btn${leftPlate === pt ? " is-active" : ""}`}
                      aria-pressed={leftPlate === pt}
                      onClick={() => setLeftPlate(pt)}
                    >
                      {PLATE_META[pt].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <small style={{ fontWeight: 700, color: "#64748b" }}>② 右侧板块岩石圈</small>
                <div className="play-actions" style={{ margin: "6px 0 0" }}>
                  {(["continental", "oceanic"] as const).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      className={`pill-btn${rightPlate === pt ? " is-active" : ""}`}
                      aria-pressed={rightPlate === pt}
                      onClick={() => setRightPlate(pt)}
                    >
                      {PLATE_META[pt].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <small style={{ fontWeight: 700, color: "#64748b" }}>③ 软流层地幔运动方式</small>
                <div className="play-actions" style={{ margin: "6px 0 0" }}>
                  {(["divergent", "convergent", "transform"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`pill-btn${motion === m ? " is-active" : ""}`}
                      aria-pressed={motion === m}
                      onClick={() => setMotion(m)}
                    >
                      {MOTION_META[m].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn is-blue" onClick={triggerTectonics}>
                🌋 启动板块推演！
              </button>
              <button
                type="button"
                className="pill-btn"
                onClick={() => setShowHint(true)}
                disabled={showHint}
              >
                💡 板块秘籍
              </button>
            </div>
          </div>

          <div className="banner" style={{ margin: 0 }}>
            <strong>🔬 实时地质解说：</strong> {sim.summary}
          </div>

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`成功塑造：${sim.landform}！`}
              dadLine={level.win}
              note={`海拔特征：${sim.elevationLabel} · ${PLATE_META[leftPlate].density} vs ${PLATE_META[rightPlate].density}`}
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

export const plates: GameModule = {
  meta: {
    id: "plates",
    title: "板块构造局",
    category: "earth",
    emoji: "🌋",
    tag: "大陆漂移 · 海沟与造山",
    blurb: "调配大陆花岗岩与大洋玄武岩板块的碰撞、张裂与走滑，亲手隆起喜马拉雅与马里亚纳海沟。",
    maxStars: plateLevels.length * 3
  },
  Play: PlatesGame
};
