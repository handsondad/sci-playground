import { useEffect, useRef, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { INNER_PLANETS, keplerLevels, matchesOrbit, periodDays, periodYears } from "./logic.ts";

const ACCENT = "#3d5a99";
const CX = 180;
const CY = 142;
const PX_PER_AU = 56;

function KeplerGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(keplerLevels[0].id);
  const starMap = useGameStars("kepler");
  const level = keplerLevels.find((l) => l.id === levelId) ?? keplerLevels[0];

  const [au, setAu] = useState(level.startAu);
  const [simYears, setSimYears] = useState(0);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  useEffect(() => {
    let raf = 0;
    const tick = (ts: number) => {
      if (lastRef.current !== null) {
        const dt = (ts - lastRef.current) / 1000;
        // 1 Earth year every 4.5 real seconds
        setSimYears((prev) => prev + dt / 4.5);
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
    const next = keplerLevels.find((l) => l.id === id) ?? keplerLevels[0];
    setLevelId(next.id);
    setAu(next.startAu);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  const years = periodYears(au);
  const days = periodDays(au);
  const probeAngle = -((simYears / years) * Math.PI * 2);
  const probeR = au * PX_PER_AU;
  const probeX = CX + Math.cos(probeAngle) * probeR;
  const probeY = CY + Math.sin(probeAngle) * probeR;

  function lockOrbit() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (matchesOrbit(au, level.targetYears, level.tolYears)) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("kepler", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const next = keplerLevels.find((l) => l.id > level.id);
  const onTarget = matchesOrbit(au, level.targetYears, level.tolYears);

  return (
    <div className="page">
      <TopBar
        emoji="🪐"
        title="行星赛跑 · 开普勒第三定律"
        onBack={exit}
        backLabel="天文馆"
        stars={sumStars(starMap)}
        maxStars={keplerLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={keplerLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#090d1a", borderColor: "#2b3a67" }}>
          <svg
            viewBox="0 0 360 284"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`太阳系俯视轨道，探测器半径 ${au.toFixed(2)} AU，周期 ${years.toFixed(2)} 年`}
          >
            <rect x="0" y="0" width="360" height="284" rx="12" fill="#070b17" />

            {/* Reference Planets */}
            {INNER_PLANETS.map((p, idx) => {
              const r = p.au * PX_PER_AU;
              const pYears = periodYears(p.au);
              const ang = -((simYears / pYears) * Math.PI * 2);
              const px = CX + Math.cos(ang) * r;
              const py = CY + Math.sin(ang) * r;
              const labelY = idx % 2 === 0 ? CY - 5 : CY + 12;
              return (
                <g key={p.name}>
                  <circle
                    cx={CX}
                    cy={CY}
                    r={r}
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.22)"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  <circle cx={px} cy={py} r={p.radiusPx} fill={p.color} />
                  <text x={CX + r + 2} y={labelY} fontSize="8.5" fill="rgba(203, 213, 225, 0.78)">
                    {p.name}
                  </text>
                </g>
              );
            })}

            {/* Player Probe Orbit */}
            <circle
              cx={CX}
              cy={CY}
              r={probeR}
              fill="none"
              stroke={onTarget ? "#4ade80" : "#fbbf24"}
              strokeWidth="2.4"
            />
            <circle cx={probeX} cy={probeY} r="7" fill={onTarget ? "#4ade80" : "#fbbf24"} stroke="#fff" strokeWidth="1.8" />
            <text x={probeX + 9} y={probeY + 4} fontSize="10" fontWeight="800" fill="#fef08a">
              🛰️
            </text>

            {/* Blazing Sun */}
            <circle cx={CX} cy={CY} r="17" fill="rgba(251, 191, 36, 0.25)" />
            <circle cx={CX} cy={CY} r="11" fill="#fbbf24" stroke="#fef08a" strokeWidth="2" />

            <text x="14" y="22" fontSize="11" fill="#cbd5e1" fontWeight="700">
              ☀️ 1 AU = 日地平均距离（约 1.5 亿千米）
            </text>
            <text x="14" y="272" fontSize="10.5" fill="#94a3b8">
              验证公式：a³ = {(au * au * au).toFixed(2)}，T² = {(years * years).toFixed(2)}
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>探测器公转周期</small>
                <strong style={{ color: onTarget ? "#16a34a" : "#d97706" }}>
                  {years.toFixed(2)} 年（{days} 天）
                </strong>
              </div>
              <div className="readout-box">
                <small>🎯 目标周期</small>
                <strong>
                  {level.targetYears.toFixed(2)} 年（{Math.round(level.targetYears * 365.25)} 天）
                </strong>
              </div>
            </div>

            <div className="sliders" style={{ marginTop: 14 }}>
              <Slider
                label="🛰️ 轨道半径"
                value={au}
                min={0.3}
                max={2.2}
                step={0.02}
                color="#f59e0b"
                format={fixed(2, "AU")}
                onChange={setAu}
              />
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={lockOrbit}>
                🛰️ 点火锁定轨道！
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 开普勒算式
              </button>
            </div>
          </div>

          {tries > 0 && wonStars === 0 && (
            <DadSays
              text={`现在转一圈要 ${years.toFixed(2)} 年，比目标 ${level.targetYears.toFixed(2)} 年${years > level.targetYears ? "慢了，往太阳靠近一点" : "快了，往外圈推远一点"}试试！`}
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`泊入 ${au.toFixed(2)} AU 目标轨道！`}
              dadLine={level.win}
              note={`开普勒检验：a³ = ${(au ** 3).toFixed(2)} ≈ T² = ${(years ** 2).toFixed(2)}`}
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

export const kepler: GameModule = {
  meta: {
    id: "kepler",
    title: "行星赛跑",
    category: "astro",
    emoji: "🪐",
    tag: "开普勒第三定律",
    blurb: "调节太阳帆探测器的轨道半径，跟水星、地球、火星同台赛跑，亲手验证 T² = a³。",
    maxStars: keplerLevels.length * 3
  },
  Play: KeplerGame
};
