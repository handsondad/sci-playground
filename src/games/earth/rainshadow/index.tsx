import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import { checkRainGoal, computeFoehn, rainLevels } from "./logic.ts";

const ACCENT = "#0ea5e9";

function elevToY(meters: number): number {
  const clamped = Math.max(0, Math.min(3700, meters));
  return 244 - (clamped / 3700) * 188;
}

function RainshadowGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(rainLevels[0].id);
  const starMap = useGameStars("rainshadow");
  const level = rainLevels.find((l) => l.id === levelId) ?? rainLevels[0];

  const [dewC, setDewC] = useState(level.startDewC);
  const [peakM, setPeakM] = useState(level.startPeakM);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) {
      say(dad(`第${level.id}关，${level.title}。${level.story}`), nian(level.nianLine));
    }
  }, [level.id]);

  function load(id: number) {
    const next = rainLevels.find((l) => l.id === id) ?? rainLevels[0];
    setLevelId(next.id);
    setDewC(next.startDewC);
    setPeakM(next.startPeakM);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  const stats = computeFoehn(level.seaTempC, dewC, peakM);
  const onGoal = checkRainGoal(level, level.seaTempC, dewC, peakM);

  function verifyClimate() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (onGoal) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("rainshadow", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
      say(
        dad(
          `当前迎风坡年雨量 ${stats.windwardRainMm} 毫米，背风坡山脚气温 ${stats.leeTempC.toFixed(1)} 度、残余水汽 ${stats.basinMoisturePct}%，再调调滑块！`
        )
      );
    }
  }

  const peakY = elevToY(peakM);
  const lclY = elevToY(stats.lclMeters);
  const next = rainLevels.find((l) => l.id > level.id);

  // Biome color on leeward basin
  const leeGroundColor =
    stats.basinMoisturePct <= 30
      ? "#eab308"
      : stats.basinMoisturePct >= 50
        ? "#4ade80"
        : "#a3e635";

  return (
    <div className="page">
      <TopBar
        emoji="🌧️"
        title="迎风坡与焚风 · 绝热升降温"
        onBack={exit}
        backLabel="地球地理馆"
        stars={sumStars(starMap)}
        maxStars={rainLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={rainLevels.map((l) => ({
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
        <div className="card" style={{ background: "#0b192c", borderColor: "#1e3a5f" }}>
          <svg
            viewBox="0 0 400 284"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`地形雨与焚风剖面：山高 ${peakM}m，迎风坡雨量 ${stats.windwardRainMm}mm，背风坡 ${stats.leeTempC.toFixed(1)}°C`}
          >
            <defs>
              <linearGradient id="rainSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e3a5f" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="400" height="284" rx="12" fill="url(#rainSky)" />

            {/* Elevation reference lines */}
            {[1000, 2000, 3000].map((m) => {
              const y = elevToY(m);
              return (
                <g key={m}>
                  <line
                    x1="68"
                    y1={y}
                    x2="390"
                    y2={y}
                    stroke="rgba(148, 163, 184, 0.16)"
                    strokeDasharray="3 4"
                  />
                  <text x="356" y={y - 3} fontSize="8" fill="#94a3b8">
                    {m}m
                  </text>
                </g>
              );
            })}

            {/* Lifting Condensation Level (LCL) line */}
            {stats.lclMeters <= 3500 && (
              <g>
                <line
                  x1="12"
                  y1={lclY}
                  x2="212"
                  y2={lclY}
                  stroke="#38bdf8"
                  strokeWidth="1.4"
                  strokeDasharray="5 3"
                />
                <text x="12" y={lclY - 5} fontSize="8.5" fontWeight="700" fill="#7dd3fc">
                  ☁️ 凝结高度 LCL {stats.lclMeters}m（露点 {dewC}°C）
                </text>
              </g>
            )}

            {/* Ocean on the far left */}
            <rect x="0" y="244" width="84" height="40" fill="#0284c7" />
            <text x="8" y="262" fontSize="9.5" fontWeight="800" fill="#e0f2fe">
              🌊 暖湿海洋
            </text>
            <text x="12" y="276" fontSize="9" fill="#bae6fd">
              海风 {level.seaTempC.toFixed(0)}°C
            </text>

            {/* Mountain Cross-Section */}
            <polygon
              points={`78,244 212,${peakY} 332,244 398,244 398,284 78,284`}
              fill="#475569"
            />
            {/* Windward lush green slope coating */}
            <line
              x1="78"
              y1="244"
              x2="212"
              y2={peakY}
              stroke={stats.hasRain ? "#22c55e" : "#84cc16"}
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Leeward slope & basin ground coating */}
            <polyline
              points={`212,${peakY} 332,244 396,244`}
              fill="none"
              stroke={leeGroundColor}
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Snow cap if freezing */}
            {stats.peakTempC <= 2 && (
              <polygon
                points={`194,${peakY + 24} 212,${peakY} 230,${peakY + 24} 218,${peakY + 20} 206,${peakY + 22}`}
                fill="#f8fafc"
              />
            )}

            {/* Windward Clouds & Orographic Rain */}
            {stats.hasRain && (
              <g>
                <ellipse
                  cx="154"
                  cy={Math.min(lclY - 10, (lclY + peakY) / 2)}
                  rx="36"
                  ry="14"
                  fill="#cbd5e1"
                />
                <ellipse
                  cx="178"
                  cy={Math.max(peakY + 6, (lclY + peakY) / 2 - 12)}
                  rx="28"
                  ry="12"
                  fill="#94a3b8"
                />
                {[136, 150, 164, 178, 190].map((rx, idx) => {
                  const topY = Math.min(lclY - 2, (lclY + peakY) / 2 + 6);
                  return (
                    <line
                      key={rx}
                      x1={rx}
                      y1={topY + (idx % 2) * 5}
                      x2={rx - 4}
                      y2={topY + 18 + (idx % 2) * 5}
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  );
                })}
                {/* Windward trees */}
                <text x="122" y="218" fontSize="14">
                  🌲🌳
                </text>
              </g>
            )}

            {/* Airflow Arrows: Windward climb + Leeward Foehn descent */}
            <path
              d={`M 32,232 Q 96,228 196,${peakY - 10}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="3"
              strokeDasharray={stats.hasRain ? "none" : "5 3"}
            />
            <path
              d={`M 224,${peakY - 8} Q 290,${(peakY + 230) / 2} 352,228`}
              fill="none"
              stroke={stats.foehnDeltaC >= 6 ? "#ef4444" : "#fbbf24"}
              strokeWidth="3.2"
            />
            <polygon
              points="350,222 360,230 347,233"
              fill={stats.foehnDeltaC >= 6 ? "#ef4444" : "#fbbf24"}
            />

            {/* Leeward biome icons */}
            <text x="338" y="239" fontSize="14">
              {stats.basinMoisturePct <= 30 ? "🌵🐪" : stats.basinMoisturePct >= 52 ? "🏡🌿💧" : "🌾"}
            </text>

            {/* Peak & Leeward Temperature Badges */}
            <text
              x="218"
              y={Math.max(16, peakY - 12)}
              fontSize="9.5"
              fontWeight="800"
              fill="#f8fafc"
            >
              ⛰️ {peakM}m ({stats.peakTempC.toFixed(1)}°C)
            </text>

            <rect x="284" y="250" width="110" height="28" rx="6" fill="rgba(15, 23, 42, 0.82)" />
            <text
              x="292"
              y="268"
              fontSize="10"
              fontWeight="800"
              fill={stats.leeTempC >= 27 ? "#fca5a5" : "#fde68a"}
            >
              🌡️ 背风坡 {stats.leeTempC.toFixed(1)}°C
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>迎风坡年雨量</small>
                <strong style={{ color: stats.hasRain ? "#0284c7" : "#94a3b8" }}>
                  {stats.windwardRainMm} mm
                </strong>
              </div>
              <div className="readout-box">
                <small>背风山脚气温</small>
                <strong style={{ color: stats.leeTempC >= 27 ? "#dc2626" : "#d97706" }}>
                  {stats.leeTempC.toFixed(1)} °C
                </strong>
              </div>
              <div className="readout-box">
                <small>过境盆地水汽</small>
                <strong style={{ color: stats.basinMoisturePct >= 52 ? "#16a34a" : "#b45309" }}>
                  {stats.basinMoisturePct}%
                </strong>
              </div>
            </div>

            <p className="note" style={{ margin: "10px 0 4px", fontWeight: 700 }}>
              🎯 本关目标：{level.goalLabel}
            </p>

            <div className="sliders" style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <Slider
                label="💧 海洋露点"
                value={dewC}
                min={6}
                max={17}
                step={1}
                color="#0ea5e9"
                format={fixed(0, "°C")}
                onChange={setDewC}
              />
              <Slider
                label="⛰️ 山峰海拔"
                value={peakM}
                min={500}
                max={3500}
                step={100}
                color="#f59e0b"
                format={fixed(0, "m")}
                onChange={setPeakM}
              />
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn is-blue" onClick={verifyClimate}>
                🌧️ 观测山脉气流！
              </button>
              <button
                type="button"
                className="pill-btn"
                onClick={() => setShowHint(true)}
                disabled={showHint}
              >
                💡 绝热算式
              </button>
            </div>
          </div>

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`迎风 ${stats.windwardRainMm}mm · 背风 ${stats.leeTempC.toFixed(1)}°C（+${stats.foehnDeltaC.toFixed(1)}°C）！`}
              dadLine={level.win}
              note="绝热铁律：未饱和空气每百米 ±1.0°C，成云降雨释放潜热每百米仅降 0.6°C！"
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

export const rainshadow: GameModule = {
  meta: {
    id: "rainshadow",
    title: "迎风坡与焚风",
    category: "earth",
    emoji: "🌧️",
    tag: "地形雨 · 绝热升降温",
    blurb: "调节海洋水汽露点与山脉海拔，看迎风坡凝结地形雨、背风坡下沉吹出干热焚风与雨影荒漠。",
    maxStars: rainLevels.length * 3
  },
  Play: RainshadowGame
};
