import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, degrees, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { checkEavesGoal, eavesLevels } from "./logic.ts";

const ACCENT = "#b45309";
const PX_PER_M = 52;
const WALL_X = 216;
const EAVE_Y = 82;

type ViewSeason = "both" | "summer" | "winter";

function EavesGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(eavesLevels[0].id);
  const starMap = useGameStars("eaves");
  const level = eavesLevels.find((l) => l.id === levelId) ?? eavesLevels[0];

  const [eaveMeters, setEaveMeters] = useState(level.startEaveMeters);
  const [louverDeg, setLouverDeg] = useState(level.startLouverDeg ?? 65);
  const [viewSeason, setViewSeason] = useState<ViewSeason>("both");
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);
  const [testedFail, setTestedFail] = useState(false);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = eavesLevels.find((l) => l.id === id) ?? eavesLevels[0];
    setLevelId(next.id);
    setEaveMeters(next.startEaveMeters);
    setLouverDeg(next.startLouverDeg ?? 65);
    setViewSeason("both");
    setTries(0);
    setShowHint(false);
    setWonStars(0);
    setTestedFail(false);
  }

  const check = checkEavesGoal(level, eaveMeters, louverDeg);

  function verifySolarHouse() {
    const nextTries = tries + 1;
    setTries(nextTries);
    const res = checkEavesGoal(level, eaveMeters, louverDeg);
    if (res.passed) {
      let stars = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) stars = Math.min(stars, 2);
      setWonStars(stars);
      setTestedFail(false);
      recordStars("eaves", String(level.id), stars);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else {
      setTestedFail(true);
      if (sound) chime(false);
    }
  }

  // Room & window geometry in SVG coordinates (South is to the RIGHT)
  const roomLeftX = 44;
  const floorY = EAVE_Y + (level.windowTopDrop + level.windowHeight + 0.15) * PX_PER_M;
  const winTopY = EAVE_Y + level.windowTopDrop * PX_PER_M;
  const winBotY = winTopY + level.windowHeight * PX_PER_M;
  const eaveTipX = WALL_X + eaveMeters * PX_PER_M;

  // Ray shadow intersection on south wall (and floor inside room)
  const tanSum = Math.tan((level.summerAngleDeg * Math.PI) / 180);
  const tanWin = Math.tan((level.winterAngleDeg * Math.PI) / 180);

  const sumWallShadowY = EAVE_Y + eaveMeters * tanSum * PX_PER_M;
  const winWallShadowY = EAVE_Y + eaveMeters * tanWin * PX_PER_M;

  // Indoor floor sunlight penetration x-range (rays enter between max(winTopY, shadowY) and winBotY)
  function indoorSunPolygon(tanAngle: number, wallShadowY: number): string | null {
    const topEnterY = Math.max(winTopY, wallShadowY);
    if (topEnterY >= winBotY - 0.5) return null;
    // Ray from (WALL_X, y) going left-down with slope dy/dx = -tanAngle => x_floor = WALL_X - (floorY - y) / tanAngle
    const xDeep = Math.max(roomLeftX + 6, WALL_X - (floorY - topEnterY) / tanAngle);
    const xNear = Math.max(roomLeftX + 6, WALL_X - (floorY - winBotY) / tanAngle);
    return `${WALL_X},${topEnterY} ${WALL_X},${winBotY} ${xNear},${floorY} ${xDeep},${floorY}`;
  }

  const summerBeamPoly = indoorSunPolygon(tanSum, sumWallShadowY);
  const winterBeamPoly = indoorSunPolygon(tanWin, winWallShadowY);

  const next = eavesLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🏯"
        title="冬暖夏凉挑檐 · 太阳高度角"
        onBack={exit}
        backLabel="建筑结构馆"
        stars={sumStars(starMap)}
        maxStars={eavesLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={eavesLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}>
          <svg
            viewBox="0 0 360 286"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`${level.city} 建筑剖面图，挑檐 ${eaveMeters.toFixed(2)} 米，夏至遮阴 ${check.summerShadePct}%，冬至进光 ${check.winterSunPct}%`}
          >
            <rect x="0" y="0" width="360" height="286" rx="12" fill="#e0f2fe" />

            {/* Ground */}
            <rect x="0" y={floorY} width="360" height={286 - floorY} fill="#d6d3d1" />

            {/* Room interior */}
            <rect
              x={roomLeftX}
              y={EAVE_Y}
              width={WALL_X - roomLeftX}
              height={floorY - EAVE_Y}
              fill="#fffbeb"
              stroke="#78350f"
              strokeWidth="3"
            />

            {/* Indoor wooden floor & cozy tea table */}
            <line x1={roomLeftX} y1={floorY} x2={WALL_X} y2={floorY} stroke="#92400e" strokeWidth="5" />
            <rect x={roomLeftX + 36} y={floorY - 18} width="46" height="6" rx="2" fill="#b45309" />
            <line x1={roomLeftX + 44} y1={floorY - 12} x2={roomLeftX + 44} y2={floorY} stroke="#78350f" strokeWidth="3" />
            <line x1={roomLeftX + 74} y1={floorY - 12} x2={roomLeftX + 74} y2={floorY} stroke="#78350f" strokeWidth="3" />

            {/* Winter warm sunbeam entering room */}
            {(viewSeason === "both" || viewSeason === "winter") && winterBeamPoly && (
              <polygon points={winterBeamPoly} fill="rgba(249, 115, 22, 0.32)" />
            )}

            {/* Summer harsh sunbeam leaking into room */}
            {(viewSeason === "both" || viewSeason === "summer") && summerBeamPoly && (
              <polygon points={summerBeamPoly} fill="rgba(239, 68, 68, 0.36)" />
            )}

            {/* Optional roof skylight & shading louvers (Level 4) */}
            {level.hasSkylight && (
              <g>
                <rect x="104" y={EAVE_Y - 10} width="54" height="12" fill="#bae6fd" stroke="#0284c7" strokeWidth="1.5" />
                {[112, 126, 140, 152].map((lx) => {
                  const tiltRad = ((90 - louverDeg) * Math.PI) / 180;
                  const dx = Math.sin(tiltRad) * 7;
                  const dy = Math.cos(tiltRad) * 7;
                  return (
                    <line
                      key={lx}
                      x1={lx - dx}
                      y1={EAVE_Y - 5 - dy}
                      x2={lx + dx}
                      y2={EAVE_Y - 5 + dy}
                      stroke="#78350f"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  );
                })}
                {check.skylightWinterPct > 0 && (viewSeason === "both" || viewSeason === "winter") && (
                  <polygon
                    points={`110,${EAVE_Y + 2} 154,${EAVE_Y + 2} 122,${floorY - 2} 78,${floorY - 2}`}
                    fill={`rgba(251, 146, 60, ${0.08 + (check.skylightWinterPct / 100) * 0.22})`}
                  />
                )}
                {check.skylightSummerPct > 0 && (viewSeason === "both" || viewSeason === "summer") && (
                  <polygon
                    points={`110,${EAVE_Y + 2} 154,${EAVE_Y + 2} 142,${floorY - 2} 98,${floorY - 2}`}
                    fill="rgba(239, 68, 68, 0.3)"
                  />
                )}
              </g>
            )}

            {/* Traditional pitched timber roof + adjustable south eave overhang */}
            <polygon
              points={
                level.hasSkylight
                  ? `${roomLeftX - 10},${EAVE_Y} 102,${EAVE_Y - 12} 102,${EAVE_Y} `
                  : `${roomLeftX - 10},${EAVE_Y} 130,38 ${eaveTipX},${EAVE_Y}`
              }
              fill="#78350f"
              stroke="#451a03"
              strokeWidth="2"
            />
            {level.hasSkylight && (
              <polygon
                points={`158,${EAVE_Y - 12} ${eaveTipX},${EAVE_Y} 158,${EAVE_Y}`}
                fill="#78350f"
                stroke="#451a03"
                strokeWidth="2"
              />
            )}
            {/* Horizontal eave beam */}
            <rect x={WALL_X - 2} y={EAVE_Y - 6} width={eaveMeters * PX_PER_M + 4} height="8" rx="3" fill="#b45309" />

            {/* South window glass pane */}
            <line
              x1={WALL_X}
              y1={winTopY}
              x2={WALL_X}
              y2={winBotY}
              stroke="#38bdf8"
              strokeWidth="5.5"
            />

            {/* Exterior eave tip shadow rays */}
            {(viewSeason === "both" || viewSeason === "summer") && (
              <g>
                <line
                  x1={eaveTipX + 26 / tanSum}
                  y1={EAVE_Y - 26}
                  x2={WALL_X}
                  y2={Math.min(floorY + 24, sumWallShadowY)}
                  stroke="#eab308"
                  strokeWidth="2.2"
                  strokeDasharray="5 3"
                />
                <text x="278" y="32" fontSize="10" fontWeight="800" fill="#ca8a04">
                  ☀️ 夏至 {level.summerAngleDeg}°
                </text>
              </g>
            )}

            {(viewSeason === "both" || viewSeason === "winter") && (
              <g>
                <line
                  x1="354"
                  y1={EAVE_Y - (354 - eaveTipX) * tanWin}
                  x2={WALL_X}
                  y2={Math.min(floorY, winWallShadowY)}
                  stroke="#ea580c"
                  strokeWidth="2.2"
                  strokeDasharray="5 3"
                />
                <text x="282" y="136" fontSize="10" fontWeight="800" fill="#c2410c">
                  🌞 冬至 {level.winterAngleDeg}°
                </text>
              </g>
            )}

            {/* Eave dimension label */}
            <text x={(WALL_X + eaveTipX) * 0.5} y={EAVE_Y + 16} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#78350f">
              挑檐 {eaveMeters.toFixed(2)}m
            </text>

            <text x="12" y="20" fontSize="10.5" fontWeight="700" fill="#334155">
              🧭 {level.city}（左北 · 右南向采光窗）
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>🌻 夏至南窗遮阴率</small>
                <strong style={{ color: check.summerOk ? "#16a34a" : "#dc2626" }}>
                  {check.summerShadePct}%
                </strong>
              </div>
              <div className="readout-box">
                <small>❄️ 冬至南窗进光率</small>
                <strong style={{ color: check.winterOk ? "#16a34a" : "#d97706" }}>
                  {check.winterSunPct}%{level.minWinterSunPct > 0 ? `（目标≥${level.minWinterSunPct}%）` : ""}
                </strong>
              </div>
              {level.hasSkylight && (
                <div className="readout-box">
                  <small>🪟 天窗夏晒 / 冬暖</small>
                  <strong style={{ color: check.skylightOk ? "#16a34a" : "#dc2626" }}>
                    {check.skylightSummerPct}% / {check.skylightWinterPct}%
                  </strong>
                </div>
              )}
            </div>

            <div className="play-actions" style={{ marginTop: 10, marginBottom: 4 }}>
              {(
                [
                  ["both", "🌗 冬夏同看"],
                  ["summer", "🌻 单看夏至"],
                  ["winter", "❄️ 单看冬至"]
                ] as readonly [ViewSeason, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`pill-btn${viewSeason === mode ? " is-active" : ""}`}
                  aria-pressed={viewSeason === mode}
                  onClick={() => setViewSeason(mode)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="sliders" style={{ marginTop: 12 }}>
              <Slider
                label="🏯 挑檐长度"
                value={eaveMeters}
                min={0.2}
                max={2.0}
                step={0.05}
                color={ACCENT}
                format={fixed(2, "m")}
                onChange={(val) => {
                  setTestedFail(false);
                  setEaveMeters(val);
                }}
              />

              {level.hasSkylight && (
                <Slider
                  label="🪟 百叶遮阳角"
                  value={louverDeg}
                  min={35}
                  max={85}
                  step={1}
                  color="#0284c7"
                  format={degrees}
                  onChange={(val) => {
                    setTestedFail(false);
                    setLouverDeg(val);
                  }}
                />
              )}
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={verifySolarHouse}>
                🌞 四季日照验收！
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 营造法式公式
              </button>
            </div>
          </div>

          {testedFail && wonStars === 0 && (
            <DadSays
              text={
                !check.summerOk
                  ? `夏至正午还有 ${check.summerSunPct}% 烈日晒进南窗啦！把屋檐再往南探出一点点挡住高角度夏阳！`
                  : !check.winterOk
                    ? `屋檐伸太长（${eaveMeters.toFixed(2)}m），把冬至暖阳挡得只剩 ${check.winterSunPct}%（需要 ≥ ${level.minWinterSunPct}%）！往回收短一点吧！`
                    : `南窗已经完美达标，但屋顶天窗${check.skylightSummerPct > 0 ? "夏天还漏进烈日" : "冬天百叶关太死没暖阳"}，调一下百叶遮阳角试试！`
              }
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`挑檐 ${eaveMeters.toFixed(2)}m：夏遮 ${check.summerShadePct}% · 冬暖 ${check.winterSunPct}%！`}
              dadLine={level.win}
              note={`正切阴影公式：夏至影深 ${(eaveMeters * tanSum).toFixed(2)} m，冬至影深 ${(eaveMeters * tanWin).toFixed(2)} m`}
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

export const eaves: GameModule = {
  meta: {
    id: "eaves",
    title: "冬暖夏凉挑檐",
    category: "architecture",
    emoji: "🏯",
    tag: "被动式建筑 · 太阳高度角",
    blurb: "顺应冬至与夏至正午太阳高度角之差，算出恰到好处的挑檐深度，零空调实现夏天遮烈日、冬天满屋暖阳！",
    maxStars: 12
  },
  Play: EavesGame
};
