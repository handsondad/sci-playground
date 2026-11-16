import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { colorLevels, colorMatch, describeLight, isExactColor, rgbToCss, type RGB } from "./logic.ts";

const ACCENT = "#ff9f43";

function ColorsGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(colorLevels[0].id);
  const starMap = useGameStars("colors");
  const level = colorLevels.find((l) => l.id === levelId) ?? colorLevels[0];

  const [rgb, setRgb] = useState<RGB>(level.start);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = colorLevels.find((l) => l.id === id) ?? colorLevels[0];
    setLevelId(next.id);
    setRgb(next.start);
    setShowHint(false);
    setWonStars(0);
  }

  function update(patch: Partial<RGB>) {
    const nextRgb = { ...rgb, ...patch };
    setRgb(nextRgb);
    if (isExactColor(nextRgb, level.target)) {
      const earned = showHint ? 2 : 3;
      if (earned > wonStars) {
        setWonStars(earned);
        recordStars("colors", String(level.id), earned);
        if (sound) {
          chime(true);
          say(dad(level.win));
        }
      }
    }
  }

  const pct = colorMatch(rgb, level.target);
  const mixedCss = rgbToCss(rgb);
  const targetCss = rgbToCss(level.target);
  const next = colorLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🌈"
        title="三原色舞台灯 · 色光混合"
        onBack={exit}
        backLabel="声光电磁馆"
        stars={sumStars(starMap)}
        maxStars={colorLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={colorLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#0f172a", borderColor: "#334155", color: "#f8fafc" }}>
          <svg
            viewBox="0 0 400 265"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`三原色聚光灯舞台，当前混出 ${describeLight(rgb)}`}
          >
            <rect x="0" y="0" width="400" height="265" fill="#090d16" rx="12" />

            {/* Additive overlapping RGB spotlights — apply screen blend on each active lamp */}
            <g style={{ isolation: "isolate" }}>
              {rgb.r > 0 && (
                <circle
                  cx="166"
                  cy="126"
                  r="68"
                  style={{ mixBlendMode: "screen" }}
                  fill={`rgb(${Math.round((rgb.r / 100) * 255)}, 0, 0)`}
                />
              )}
              {rgb.g > 0 && (
                <circle
                  cx="234"
                  cy="126"
                  r="68"
                  style={{ mixBlendMode: "screen" }}
                  fill={`rgb(0, ${Math.round((rgb.g / 100) * 255)}, 0)`}
                />
              )}
              {rgb.b > 0 && (
                <circle
                  cx="200"
                  cy="182"
                  r="68"
                  style={{ mixBlendMode: "screen" }}
                  fill={`rgb(0, 0, ${Math.round((rgb.b / 100) * 255)})`}
                />
              )}
            </g>

            {/* Center spotlight ring indicator */}
            <circle
              cx="200"
              cy="145"
              r="24"
              fill={mixedCss}
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeDasharray="4 3"
            />

            {/* Lamp fixtures */}
            <text x="92" y="64" fill="#ff6b6b" fontSize="12" fontWeight="800">🔴 红 {rgb.r}%</text>
            <text x="262" y="64" fill="#51cf66" fontSize="12" fontWeight="800">🟢 绿 {rgb.g}%</text>
            <text x="172" y="258" fill="#74c0fc" fontSize="12" fontWeight="800">🔵 蓝 {rgb.b}%</text>

            {/* Target swatch card in top-right */}
            <g transform="translate(292, 12)">
              <rect x="0" y="0" width="96" height="66" rx="10" fill="#1e293b" stroke="#475569" strokeWidth="1.8" />
              <text x="48" y="17" textAnchor="middle" fill="#cbd5e1" fontSize="10.5" fontWeight="700">🎯 目标灯光</text>
              <rect x="16" y="24" width="64" height="24" rx="6" fill={targetCss} stroke="#fff" strokeWidth="1.5" />
              <text x="48" y="60" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="800">{level.targetName}</text>
            </g>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <Meter pct={pct} label="色彩吻合度" valueText={`${pct}%`} />

            <div className="readout-grid" style={{ marginTop: 12 }}>
              <div className="readout-box">
                <small>中央合成光</small>
                <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 14, height: 14, borderRadius: "50%", background: mixedCss, border: "1px solid #cbd5e1" }} />
                  {describeLight(rgb)}
                </strong>
              </div>
              <div className="readout-box">
                <small>目标色光</small>
                <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 14, height: 14, borderRadius: "50%", background: targetCss, border: "1px solid #cbd5e1" }} />
                  {level.targetName}
                </strong>
              </div>
            </div>

            <div className="sliders" style={{ marginTop: 14 }}>
              <Slider
                label="🔴 红光灯"
                value={rgb.r}
                min={0}
                max={100}
                step={25}
                color="#ff4d4f"
                format={(v) => `${v}%`}
                onChange={(r) => update({ r })}
              />
              <Slider
                label="🟢 绿光灯"
                value={rgb.g}
                min={0}
                max={100}
                step={25}
                color="#3bb273"
                format={(v) => `${v}%`}
                onChange={(g) => update({ g })}
              />
              <Slider
                label="🔵 蓝光灯"
                value={rgb.b}
                min={0}
                max={100}
                step={25}
                color="#4d96ff"
                format={(v) => `${v}%`}
                onChange={(b) => update({ b })}
              />
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="pill-btn" onClick={() => setRgb({ r: 0, g: 0, b: 0 })}>
                🌑 全关暗场
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 调光配方
              </button>
            </div>
          </div>

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`调出「${level.targetName}」啦！`}
              dadLine={level.win}
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

export const colors: GameModule = {
  meta: {
    id: "colors",
    title: "三原色舞台灯",
    category: "physics",
    emoji: "🌈",
    tag: "色光加色混合",
    blurb: "推拉红绿蓝三盏聚光灯，亲眼见证红光加绿光变柠檬黄、三光合一变纯白。",
    maxStars: colorLevels.length * 3
  },
  Play: ColorsGame
};
