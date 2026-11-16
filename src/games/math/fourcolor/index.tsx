import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { conflicts, isValidColoring, MAP_COLORS, mapLevels, usedColorCount } from "./logic.ts";

const ACCENT = "#4d96ff";

function FourColorGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(mapLevels[0].id);
  const starMap = useGameStars("fourcolor");
  const level = mapLevels.find((l) => l.id === levelId) ?? mapLevels[0];

  const [brush, setBrush] = useState<number>(0);
  const [colors, setColors] = useState<number[]>(() => Array(level.regions.length).fill(-1));
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = mapLevels.find((l) => l.id === id) ?? mapLevels[0];
    setLevelId(next.id);
    setColors(Array(next.regions.length).fill(-1));
    setShowHint(false);
    setWonStars(0);
  }

  const badPairs = useMemo(() => conflicts(level.edges, colors), [level.edges, colors]);
  const badRegions = useMemo(() => {
    const s = new Set<number>();
    for (const [a, b] of badPairs) {
      s.add(a);
      s.add(b);
    }
    return s;
  }, [badPairs]);

  const used = usedColorCount(colors);
  const filled = colors.filter((c) => c >= 0).length;

  function paintRegion(regionId: number) {
    const next = colors.map((c, i) => (i === regionId ? (c === brush ? -1 : brush) : c));
    setColors(next);

    if (isValidColoring(level.regions.length, level.edges, next)) {
      const distinct = usedColorCount(next);
      let raw = distinct <= level.parColors ? 3 : 2;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("fourcolor", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (conflicts(level.edges, next).length > 0 && sound) {
      chime(false);
    }
  }

  const next = mapLevels.find((l) => l.id > level.id);

  // Note: Level 3 has region 0 drawn ON TOP of 1,2,3 visually so we render regions 1..n then 0 if id===3, or sort so central regions stay clickable!
  const drawOrder = level.id === 3 ? [1, 2, 3, 0] : level.id === 4 ? [1, 2, 3, 4, 5, 0] : level.regions.map((r) => r.id);

  return (
    <div className="page">
      <TopBar
        emoji="🗺️"
        title="四色地图 · 四色定理"
        onBack={exit}
        backLabel="数学思维馆"
        stars={sumStars(starMap)}
        maxStars={mapLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={mapLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card">
          <svg
            viewBox="0 0 360 272"
            style={{
              width: "100%",
              display: "block",
              borderRadius: 16,
              background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
              border: "2px solid #bfdbfe"
            }}
            role="img"
            aria-label={`${level.title} 涂色地图`}
          >
            {drawOrder.map((rid) => {
              const region = level.regions[rid];
              const cIdx = colors[rid];
              const swatch = cIdx >= 0 ? MAP_COLORS[cIdx] : null;
              const isBad = badRegions.has(rid);
              return (
                <g
                  key={region.id}
                  onClick={() => paintRegion(region.id)}
                  style={{ cursor: "pointer" }}
                >
                  <path
                    d={region.d}
                    fill={swatch ? swatch.soft : "#ffffff"}
                    stroke={isBad ? "#e03131" : swatch ? swatch.hex : "#475569"}
                    strokeWidth={isBad ? 4 : 2.6}
                    strokeLinejoin="round"
                  />
                  <text
                    x={region.lx}
                    y={region.ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="12.5"
                    fontWeight="800"
                    fill={isBad ? "#c92a2a" : "#1e293b"}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {region.name}
                  </text>
                </g>
              );
            })}

            {badPairs.map(([a, b], idx) => {
              const ra = level.regions[a];
              const rb = level.regions[b];
              return (
                <g key={idx} style={{ pointerEvents: "none" }}>
                  <line
                    x1={ra.lx}
                    y1={ra.ly}
                    x2={rb.lx}
                    y2={rb.ly}
                    stroke="#e03131"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                  />
                  <circle cx={(ra.lx + rb.lx) / 2} cy={(ra.ly + rb.ly) / 2} r="10" fill="#e03131" />
                  <text
                    x={(ra.lx + rb.lx) / 2}
                    y={(ra.ly + rb.ly) / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="11"
                    fill="#fff"
                    fontWeight="900"
                  >
                    !
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>已涂地区</small>
                <strong>{filled} / {level.regions.length}</strong>
              </div>
              <div className="readout-box">
                <small>已用颜色数</small>
                <strong style={{ color: used <= level.parColors ? "#3bb273" : "#ff9f43" }}>
                  {used} 种（目标 ≤ {level.parColors}）
                </strong>
              </div>
            </div>

            <p style={{ margin: "14px 0 8px", fontWeight: 800, fontSize: "0.95rem" }}>🎨 选一支画笔，再点地图区域：</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {MAP_COLORS.slice(0, level.paletteSize).map((c) => {
                const active = brush === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="pill-btn"
                    style={{
                      borderColor: active ? c.hex : "#e2e8f0",
                      borderWidth: active ? 3 : 2,
                      background: active ? c.soft : "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontWeight: 800
                    }}
                    onClick={() => setBrush(c.id)}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: c.hex,
                        display: "inline-block"
                      }}
                    />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="pill-btn"
                onClick={() => { setColors(Array(level.regions.length).fill(-1)); setWonStars(0); }}
              >
                🧽 擦掉重涂
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 涂色锦囊
              </button>
            </div>
          </div>

          {badPairs.length > 0 && (
            <NianSays
              text={`哎呀！${level.regions[badPairs[0][0]].name} 和 ${level.regions[badPairs[0][1]].name} 挨在一起却撞色啦，快换支画笔改掉其中一块！`}
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`只用 ${used} 种颜色完美分界！`}
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

export const fourcolor: GameModule = {
  meta: {
    id: "fourcolor",
    title: "四色地图",
    category: "math",
    emoji: "🗺️",
    tag: "四色定理",
    blurb: "只拿四支彩色画笔给地图上色，让相邻王国绝不撞色，体验计算机证明的数学传奇。",
    maxStars: mapLevels.length * 3
  },
  Play: FourColorGame
};
