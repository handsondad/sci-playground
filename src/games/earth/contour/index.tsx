import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  canalSliceInfo,
  checkContourChoice,
  contourLevels,
  slopePercent
} from "./logic.ts";

const ACCENT = "#0ea5e9";

const TWIN_PEAK_PROFILE = [100, 210, 410, 520, 385, 300, 365, 430, 310, 195, 100];

function elevToProfileY(elev: number): number {
  const clamped = Math.max(80, Math.min(550, elev));
  return 316 - ((clamped - 80) / 470) * 96;
}

function ContourGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(contourLevels[0].id);
  const starMap = useGameStars("contour");
  const level = contourLevels.find((l) => l.id === levelId) ?? contourLevels[0];

  const [selectedId, setSelectedId] = useState<string>(level.options[0]?.id ?? "");
  const [sliceElev, setSliceElev] = useState<number>(level.startElev);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);
  const [lastFeedback, setLastFeedback] = useState("");

  useEffect(() => {
    if (sound) {
      say(dad(`第${level.id}关，${level.title}。${level.story}`), nian(level.nianLine));
    }
  }, [level.id]);

  function load(id: number) {
    const next = contourLevels.find((l) => l.id === id) ?? contourLevels[0];
    setLevelId(next.id);
    setSelectedId(next.options[0]?.id ?? "");
    setSliceElev(next.startElev);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
    setLastFeedback("");
  }

  const activeOpt = level.options.find((o) => o.id === selectedId) ?? level.options[0];
  const currentSlope = activeOpt
    ? slopePercent(activeOpt.riseMeters, activeOpt.runMeters)
    : slopePercent(20, 400);
  const sliceInfo = canalSliceInfo(sliceElev);

  function verifyChoice() {
    const nextTries = tries + 1;
    setTries(nextTries);
    const ok =
      level.mode === "slice"
        ? checkContourChoice(level, sliceElev, sliceElev)
        : checkContourChoice(level, selectedId);

    if (ok) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("contour", String(level.id), raw);
      setLastFeedback("");
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else {
      const fb =
        level.mode === "slice"
          ? sliceElev > level.targetElev
            ? `现在切在 ${sliceElev}m，比 300m 鞍部高，水渠断成了东西两个孤立圈！往下调低一点试试。`
            : `现在切在 ${sliceElev}m，比 300m 鞍部太低，绕山脚太远啦！往上调高到鞍部附近试试。`
          : (activeOpt?.feedback ?? "再仔细看看等高线的疏密与弯曲方向吧！");
      setLastFeedback(fb);
      if (sound) {
        chime(false);
        say(dad(fb));
      }
    }
  }

  const profileSamples =
    level.mode === "slice" ? TWIN_PEAK_PROFILE : (activeOpt?.profile ?? TWIN_PEAK_PROFILE);

  const profilePoints = profileSamples
    .map((elev, idx) => {
      const x = 44 + (idx / (profileSamples.length - 1)) * 332;
      const y = elevToProfileY(elev);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const profileArea = `44,316 ${profilePoints} 376,316`;
  const next = contourLevels.find((l) => l.id > level.id);
  const onSliceTarget = level.mode === "slice" && checkContourChoice(level, sliceElev, sliceElev);

  // Dynamic contour loop scale for level 4 canal preview
  const canalFactor = Math.max(0.22, Math.min(1, (520 - sliceElev) / 420));

  return (
    <div className="page">
      <TopBar
        emoji="🗺️"
        title="等高线登山 · 地形判读"
        onBack={exit}
        backLabel="地球地理馆"
        stars={sumStars(starMap)}
        maxStars={contourLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={contourLevels.map((l) => ({
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
        <div className="card" style={{ background: "#f4faf6", borderColor: "#bae6fd" }}>
          <svg
            viewBox="0 0 400 332"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label="上方等高线地形俯视图与下方同步海拔侧面剖面图"
          >
            {/* Top half: Topographic Contour Map */}
            <rect x="0" y="0" width="400" height="194" rx="12" fill="#eef8ec" />
            <text x="12" y="18" fontSize="10.5" fontWeight="700" fill="#1e3a5f">
              🧭 等高线俯视图（等高距 100m · 西陡崖 / 东缓坡 / 双峰夹鞍部）
            </text>

            {/* 100m outer contour */}
            <path
              d="M 48,98 C 48,40 135,24 215,34 C 295,44 382,56 384,102 C 382,150 298,176 222,166 C 216,144 206,144 198,168 C 122,182 48,154 48,98 Z"
              fill="#dcfce7"
              stroke="#65a30d"
              strokeWidth="1.4"
            />
            <text x="352" y="142" fontSize="8.5" fill="#3f6212" fontWeight="700">
              100m
            </text>

            {/* 200m contour (bunched on west cliff x≈54, valley V-bend pointing upslope around x=208) */}
            <path
              d="M 53,98 C 53,48 136,36 212,48 C 282,58 348,68 350,102 C 348,138 286,158 224,148 C 215,126 205,126 196,150 C 126,164 53,144 53,98 Z"
              fill="#bbf7d0"
              stroke="#4d7c0f"
              strokeWidth="1.4"
            />
            <text x="320" y="130" fontSize="8.5" fill="#365314" fontWeight="700">
              200m
            </text>

            {/* 300m figure-8 saddle contour */}
            <path
              d="M 57,98 C 57,57 128,48 188,68 C 206,76 222,76 242,66 C 284,52 316,74 316,102 C 316,128 282,142 242,130 C 222,120 208,112 190,130 C 132,150 57,136 57,98 Z"
              fill="#fef9c3"
              stroke="#a16207"
              strokeWidth="1.5"
            />
            <text x="292" y="119" fontSize="8.5" fill="#854d0e" fontWeight="700">
              300m
            </text>

            {/* 400m West Main Peak & East Secondary Peak separate rings */}
            <path
              d="M 61,98 C 61,67 110,58 158,72 C 184,80 188,114 158,124 C 112,136 61,126 61,98 Z"
              fill="#fed7aa"
              stroke="#c2410c"
              strokeWidth="1.5"
            />
            <text x="160" y="84" fontSize="8" fill="#9a3412" fontWeight="700">
              400m
            </text>

            <ellipse
              cx="272"
              cy="99"
              rx="24"
              ry="18"
              fill="#fed7aa"
              stroke="#c2410c"
              strokeWidth="1.5"
            />
            <text x="260" y="103" fontSize="8" fill="#9a3412" fontWeight="700">
              ▲430
            </text>

            {/* 500m West Main Peak inner ring */}
            <ellipse
              cx="118"
              cy="98"
              rx="28"
              ry="16"
              fill="#fecaca"
              stroke="#b91c1c"
              strokeWidth="1.6"
            />
            <text x="103" y="102" fontSize="8.5" fill="#7f1d1d" fontWeight="800">
              ▲520m
            </text>

            {/* Cliff hachure teeth on West side where 200/300/400m converge */}
            {[80, 90, 100, 110, 120].map((y) => (
              <line key={y} x1="56" y1={y} x2="47" y2={y - 2} stroke="#7f1d1d" strokeWidth="1.8" />
            ))}
            <text x="14" y="103" fontSize="8.5" fill="#991b1b" fontWeight="700">
              陡崖
            </text>

            {/* Level 1: 3 Hiking Routes */}
            {level.mode === "route" && (
              <g>
                <path
                  d="M 38,98 L 114,98"
                  fill="none"
                  stroke={selectedId === "west" ? "#ef4444" : "#64748b"}
                  strokeWidth={selectedId === "west" ? 3.5 : 2}
                  strokeDasharray="4 3"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedId("west")}
                />
                <path
                  d="M 128,32 Q 124,65 118,95"
                  fill="none"
                  stroke={selectedId === "north" ? "#f59e0b" : "#64748b"}
                  strokeWidth={selectedId === "north" ? 3.5 : 2}
                  strokeDasharray="4 3"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedId("north")}
                />
                <path
                  d="M 378,102 Q 260,98 124,98"
                  fill="none"
                  stroke={selectedId === "east" ? "#0ea5e9" : "#475569"}
                  strokeWidth={selectedId === "east" ? 3.8 : 2.2}
                  strokeDasharray="5 3"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedId("east")}
                />
                <text x="122" y="30" fontSize="9" fontWeight="700" fill="#1e293b">
                  北线
                </text>
                <text x="342" y="94" fontSize="9" fontWeight="800" fill="#0369a1">
                  东线缓坡
                </text>
              </g>
            )}

            {/* Level 2: 3 Candidate Camp Pins */}
            {level.mode === "camp" && (
              <g>
                {[
                  { id: "peakA", x: 118, y: 96, tag: "甲·峰顶" },
                  { id: "saddle", x: 214, y: 98, tag: "乙·鞍部" },
                  { id: "cliffFoot", x: 42, y: 112, tag: "丙·崖底" }
                ].map((pt) => {
                  const active = selectedId === pt.id;
                  return (
                    <g
                      key={pt.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedId(pt.id)}
                    >
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={active ? 9 : 6.5}
                        fill={active ? "#0ea5e9" : "#ffffff"}
                        stroke="#0f172a"
                        strokeWidth="2"
                      />
                      <text
                        x={pt.x - 16}
                        y={pt.y - 11}
                        fontSize="8.5"
                        fontWeight="800"
                        fill={active ? "#0369a1" : "#334155"}
                      >
                        {pt.tag}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Level 3: 3 Ridge vs Valley lines */}
            {level.mode === "valley" && (
              <g>
                <path
                  d="M 145,122 L 152,176"
                  fill="none"
                  stroke={selectedId === "ridgeA" ? "#f59e0b" : "#64748b"}
                  strokeWidth={selectedId === "ridgeA" ? 3.6 : 2}
                  strokeDasharray="4 2"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedId("ridgeA")}
                />
                <text x="128" y="186" fontSize="8.5" fontWeight="700" fill="#475569">
                  甲线
                </text>

                <path
                  d="M 210,108 L 210,182"
                  fill="none"
                  stroke={selectedId === "valleyB" ? "#0284c7" : "#64748b"}
                  strokeWidth={selectedId === "valleyB" ? 3.8 : 2.2}
                  strokeDasharray="4 2"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedId("valleyB")}
                />
                <text x="198" y="188" fontSize="8.5" fontWeight="800" fill="#0369a1">
                  乙线(凸向高)
                </text>

                <path
                  d="M 294,112 L 336,164"
                  fill="none"
                  stroke={selectedId === "ridgeC" ? "#f59e0b" : "#64748b"}
                  strokeWidth={selectedId === "ridgeC" ? 3.6 : 2}
                  strokeDasharray="4 2"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedId("ridgeC")}
                />
                <text x="322" y="176" fontSize="8.5" fontWeight="700" fill="#475569">
                  丙线
                </text>
              </g>
            )}

            {/* Level 4: Highlighted Contour Canal Ring */}
            {level.mode === "slice" && (
              <g>
                {sliceElev <= 320 ? (
                  <ellipse
                    cx="204"
                    cy="99"
                    rx={68 + canalFactor * 105}
                    ry={24 + canalFactor * 44}
                    fill="none"
                    stroke={onSliceTarget ? "#16a34a" : "#0284c7"}
                    strokeWidth="3.2"
                    strokeDasharray="6 3"
                  />
                ) : (
                  <g>
                    <ellipse
                      cx="118"
                      cy="98"
                      rx={22 + canalFactor * 44}
                      ry={14 + canalFactor * 22}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.8"
                      strokeDasharray="5 3"
                    />
                    {sliceElev <= 430 && (
                      <ellipse
                        cx="272"
                        cy="99"
                        rx={Math.max(8, (440 - sliceElev) * 0.22)}
                        ry={Math.max(6, (440 - sliceElev) * 0.16)}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2.8"
                        strokeDasharray="5 3"
                      />
                    )}
                  </g>
                )}
              </g>
            )}

            {/* Divider */}
            <line x1="8" y1="198" x2="392" y2="198" stroke="#cbd5e1" strokeWidth="1.5" />

            {/* Bottom half: Synchronized Side-Elevation Profile */}
            <rect x="0" y="202" width="400" height="130" rx="10" fill="#0f172a" />
            <text x="12" y="218" fontSize="10" fontWeight="700" fill="#e2e8f0">
              📐 同步侧面海拔剖面图（高程 100m ~ 520m）
            </text>

            {[100, 200, 300, 400, 500].map((h) => {
              const y = elevToProfileY(h);
              return (
                <g key={h}>
                  <line
                    x1="40"
                    y1={y}
                    x2="380"
                    y2={y}
                    stroke="rgba(148, 163, 184, 0.22)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text x="10" y={y + 3} fontSize="8" fill="#94a3b8">
                    {h}m
                  </text>
                </g>
              );
            })}

            <polygon points={profileArea} fill="rgba(56, 189, 248, 0.24)" />
            <polyline
              points={profilePoints}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />

            {level.mode === "slice" && (
              <g>
                {/* Target 300m saddle line */}
                <line
                  x1="40"
                  y1={elevToProfileY(level.targetElev)}
                  x2="380"
                  y2={elevToProfileY(level.targetElev)}
                  stroke="#4ade80"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                {/* Player slice line */}
                <line
                  x1="40"
                  y1={elevToProfileY(sliceElev)}
                  x2="380"
                  y2={elevToProfileY(sliceElev)}
                  stroke={onSliceTarget ? "#4ade80" : "#fbbf24"}
                  strokeWidth="2.8"
                />
                <text
                  x="252"
                  y={elevToProfileY(sliceElev) - 5}
                  fontSize="9"
                  fontWeight="700"
                  fill={onSliceTarget ? "#86efac" : "#fde047"}
                >
                  盘山渠 {sliceElev}m
                </text>
              </g>
            )}
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            {level.mode !== "slice" ? (
              <>
                <div className="readout-grid">
                  <div className="readout-box">
                    <small>当前选中地形</small>
                    <strong style={{ fontSize: "1.02rem", color: "#0369a1" }}>
                      {activeOpt?.featureTag}
                    </strong>
                  </div>
                  <div className="readout-box">
                    <small>平均坡度</small>
                    <strong style={{ color: currentSlope > 70 ? "#dc2626" : "#16a34a" }}>
                      {currentSlope.toFixed(1)}%
                    </strong>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                  {level.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`pill-btn${selectedId === opt.id ? " is-active" : ""}`}
                      aria-pressed={selectedId === opt.id}
                      style={{ justifyContent: "space-between", padding: "9px 14px" }}
                      onClick={() => setSelectedId(opt.id)}
                    >
                      <span>{opt.label}</span>
                      <small style={{ color: "#64748b" }}>
                        坡度 {slopePercent(opt.riseMeters, opt.runMeters)}%
                      </small>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="readout-grid">
                  <div className="readout-box">
                    <small>水渠切割高程</small>
                    <strong style={{ color: onSliceTarget ? "#16a34a" : "#0284c7" }}>
                      {sliceElev} m
                    </strong>
                  </div>
                  <div className="readout-box">
                    <small>断面连通状态</small>
                    <strong style={{ fontSize: "0.95rem" }}>{sliceInfo.statusLabel}</strong>
                  </div>
                </div>

                <div className="sliders" style={{ marginTop: 14 }}>
                  <Slider
                    label="💧 水渠海拔"
                    value={sliceElev}
                    min={120}
                    max={480}
                    step={20}
                    color={ACCENT}
                    format={fixed(0, "m")}
                    onChange={setSliceElev}
                  />
                </div>
              </>
            )}

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn is-blue" onClick={verifyChoice}>
                🧭 确认地形方案！
              </button>
              <button
                type="button"
                className="pill-btn"
                onClick={() => setShowHint(true)}
                disabled={showHint}
              >
                💡 读图口诀
              </button>
            </div>
          </div>

          {lastFeedback && wonStars === 0 && <DadSays text={lastFeedback} />}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict="等高线判读满分过关！"
              dadLine={level.win}
              note="读图三宝：疏缓密陡看坡度，双峰之间找鞍部，凸高为谷有山溪！"
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

export const contour: GameModule = {
  meta: {
    id: "contour",
    title: "等高线登山",
    category: "earth",
    emoji: "🗺️",
    tag: "地形判读 · 缓坡陡崖",
    blurb: "对照俯视等高线图与实时侧面海拔剖面，辨认缓坡陡崖、双峰鞍部与山谷溪流。",
    maxStars: contourLevels.length * 3
  },
  Play: ContourGame
};
