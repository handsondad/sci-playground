import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { mothLevels, nextGeneration, type BarkEnv } from "./logic.ts";

const ACCENT = "#3bb273";

const MOTH_SPOTS = [
  [78, 62], [150, 52], [234, 68], [308, 56],
  [96, 114], [186, 106], [268, 120], [326, 118],
  [72, 168], [142, 164], [220, 172], [296, 174],
  [104, 218], [184, 214], [254, 222], [324, 216],
  [124, 86], [282, 90], [164, 140], [238, 198]
] as const;

function MothsGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(mothLevels[0].id);
  const starMap = useGameStars("moths");
  const level = mothLevels.find((l) => l.id === levelId) ?? mothLevels[0];

  const [lightPct, setLightPct] = useState(level.startLightPct);
  const [env, setEnv] = useState<BarkEnv>(level.startEnv);
  const [gen, setGen] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = mothLevels.find((l) => l.id === id) ?? mothLevels[0];
    setLevelId(next.id);
    setLightPct(next.startLightPct);
    setEnv(next.startEnv);
    setGen(0);
    setShowHint(false);
    setWonStars(0);
  }

  const darkPct = 100 - lightPct;
  const lightMothCount = Math.round((lightPct / 100) * MOTH_SPOTS.length);

  const barkBg = env === "clean" ? "#e2e8f0" : "#1e293b";
  const barkStripe = env === "clean" ? "#cbd5e1" : "#0f172a";

  function advanceGen() {
    const nextPct = nextGeneration(lightPct, env);
    const nextGen = gen + 1;
    setLightPct(nextPct);
    setGen(nextGen);

    if (level.goalCheck(nextPct, nextGen) && wonStars === 0) {
      let raw = nextGen <= level.parGens ? 3 : nextGen <= level.parGens + 3 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("moths", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    }
  }

  const next = mothLevels.find((l) => l.id > level.id);
  const exposedKind = useMemo(() => (env === "clean" ? "深色蛾更显眼，容易被小鸟发现！" : "浅色蛾更显眼，容易被小鸟发现！"), [env]);

  return (
    <div className="page">
      <TopBar
        emoji="🦋"
        title="桦尺蠖捉迷藏 · 自然选择"
        onBack={exit}
        backLabel="生物馆"
        stars={sumStars(starMap)}
        maxStars={mothLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={mothLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card">
          <svg
            viewBox="0 0 400 264"
            style={{
              width: "100%",
              display: "block",
              borderRadius: 16,
              background: env === "clean" ? "linear-gradient(180deg, #dcfce7, #bbf7d0)" : "linear-gradient(180deg, #475569, #334155)",
              border: "2px solid #cbd5e1"
            }}
            role="img"
            aria-label={`第 ${gen} 代桦树干，浅色蛾 ${lightPct}%，深色蛾 ${darkPct}%`}
          >
            {/* Tree Trunk */}
            <rect x="48" y="14" width="304" height="236" rx="18" fill={barkBg} stroke="#64748b" strokeWidth="3" />
            {[86, 148, 212, 286].map((x, idx) => (
              <path
                key={idx}
                d={`M ${x} 20 Q ${x + (idx % 2 === 0 ? 10 : -10)} 130 ${x} 244`}
                stroke={barkStripe}
                strokeWidth="7"
                fill="none"
                strokeLinecap="round"
              />
            ))}

            {/* 20 Moths on the Bark */}
            {MOTH_SPOTS.map(([mx, my], idx) => {
              const isLight = idx < lightMothCount;
              const wingFill = isLight ? "#f8fafc" : "#1f2937";
              const wingStroke = isLight ? "#94a3b8" : "#090d16";
              return (
                <g key={idx} transform={`translate(${mx}, ${my})`}>
                  <polygon
                    points="0,-10 -14,8 -2,5"
                    fill={wingFill}
                    stroke={wingStroke}
                    strokeWidth="1.4"
                  />
                  <polygon
                    points="0,-10 14,8 2,5"
                    fill={wingFill}
                    stroke={wingStroke}
                    strokeWidth="1.4"
                  />
                  <line x1="0" y1="-11" x2="0" y2="8" stroke={isLight ? "#64748b" : "#000"} strokeWidth="2" />
                </g>
              );
            })}

            {/* Hungry Bird Observer */}
            <text x="20" y="38" fontSize="24">🐦</text>
            <text
              x="200"
              y="258"
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              fill={env === "clean" ? "#14532d" : "#f8fafc"}
            >
              🐦 小鸟捕食提示：{exposedKind}
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>繁衍代数</small>
                <strong>第 {gen} 代</strong>
              </div>
              <div className="readout-box">
                <small>🎯 过关条件</small>
                <strong>{level.goalText}</strong>
              </div>
            </div>

            {/* Population Ratio Dual Bar */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.86rem", fontWeight: 800, marginBottom: 4 }}>
                <span>🤍 浅色蛾 {lightPct}%</span>
                <span>🖤 深色蛾 {darkPct}%</span>
              </div>
              <div style={{ height: 18, borderRadius: 999, overflow: "hidden", display: "flex", border: "2px solid #cbd5e1" }}>
                <div style={{ width: `${lightPct}%`, background: "#f8fafc", transition: "width 0.35s ease" }} />
                <div style={{ width: `${darkPct}%`, background: "#1e293b", transition: "width 0.35s ease" }} />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: "0.92rem" }}>
                🌳 树干环境 {level.lockEnv ? "（工业污染期固定）" : ""}：
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  type="button"
                  className="pill-btn"
                  disabled={level.lockEnv}
                  style={{
                    borderColor: env === "clean" ? ACCENT : undefined,
                    background: env === "clean" ? "#dcfce7" : "#fff",
                    fontWeight: 800
                  }}
                  onClick={() => setEnv("clean")}
                >
                  🌿 洁净银白桦树
                </button>
                <button
                  type="button"
                  className="pill-btn"
                  disabled={level.lockEnv}
                  style={{
                    borderColor: env === "soot" ? "#475569" : undefined,
                    background: env === "soot" ? "#e2e8f0" : "#fff",
                    fontWeight: 800
                  }}
                  onClick={() => setEnv("soot")}
                >
                  🏭 煤烟熏黑树皮
                </button>
              </div>
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={advanceGen}>
                🐦 捕食并繁衍下一代 →
              </button>
              <button type="button" className="pill-btn" onClick={() => load(level.id)}>
                🔄 重置种群
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 达尔文提示
              </button>
            </div>
          </div>

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`历经 ${gen} 代完成适应演化！`}
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

export const moths: GameModule = {
  meta: {
    id: "moths",
    title: "桦尺蠖捉迷藏",
    category: "biology",
    emoji: "🦋",
    tag: "保护色与自然选择",
    blurb: "切换银白桦树与工业煤烟黑树皮，看小鸟捕食如何改变桦尺蠖家族几代后的颜色比例。",
    maxStars: mothLevels.length * 3
  },
  Play: MothsGame
};
