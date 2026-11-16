import { useEffect, useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { brine, floatLevels, pose } from "./logic.ts";

const POSE_LABEL = { sink: "⬇️ 沉在杯底", hover: "⚖️ 悬浮在半空", float: "⬆️ 漂浮在水面" } as const;
const ACCENT = "#ff7a45";

export function FloatGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(floatLevels[0].id);
  const [spoons, setSpoons] = useState(0);
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const starMap = useGameStars("float");
  const level = floatLevels.find((item) => item.id === levelId) ?? floatLevels[0];
  const liquid = brine(spoons);
  const where = pose(liquid, level.egg);
  const next = floatLevels.find((item) => item.id > level.id);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}杯，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    setLevelId(id);
    setSpoons(0);
    setWonStars(0);
    setShowHint(false);
  }

  function pour(value: number) {
    const nextSpoons = Math.min(12, Math.max(0, Math.round(value)));
    setSpoons(nextSpoons);
    const hit = pose(brine(nextSpoons), level.egg) === level.want;
    if (hit && wonStars === 0) {
      const earned = showHint ? 2 : 3;
      setWonStars(earned);
      recordStars("float", String(level.id), earned);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    }
  }

  // Visual Y position inside 220px tall SVG beaker (water surface at y=56, bottom at y=196)
  const eggCy = where === "float" ? 66 : where === "hover" ? 124 : 170;
  const upLen = Math.min(46, Math.round(24 + (liquid - 1) * 90));
  const downLen = Math.round(24 + (level.egg - 1) * 90);

  return (
    <div className="page">
      <TopBar
        emoji="🥚"
        title="浮起来的鸡蛋 · 浮力与密度"
        onBack={exit}
        backLabel="声光电磁馆"
        stars={sumStars(starMap)}
        maxStars={floatLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={floatLevels.map((l) => ({ id: l.id, title: `${l.id}. ${l.title}`, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${level.id} 杯「${level.title}」：${level.story}`} />

      <div className="workbench">
        <div className="card" style={{ display: "grid", justifyItems: "center" }}>
          <svg
            viewBox="0 0 260 225"
            style={{ width: "100%", maxWidth: 320, display: "block" }}
            role="img"
            aria-label={`烧杯里加了 ${spoons} 勺盐，鸡蛋目前${POSE_LABEL[where]}`}
          >
            {/* Water fill */}
            <path
              d="M 55 58 L 55 182 Q 55 204 78 204 L 182 204 Q 205 204 205 182 L 205 58 Z"
              fill={`hsl(204 78% ${84 - spoons * 2}%)`}
            />
            <ellipse cx="130" cy="58" rx="75" ry="7" fill={`hsl(204 82% ${76 - spoons * 1.8}%)`} />

            {/* Salt sparkles */}
            {Array.from({ length: spoons * 3 }, (_, idx) => (
              <circle
                key={idx}
                cx={72 + ((idx * 37) % 116)}
                cy={74 + ((idx * 53) % 120)}
                r="2.1"
                fill="rgba(255,255,255,0.85)"
              />
            ))}

            {/* Graduations */}
            {[80, 110, 140, 170].map((y, idx) => (
              <g key={y}>
                <line x1="56" y1={y} x2="68" y2={y} stroke="#5d7ea8" strokeWidth="2" />
                <text x="72" y={y + 3} fontSize="8.5" fill="#4f6d94" fontWeight="700">
                  {(4 - idx) * 100}mL
                </text>
              </g>
            ))}

            {/* Egg */}
            <g style={{ transition: "transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)" }} transform={`translate(130, ${eggCy})`}>
              <ellipse cx="0" cy="0" rx="22" ry="28" fill="#f9ebd2" stroke="#d9b77c" strokeWidth="3" />
              <ellipse cx="-6" cy="-9" rx="5" ry="8" fill="rgba(255,255,255,0.55)" />
            </g>

            {/* Force arrows on the right */}
            <g transform={`translate(226, ${eggCy})`}>
              <line x1="0" y1="-2" x2="0" y2={-upLen} stroke="#3bb273" strokeWidth="4" strokeLinecap="round" />
              <polygon points={`0,${-upLen - 7} -5,${-upLen + 1} 5,${-upLen + 1}`} fill="#3bb273" />
              <text x="8" y={-upLen + 4} fontSize="9.5" fontWeight="700" fill="#2b8a57">浮</text>

              <line x1="0" y1="2" x2="0" y2={downLen} stroke="#ff6b6b" strokeWidth="4" strokeLinecap="round" />
              <polygon points={`0,${downLen + 7} -5,${downLen - 1} 5,${downLen - 1}`} fill="#ff6b6b" />
              <text x="8" y={downLen + 2} fontSize="9.5" fontWeight="700" fill="#c94040">重</text>
            </g>

            {/* Glass beaker outline */}
            <path
              d="M 48 24 L 55 28 L 55 182 Q 55 204 78 204 L 182 204 Q 205 204 205 182 L 205 24"
              fill="none"
              stroke="#9ec0e6"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>盐水密度</small>
                <strong style={{ color: "#4d96ff" }}>{liquid.toFixed(2)} g/cm³</strong>
              </div>
              <div className="readout-box">
                <small>鸡蛋密度</small>
                <strong>{level.egg.toFixed(2)} g/cm³</strong>
              </div>
              <div className="readout-box">
                <small>当前状态</small>
                <strong style={{ color: where === level.want ? "#3bb273" : "#d96b27" }}>
                  {POSE_LABEL[where]}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <Slider
                label="往杯里加盐"
                value={spoons}
                min={0}
                max={12}
                step={1}
                color="#4d96ff"
                format={(v) => `${v} 勺盐`}
                onChange={pour}
              />
            </div>

            <div className="play-actions">
              <button type="button" className="pill-btn" onClick={() => pour(spoons + 1)} disabled={spoons >= 12}>
                🧂 加一勺盐
              </button>
              <button type="button" className="pill-btn" onClick={() => load(level.id)}>
                🔄 换杯清水
              </button>
              <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
                💡 阿基米德提示
              </button>
            </div>
          </div>

          {showHint && (
            <HintBox
              text={
                level.want === "hover"
                  ? `想让鸡蛋稳稳停在半空，盐水密度得刚好等于鸡蛋密度 ${level.egg.toFixed(2)} g/cm³！每勺盐增加 0.02，算算要几勺？`
                  : `当盐水密度超过鸡蛋密度（> ${(level.egg + 0.02).toFixed(2)} g/cm³）时，同体积盐水比鸡蛋更重，向上的浮力就会把鸡蛋托出水面！`
              }
            />
          )}
        </div>
      </div>

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={`太棒啦！${spoons} 勺盐调出 ${liquid.toFixed(2)} g/cm³，鸡蛋${POSE_LABEL[where].slice(2)}！`}
          dadLine={level.win}
          onRetry={() => load(level.id)}
          onNext={next ? () => load(next.id) : exit}
          nextLabel={next ? `下一杯：${next.title} →` : "回物理馆 →"}
        />
      )}
    </div>
  );
}

export const floatEgg = {
  meta: {
    id: "float",
    category: "physics" as const,
    title: "浮起来的鸡蛋",
    emoji: "🥚",
    blurb: "清水里鸡蛋沉底，一勺勺加盐提高水密度，让鸡蛋悬浮在半空或漂上水面！",
    tag: "流体 · 浮力与密度",
    maxStars: floatLevels.length * 3
  },
  Play: FloatGame
};
