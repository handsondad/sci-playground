import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, degrees } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  checkEclipseGoal,
  classifyEclipse,
  eclipseLabel,
  eclipseLevels,
  eclipticLatitudeDeg,
  type DistanceMode
} from "./logic.ts";

const ACCENT = "#3d5a99";
const EX = 136;
const EY = 146;

function EclipseGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(eclipseLevels[0].id);
  const starMap = useGameStars("eclipse");
  const level = eclipseLevels.find((l) => l.id === levelId) ?? eclipseLevels[0];

  const [angle, setAngle] = useState(level.startAngle);
  const [tilt, setTilt] = useState(level.lockTilt ?? level.startTilt);
  const [distance, setDistance] = useState<DistanceMode>(level.startDistance);
  const [nodeAngle, setNodeAngle] = useState(level.startNodeAngle);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = eclipseLevels.find((l) => l.id === id) ?? eclipseLevels[0];
    setLevelId(next.id);
    setAngle(next.startAngle);
    setTilt(next.lockTilt ?? next.startTilt);
    setDistance(next.startDistance);
    setNodeAngle(next.startNodeAngle);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  const effectiveTilt = level.lockTilt ?? tilt;
  const kind = classifyEclipse(angle, effectiveTilt, distance, nodeAngle);
  const betaDeg = eclipticLatitudeDeg(angle, effectiveTilt, nodeAngle);

  // Orbit geometry (0 deg points LEFT toward Sun at x = 0, 180 deg points RIGHT into Earth's shadow)
  const orbitR = distance === "perigee" ? 58 : 74;
  const moonRad = Math.PI - (angle * Math.PI) / 180;
  const mx = EX + Math.cos(moonRad) * orbitR;
  const my = EY + Math.sin(moonRad) * orbitR;

  const nodeRad = Math.PI - (nodeAngle * Math.PI) / 180;
  const nx1 = EX + Math.cos(nodeRad) * (orbitR + 10);
  const ny1 = EY + Math.sin(nodeRad) * (orbitR + 10);
  const nx2 = EX - Math.cos(nodeRad) * (orbitR + 10);
  const ny2 = EY - Math.sin(nodeRad) * (orbitR + 10);

  function captureEclipse() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkEclipseGoal(level, angle, effectiveTilt, distance, nodeAngle)) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("eclipse", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const next = eclipseLevels.find((l) => l.id > level.id);

  // Sky observer viewport center (right panel)
  const skyX = 338;
  const skyY = 148;
  const isNearNewMoon = angle <= 35 || angle >= 325;
  const skyMoonOffsetY = betaDeg * 5.2;
  const skyMoonOffsetX = isNearNewMoon
    ? (((angle + 180) % 360) - 180) * 1.4
    : ((angle - 180) * 1.3);

  return (
    <div className="page">
      <TopBar
        emoji="🌑"
        title="日食与月食 · 本影伪本影与食季"
        onBack={exit}
        backLabel="天文宇宙馆"
        stars={sumStars(starMap)}
        maxStars={eclipseLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={eclipseLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#070b17", borderColor: "#2b3a67" }}>
          <svg
            viewBox="0 0 420 294"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`日月食双视窗：${eclipseLabel(kind)}`}
          >
            <rect x="0" y="0" width="420" height="294" rx="12" fill="#050812" />

            {/* ================= LEFT PANEL: ORBIT & SHADOW CONES ================= */}
            <rect x="8" y="32" width="246" height="230" rx="10" fill="#091022" stroke="#1e293b" />

            {/* Sun glow & parallel rays from left */}
            <circle cx="-12" cy={EY} r="36" fill="rgba(251, 191, 36, 0.35)" />
            <circle cx="-14" cy={EY} r="24" fill="#fbbf24" />
            {[-48, -24, 0, 24, 48].map((dy, i) => (
              <line
                key={i}
                x1="12"
                y1={EY + dy}
                x2="62"
                y2={EY + dy}
                stroke="rgba(253, 224, 71, 0.4)"
                strokeWidth="1.4"
                strokeDasharray="4 4"
              />
            ))}

            {/* Earth's Umbra & Penumbra Cone to the right */}
            <polygon
              points={`${EX},${EY - 16} 250,${EY - 32} 250,${EY + 32} ${EX},${EY + 16}`}
              fill="rgba(15, 23, 42, 0.55)"
            />
            <polygon
              points={`${EX},${EY - 15} 248,${EY - 4} 248,${EY + 4} ${EX},${EY + 15}`}
              fill="rgba(2, 6, 23, 0.88)"
            />
            {/* Red atmospheric refraction rim inside Earth's umbra */}
            <polygon
              points={`${EX + 14},${EY - 13} 236,${EY - 4} 236,${EY + 4} ${EX + 14},${EY + 13}`}
              fill="rgba(239, 68, 68, 0.16)"
            />

            {/* Lunar Orbit Ring */}
            <circle
              cx={EX}
              cy={EY}
              r={orbitR}
              fill="none"
              stroke="rgba(148, 163, 184, 0.35)"
              strokeWidth="1.4"
              strokeDasharray="4 4"
            />

            {/* Line of Nodes (when tilted) */}
            {effectiveTilt > 0 && (
              <g>
                <line
                  x1={nx1}
                  y1={ny1}
                  x2={nx2}
                  y2={ny2}
                  stroke="#34d399"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text x={nx1 - 5} y={ny1 - 4} fontSize="9.5" fill="#6ee7b7" fontWeight="800">
                  ☊
                </text>
                <text x={nx2 - 5} y={ny2 + 9} fontSize="9.5" fill="#6ee7b7" fontWeight="800">
                  ☋
                </text>
              </g>
            )}

            {/* Moon's Umbra / Antumbra Cone to the right of Moon */}
            {Math.abs(betaDeg) <= 2.2 && (
              <g>
                <polygon
                  points={`${mx},${my - 6.5} ${mx + 62},${my} ${mx},${my + 6.5}`}
                  fill="rgba(2, 6, 23, 0.9)"
                />
                {distance === "apogee" && (
                  <polygon
                    points={`${mx + 62},${my} ${mx + 84},${my - 4} ${mx + 84},${my + 4}`}
                    fill="rgba(251, 191, 36, 0.28)"
                  />
                )}
              </g>
            )}

            {/* Earth */}
            <circle cx={EX} cy={EY} r="16" fill="#2563eb" stroke="#93c5fd" strokeWidth="1.6" />
            <path
              d={`M ${EX - 7} ${EY - 8} Q ${EX + 4} ${EY - 10} ${EX + 6} ${EY - 1} Q ${EX - 2} ${EY + 7} ${EX - 7} ${EY - 8} Z`}
              fill="#4ade80"
              opacity="0.85"
            />

            {/* Moon */}
            <circle
              cx={mx}
              cy={my}
              r="6.5"
              fill={kind === "total-lunar" ? "#dc2626" : "#e2e8f0"}
              stroke="#fff"
              strokeWidth="1.2"
            />

            <text x="16" y="49" fontSize="9.5" fill="#fde047" fontWeight="700">
              ☀️ 阳光 → 0°朔(新月) · 180°望(满月)
            </text>
            <text x="16" y="253" fontSize="9.5" fill={Math.abs(betaDeg) <= 1.4 ? "#86efac" : "#fca5a5"}>
              黄纬偏离 β = {betaDeg >= 0 ? "+" : ""}{betaDeg.toFixed(1)}° {Math.abs(betaDeg) <= 1.4 ? "(正中交点!)" : "(偏出阴影平面)"}
            </text>

            {/* ================= RIGHT PANEL: SKY TELESCOPE VIEW ================= */}
            <rect x="262" y="32" width="150" height="230" rx="10" fill="#070c18" stroke="#334155" />
            <text x={skyX} y="52" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#cbd5e1">
              🔭 地面仰望天空实景
            </text>

            {kind === "total-solar" && (
              <g transform={`translate(${skyX}, ${skyY})`}>
                {/* Pearly Solar Corona */}
                <circle cx="0" cy="0" r="46" fill="rgba(226, 232, 240, 0.14)" />
                {Array.from({ length: 12 }, (_, idx) => {
                  const deg = idx * 30;
                  return (
                    <ellipse
                      key={idx}
                      cx="0"
                      cy="0"
                      rx="48"
                      ry="10"
                      fill="rgba(248, 250, 252, 0.16)"
                      transform={`rotate(${deg})`}
                    />
                  );
                })}
                <circle cx="0" cy="0" r="29" fill="none" stroke="#f8fafc" strokeWidth="2.5" />
                <circle cx="0" cy="0" r="28" fill="#020617" />
                {/* Diamond Ring Glint */}
                <circle cx="-20" cy="-19" r="5.5" fill="#fff" />
                <circle cx="-20" cy="-19" r="11" fill="rgba(254, 240, 138, 0.45)" />
                <text x="0" y="76" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fef08a">
                  珍珠日冕 · 钻石环！
                </text>
              </g>
            )}

            {kind === "annular-solar" && (
              <g transform={`translate(${skyX}, ${skyY})`}>
                <circle cx="0" cy="0" r="36" fill="rgba(251, 191, 36, 0.28)" />
                <circle cx="0" cy="0" r="29" fill="#fbbf24" stroke="#fef08a" strokeWidth="2" />
                {/* Smaller apogee moon leaves bright golden ring */}
                <circle cx="0" cy="0" r="23.5" fill="#050812" />
                <text x="0" y="76" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fbbf24">
                  💍 金边火环日环食！
                </text>
              </g>
            )}

            {kind === "partial-solar" && (
              <g transform={`translate(${skyX}, ${skyY})`}>
                <circle cx="0" cy="0" r="28" fill="#fbbf24" />
                <circle cx={skyMoonOffsetX * 0.9} cy={skyMoonOffsetY} r="26" fill="#070c18" />
                <text x="0" y="76" textAnchor="middle" fontSize="10.5" fill="#fde68a">
                  🌘 日偏食
                </text>
              </g>
            )}

            {kind === "total-lunar" && (
              <g transform={`translate(${skyX}, ${skyY})`}>
                <circle cx="0" cy="0" r="44" fill="none" stroke="rgba(239, 68, 68, 0.35)" strokeDasharray="3 3" />
                <circle cx="0" cy="0" r="26" fill="#b91c1c" stroke="#f87171" strokeWidth="2" />
                <circle cx="-7" cy="-6" r="6" fill="rgba(127, 29, 29, 0.55)" />
                <circle cx="8" cy="7" r="8" fill="rgba(127, 29, 29, 0.45)" />
                <text x="0" y="76" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fca5a5">
                  🌕 古铜红月亮（月全食）
                </text>
              </g>
            )}

            {kind === "partial-lunar" && (
              <g transform={`translate(${skyX}, ${skyY})`}>
                <circle cx="0" cy="0" r="25" fill="#f1f5f9" />
                <circle cx={-skyMoonOffsetX} cy={-skyMoonOffsetY} r="36" fill="rgba(15, 23, 42, 0.84)" />
                <text x="0" y="76" textAnchor="middle" fontSize="10.5" fill="#cbd5e1">
                  🌗 月偏食
                </text>
              </g>
            )}

            {kind === "none" && (
              <g transform={`translate(${skyX}, ${skyY})`}>
                {isNearNewMoon ? (
                  <>
                    <circle cx="0" cy="0" r="27" fill="#fbbf24" />
                    <circle
                      cx={Math.max(-42, Math.min(42, skyMoonOffsetX))}
                      cy={skyMoonOffsetY * 6.2}
                      r="24"
                      fill="rgba(148, 163, 184, 0.18)"
                      stroke="#94a3b8"
                      strokeDasharray="3 3"
                    />
                    <text x="0" y="76" textAnchor="middle" fontSize="10" fill="#94a3b8">
                      新月从太阳{betaDeg >= 0 ? "上方" : "下方"}擦过
                    </text>
                  </>
                ) : (
                  <>
                    <circle cx="0" cy="0" r="25" fill="#e2e8f0" />
                    <text x="0" y="76" textAnchor="middle" fontSize="10" fill="#94a3b8">
                      寻常月夜（未入地影）
                    </text>
                  </>
                )}
              </g>
            )}

            <text x="14" y="21" fontSize="11.5" fontWeight="800" fill="#f8fafc">
              {eclipseLabel(kind)}
            </text>
            <text x="14" y="282" fontSize="10" fill="#94a3b8">
              月球方位：{angle}° · 白道倾角：{effectiveTilt}° · 距离：{distance === "perigee" ? "近地点 36万km" : "远地点 40.5万km"}
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>当前天象</small>
                <strong style={{ color: kind === "none" ? "#64748b" : "#2563eb", fontSize: "1.05rem" }}>
                  {kind === "total-solar"
                    ? "🌑 日全食"
                    : kind === "annular-solar"
                      ? "💍 日环食"
                      : kind === "total-lunar"
                        ? "🌕 月全食"
                        : kind === "none"
                          ? "✨ 无食象"
                          : "🌘 偏食"}
                </strong>
              </div>
              <div className="readout-box">
                <small>黄纬高度差 β</small>
                <strong style={{ color: Math.abs(betaDeg) <= 1.2 ? "#16a34a" : "#d97706" }}>
                  {Math.abs(betaDeg).toFixed(1)}°
                </strong>
              </div>
            </div>

            <div className="sliders" style={{ marginTop: 12 }}>
              <Slider
                label="🌙 月球公转"
                value={angle}
                min={0}
                max={355}
                step={5}
                wrap
                color={ACCENT}
                format={degrees}
                onChange={setAngle}
              />
              {level.showNodeControl && (
                <Slider
                  label="☊ 交点方向"
                  value={nodeAngle}
                  min={0}
                  max={180}
                  step={15}
                  color="#10b981"
                  format={degrees}
                  onChange={setNodeAngle}
                />
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <small style={{ fontWeight: 700, color: "#5d4e37" }}>📏 月地椭圆轨道距离：</small>
              <div className="play-actions" style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className={`pill-btn${distance === "perigee" ? " is-active" : ""}`}
                  onClick={() => setDistance("perigee")}
                >
                  📍 近地点 36万km（视面大）
                </button>
                <button
                  type="button"
                  className={`pill-btn${distance === "apogee" ? " is-active" : ""}`}
                  onClick={() => setDistance("apogee")}
                >
                  🔭 远地点 40.5万km（视面小）
                </button>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <small style={{ fontWeight: 700, color: "#5d4e37" }}>📐 白道与黄道倾角：</small>
              <div className="play-actions" style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className={`pill-btn${effectiveTilt === 0 ? " is-active" : ""}`}
                  disabled={level.lockTilt !== undefined}
                  onClick={() => setTilt(0)}
                >
                  0° 理想共面
                </button>
                <button
                  type="button"
                  className={`pill-btn${effectiveTilt === 5 ? " is-active" : ""}`}
                  disabled={level.lockTilt !== undefined}
                  onClick={() => setTilt(5)}
                >
                  5° 真实白道倾角{level.lockTilt !== undefined ? "（本关锁定）" : ""}
                </button>
              </div>
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn is-blue" onClick={captureEclipse}>
                📸 按下天文快门！
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 观星台提示
              </button>
            </div>
          </div>

          {tries > 0 && wonStars === 0 && (
            <NianSays
              text={
                Math.abs(betaDeg) > 1.5
                  ? `看右边的望远镜！因为轨道倾角偏离了 ${Math.abs(betaDeg).toFixed(1)}°，月亮和影子上下错开啦！${level.showNodeControl ? "快转动『☊ 交点方向』对准 0° 或 180° 太阳方向吧！" : "先把白道倾角调成 0° 共面试试！"}`
                  : `现在拍到的是「${eclipseLabel(kind)}」，再核对一下月球角度（0°日食 / 180°月食）和近远地点设置吧！`
              }
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`成功捕捉：${eclipseLabel(kind)}`}
              dadLine={level.win}
              note={`天文参数：公转角 ${angle}° · 倾角 ${effectiveTilt}° · 交点 ${nodeAngle}° · ${distance === "perigee" ? "近地点本影" : "远地点伪本影"}`}
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

export const eclipse: GameModule = {
  meta: {
    id: "eclipse",
    title: "日食与月食",
    category: "astro",
    emoji: "🌑",
    tag: "本影伪本影 · 白道倾角",
    blurb: "同时操控月球公转、近远地点与 5° 白道交点线，亲眼见证钻石环日全食、金边日环食与古铜红月亮！",
    maxStars: eclipseLevels.length * 3
  },
  Play: EclipseGame
};
