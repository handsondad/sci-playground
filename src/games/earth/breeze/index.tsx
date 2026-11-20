import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import { breezeLevels, checkBreezeGoal, circulationState } from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#0ea5e9";

function BreezeGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(breezeLevels[0].id);
  const starMap = useGameStars("breeze");
  const level = breezeLevels.find((l) => l.id === levelId) ?? breezeLevels[0];

  const [landTempC, setLandTempC] = useState(level.startLandC);
  const [chosenLandP, setChosenLandP] = useState<"L" | "H">(level.startLandPressure);
  const [chosenWind, setChosenWind] = useState<"sea-to-land" | "land-to-sea">(
    level.startSurfaceWind
  );
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) {
      say(dad(`第${level.id}关，${level.title}。${level.story}`), nian(level.nianLine));
    }
  }, [level.id]);

  function load(id: number) {
    const next = breezeLevels.find((l) => l.id === id) ?? breezeLevels[0];
    setLevelId(next.id);
    setLandTempC(next.startLandC);
    setChosenLandP(next.startLandPressure);
    setChosenWind(next.startSurfaceWind);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  const circ = circulationState(landTempC, level.seaTempC);
  const chosenSeaP: "L" | "H" = chosenLandP === "L" ? "H" : "L";
  const onGoal = checkBreezeGoal(level, landTempC, level.seaTempC, chosenLandP, chosenWind);

  function verifyBreeze() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (onGoal) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("breeze", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
      if (Math.abs(circ.deltaC) < level.minDeltaAbs) {
        say(dad("大陆和海洋的温差还不够明显！先拉动陆地温度滑块，让海陆冷热对比更鲜明吧！"));
      } else if (chosenLandP !== circ.landPressure) {
        say(dad("气压牌挂反啦！受热一侧空气膨胀上升变成低压 L，变冷一侧空气下沉变成高压 H 哦！"));
      } else {
        say(dad("风向标反啦！近地面的风永远从『高压 H』吹向『低压 L』！"));
      }
    }
  }

  const isNight = level.id === 2 || level.id === 4;
  const landLabel = level.scale === "coastal" ? "🏖️ 海岸沙滩" : "🏯 亚欧大陆内陆";
  const seaLabel = level.scale === "coastal" ? "🌊 近岸大海" : "🌏 浩瀚太平洋";
  const next = breezeLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🌬️"
        title="海陆风向标 · 比热容与季风"
        onBack={exit}
        backLabel="地球地理馆"
        stars={sumStars(starMap)}
        maxStars={breezeLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={breezeLevels.map((l) => ({
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
        <div className="card" style={{ background: isNight ? "#090f24" : "#e0f2fe", borderColor: "#7dd3fc" }}>
          <svg
            viewBox="0 0 400 288"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`海陆热力环流实验台：陆地 ${landTempC}°C，海洋 ${level.seaTempC}°C`}
          >
            <rect
              x="0"
              y="0"
              width="400"
              height="288"
              rx="12"
              fill={isNight ? "#0b132b" : "#bae6fd"}
            />

            {/* Header badge + Sun / Moon */}
            <text
              x="14"
              y="24"
              fontSize="10.5"
              fontWeight="800"
              fill={isNight ? "#e2e8f0" : "#0c4a6e"}
            >
              {level.timeBadge}
            </text>
            {isNight ? (
              <g>
                <circle cx="358" cy="30" r="13" fill="#fef08a" />
                <circle cx="364" cy="26" r="11" fill="#0b132b" />
                <text x="310" y="28" fontSize="10" fill="#cbd5e1">
                  ✦ ✧ ✦
                </text>
              </g>
            ) : (
              <g>
                <circle cx="358" cy="32" r="18" fill="rgba(251, 191, 36, 0.35)" />
                <circle cx="358" cy="32" r="12" fill="#f59e0b" />
              </g>
            )}

            {/* Upper Return Flow Arrow (Opposite of surface wind) */}
            <g>
              <line
                x1="126"
                y1="72"
                x2="274"
                y2="72"
                stroke={isNight ? "#94a3b8" : "#475569"}
                strokeWidth="2.2"
                strokeDasharray="5 4"
              />
              {chosenWind === "sea-to-land" ? (
                <polygon points="270,67 282,72 270,77" fill={isNight ? "#94a3b8" : "#475569"} />
              ) : (
                <polygon points="130,67 118,72 130,77" fill={isNight ? "#94a3b8" : "#475569"} />
              )}
              <text
                x="156"
                y="64"
                fontSize="9"
                fontWeight="700"
                fill={isNight ? "#cbd5e1" : "#334155"}
              >
                高空补偿回流
              </text>
            </g>

            {/* Clouds over whichever side is Low pressure (rising warm moist air!) */}
            {chosenLandP === "L" ? (
              <g>
                <ellipse cx="96" cy="58" rx="30" ry="11" fill="#f8fafc" />
                <ellipse cx="116" cy="54" rx="22" ry="10" fill="#e2e8f0" />
                {level.scale === "monsoon" && (
                  <text x="72" y="84" fontSize="11">
                    🌧️🌧️ 梅雨锋
                  </text>
                )}
              </g>
            ) : (
              <g>
                <ellipse cx="304" cy="58" rx="30" ry="11" fill="#f8fafc" />
                <ellipse cx="284" cy="54" rx="22" ry="10" fill="#e2e8f0" />
              </g>
            )}

            {/* Left Vertical Airflow (over Land) */}
            <g>
              <line
                x1="96"
                y1="86"
                x2="96"
                y2="178"
                stroke={chosenLandP === "L" ? "#ef4444" : "#3b82f6"}
                strokeWidth="3.4"
              />
              {chosenLandP === "L" ? (
                <polygon points="90,92 96,78 102,92" fill="#ef4444" />
              ) : (
                <polygon points="90,172 96,186 102,172" fill="#3b82f6" />
              )}
              <text
                x="44"
                y="136"
                fontSize="9.5"
                fontWeight="800"
                fill={chosenLandP === "L" ? "#ef4444" : "#60a5fa"}
              >
                {chosenLandP === "L" ? "↑ 受热上升" : "↓ 冷却下沉"}
              </text>
            </g>

            {/* Right Vertical Airflow (over Sea) */}
            <g>
              <line
                x1="304"
                y1="86"
                x2="304"
                y2="178"
                stroke={chosenSeaP === "L" ? "#ef4444" : "#3b82f6"}
                strokeWidth="3.4"
              />
              {chosenSeaP === "L" ? (
                <polygon points="298,92 304,78 310,92" fill="#ef4444" />
              ) : (
                <polygon points="298,172 304,186 310,172" fill="#3b82f6" />
              )}
              <text
                x="314"
                y="136"
                fontSize="9.5"
                fontWeight="800"
                fill={chosenSeaP === "L" ? "#ef4444" : "#60a5fa"}
              >
                {chosenSeaP === "L" ? "↑ 暖湿上升" : "↓ 清凉下沉"}
              </text>
            </g>

            {/* Chosen Pressure Badges at Surface */}
            <g>
              <circle
                cx="96"
                cy="198"
                r="16"
                fill={chosenLandP === "L" ? "#fee2e2" : "#dbeafe"}
                stroke={chosenLandP === "L" ? "#dc2626" : "#2563eb"}
                strokeWidth="2.5"
              />
              <text
                x="84"
                y="203"
                fontSize="12"
                fontWeight="800"
                fill={chosenLandP === "L" ? "#b91c1c" : "#1d4ed8"}
              >
                {chosenLandP === "L" ? "低压L" : "高压H"}
              </text>

              <circle
                cx="304"
                cy="198"
                r="16"
                fill={chosenSeaP === "L" ? "#fee2e2" : "#dbeafe"}
                stroke={chosenSeaP === "L" ? "#dc2626" : "#2563eb"}
                strokeWidth="2.5"
              />
              <text
                x="292"
                y="203"
                fontSize="12"
                fontWeight="800"
                fill={chosenSeaP === "L" ? "#b91c1c" : "#1d4ed8"}
              >
                {chosenSeaP === "L" ? "低压L" : "高压H"}
              </text>
            </g>

            {/* Surface Wind Vane Arrow */}
            <g>
              <line
                x1="128"
                y1="198"
                x2="272"
                y2="198"
                stroke={onGoal ? "#16a34a" : "#f59e0b"}
                strokeWidth="4.5"
              />
              {chosenWind === "sea-to-land" ? (
                <polygon
                  points="134,190 118,198 134,206"
                  fill={onGoal ? "#16a34a" : "#f59e0b"}
                />
              ) : (
                <polygon
                  points="266,190 282,198 266,206"
                  fill={onGoal ? "#16a34a" : "#f59e0b"}
                />
              )}
              <rect
                x="148"
                y="174"
                width="104"
                height="18"
                rx="9"
                fill="rgba(15, 23, 42, 0.8)"
              />
              <text x="158" y="186" fontSize="9.5" fontWeight="800" fill="#fef08a">
                {chosenWind === "sea-to-land"
                  ? level.scale === "coastal"
                    ? "⬅️ 清凉海风"
                    : "⬅️ 东南季风"
                  : level.scale === "coastal"
                    ? "陆风出海 ➡️"
                    : "西北季风 ➡️"}
              </text>
            </g>

            {/* Left Ground: Sand / Continent */}
            <path d="M 0,224 Q 95,214 202,232 L 202,288 L 0,288 Z" fill="#eab308" />
            <text x="14" y="250" fontSize="11" fontWeight="800" fill="#422006">
              {landLabel}：{landTempC}°C
            </text>
            <text x="14" y="268" fontSize="8.8" fill="#713f12" fontWeight="700">
              比热容小 (0.8) · 升温快降温快
            </text>

            {/* Right Ground: Ocean */}
            <path d="M 198,232 Q 300,222 400,228 L 400,288 L 198,288 Z" fill="#0284c7" />
            <text x="216" y="250" fontSize="11" fontWeight="800" fill="#f0f9ff">
              {seaLabel}：{level.seaTempC}°C
            </text>
            <text x="216" y="268" fontSize="8.8" fill="#bae6fd" fontWeight="700">
              比热容大 (4.2) · 升温慢降温慢
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>陆地气温</small>
                <strong style={{ color: landTempC > level.seaTempC ? "#dc2626" : "#2563eb" }}>
                  {landTempC} °C
                </strong>
              </div>
              <div className="readout-box">
                <small>海洋水温</small>
                <strong style={{ color: "#0284c7" }}>{level.seaTempC} °C</strong>
              </div>
              <div className="readout-box">
                <small>海陆温差</small>
                <strong>
                  {circ.deltaC > 0 ? `+${circ.deltaC}` : circ.deltaC} °C
                </strong>
              </div>
            </div>

            {level.canTuneLandTemp && (
              <div className="sliders" style={{ marginTop: 14 }}>
                <Slider
                  label="🌡️ 大陆气温"
                  value={landTempC}
                  min={level.minLandC}
                  max={level.maxLandC}
                  step={1}
                  color="#f97316"
                  format={fixed(0, "°C")}
                  onChange={setLandTempC}
                />
              </div>
            )}

            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <div>
                <small style={{ fontWeight: 700, color: "#64748b" }}>
                  ① 挂上【陆地近地面】气压牌（海洋将自动配对）
                </small>
                <div className="play-actions" style={{ margin: "6px 0 0" }}>
                  <button
                    type="button"
                    className={`pill-btn${chosenLandP === "L" ? " is-active" : ""}`}
                    aria-pressed={chosenLandP === "L"}
                    onClick={() => setChosenLandP("L")}
                  >
                    🔥 陆地低压 L（受热上升）
                  </button>
                  <button
                    type="button"
                    className={`pill-btn${chosenLandP === "H" ? " is-active" : ""}`}
                    aria-pressed={chosenLandP === "H"}
                    onClick={() => setChosenLandP("H")}
                  >
                    ❄️ 陆地高压 H（冷却下沉）
                  </button>
                </div>
              </div>

              <div>
                <small style={{ fontWeight: 700, color: "#64748b" }}>
                  ② 拨动【近地面水平风向标】
                </small>
                <div className="play-actions" style={{ margin: "6px 0 0" }}>
                  <button
                    type="button"
                    className={`pill-btn${chosenWind === "sea-to-land" ? " is-active" : ""}`}
                    aria-pressed={chosenWind === "sea-to-land"}
                    onClick={() => setChosenWind("sea-to-land")}
                  >
                    🌊➡️🏖️ 海洋吹向陆地
                  </button>
                  <button
                    type="button"
                    className={`pill-btn${chosenWind === "land-to-sea" ? " is-active" : ""}`}
                    aria-pressed={chosenWind === "land-to-sea"}
                    onClick={() => setChosenWind("land-to-sea")}
                  >
                    🏖️➡️🌊 陆地吹向海洋
                  </button>
                </div>
              </div>
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn is-blue" onClick={verifyBreeze}>
                🌬️ 放飞风向气球验证！
              </button>
              <button
                type="button"
                className="pill-btn"
                onClick={() => setShowHint(true)}
                disabled={showHint}
              >
                💡 环流口诀
              </button>
            </div>
          </div>

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict="热力环流与风向完全吻合！"
              dadLine={level.win}
              note="热力环流铁律：热上升成低压 (L)，冷下沉成高压 (H)，近地面风永远从高压吹向低压！"
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

export const breeze: GameModule = { meta, Play: BreezeGame };
