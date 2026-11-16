import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  dominantCount,
  formatGenotype,
  gametesOf,
  mendelLevels,
  punnettSquare,
  type Genotype
} from "./logic.ts";

const ACCENT = "#3bb273";
const ALL_GENOS: readonly Genotype[] = ["AA", "Aa", "aa"];

function MendelGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(mendelLevels[0].id);
  const starMap = useGameStars("mendel");
  const level = mendelLevels.find((l) => l.id === levelId) ?? mendelLevels[0];

  const [parentA, setParentA] = useState<Genotype>(level.fixedParentA ?? "AA");
  const [parentB, setParentB] = useState<Genotype>("AA");
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = mendelLevels.find((l) => l.id === id) ?? mendelLevels[0];
    setLevelId(next.id);
    setParentA(next.fixedParentA ?? "AA");
    setParentB("AA");
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  const cells = useMemo(() => punnettSquare(parentA, parentB), [parentA, parentB]);
  const doms = dominantCount(cells);
  const recs = 4 - doms;

  const [a1, a2] = gametesOf(parentA).map((x) => (x === "A" ? level.domSymbol : level.recSymbol));
  const [b1, b2] = gametesOf(parentB).map((x) => (x === "A" ? level.domSymbol : level.recSymbol));

  function plantSeeds() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (doms === level.goalDomCount) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("mendel", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const next = mendelLevels.find((l) => l.id > level.id);
  const allowedGenos = level.forbidRecessiveParent ? ALL_GENOS.filter((g) => g !== "aa") : ALL_GENOS;

  return (
    <div className="page">
      <TopBar
        emoji="🫛"
        title="孟德尔种豌豆 · 遗传棋盘格"
        onBack={exit}
        backLabel="生命科学馆"
        stars={sumStars(starMap)}
        maxStars={mendelLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={mendelLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card">
          <p style={{ margin: "0 0 10px", fontWeight: 800, color: "#334155" }}>
            🧬 庞氏遗传棋盘格（Punnett Square）：
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "74px 1fr 1fr",
              gap: 8,
              alignItems: "stretch"
            }}
          >
            {/* Corner */}
            <div
              style={{
                borderRadius: 12,
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.78rem",
                fontWeight: 800,
                color: "#64748b",
                padding: 6,
                textAlign: "center"
              }}
            >
              父 \ 母
            </div>
            {/* Top Gametes (Parent B) */}
            {[b1, b2].map((gam, idx) => (
              <div
                key={`b-${idx}`}
                style={{
                  borderRadius: 12,
                  background: "#ecfdf5",
                  border: "2px solid #86efac",
                  padding: "8px 0",
                  textAlign: "center",
                  fontWeight: 900,
                  fontSize: "1.1rem",
                  color: "#166534"
                }}
              >
                母配子 {gam}
              </div>
            ))}

            {/* Row 1 */}
            <div
              style={{
                borderRadius: 12,
                background: "#eff6ff",
                border: "2px solid #93c5fd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "1.05rem",
                color: "#1e40af"
              }}
            >
              父 {a1}
            </div>
            {[cells[0], cells[1]].map((cell, idx) => {
              const isDom = cell !== "aa";
              return (
                <div
                  key={`r1-${idx}`}
                  style={{
                    borderRadius: 14,
                    border: `2.5px solid ${isDom ? level.domColor : level.recColor}`,
                    background: isDom
                      ? `color-mix(in srgb, ${level.domColor} 10%, #ffffff)`
                      : `color-mix(in srgb, ${level.recColor} 14%, #ffffff)`,
                    padding: "14px 10px",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "1.9rem", lineHeight: 1.1 }}>{isDom ? level.domEmoji : level.recEmoji}</div>
                  <strong style={{ display: "block", fontSize: "1.15rem", marginTop: 4 }}>
                    {formatGenotype(cell, level.domSymbol, level.recSymbol)}
                  </strong>
                  <small style={{ color: "#475569", fontWeight: 700 }}>{isDom ? level.domLabel : level.recLabel}</small>
                </div>
              );
            })}

            {/* Row 2 */}
            <div
              style={{
                borderRadius: 12,
                background: "#eff6ff",
                border: "2px solid #93c5fd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "1.05rem",
                color: "#1e40af"
              }}
            >
              父 {a2}
            </div>
            {[cells[2], cells[3]].map((cell, idx) => {
              const isDom = cell !== "aa";
              return (
                <div
                  key={`r2-${idx}`}
                  style={{
                    borderRadius: 14,
                    border: `2.5px solid ${isDom ? level.domColor : level.recColor}`,
                    background: isDom
                      ? `color-mix(in srgb, ${level.domColor} 10%, #ffffff)`
                      : `color-mix(in srgb, ${level.recColor} 14%, #ffffff)`,
                    padding: "14px 10px",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "1.9rem", lineHeight: 1.1 }}>{isDom ? level.domEmoji : level.recEmoji}</div>
                  <strong style={{ display: "block", fontSize: "1.15rem", marginTop: 4 }}>
                    {formatGenotype(cell, level.domSymbol, level.recSymbol)}
                  </strong>
                  <small style={{ color: "#475569", fontWeight: 700 }}>{isDom ? level.domLabel : level.recLabel}</small>
                </div>
              );
            })}
          </div>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>当前子代比例</small>
                <strong style={{ color: doms === level.goalDomCount ? "#16a34a" : "#d97706" }}>
                  {doms} {level.domLabel} : {recs} {level.recLabel}
                </strong>
              </div>
              <div className="readout-box">
                <small>🎯 本关目标</small>
                <strong>
                  {level.goalDomCount} {level.domLabel} : {4 - level.goalDomCount} {level.recLabel}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: "0.92rem" }}>
                🌱 父本基因型 {level.fixedParentA ? "（本关已固定）" : ""}：
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(level.fixedParentA ? [level.fixedParentA] : allowedGenos).map((g) => {
                  const isDom = g !== "aa";
                  return (
                    <button
                      key={`pa-${g}`}
                      type="button"
                      className="pill-btn"
                      disabled={Boolean(level.fixedParentA)}
                      style={{
                        borderColor: parentA === g ? ACCENT : undefined,
                        background: parentA === g ? "#dcfce7" : "#fff",
                        fontWeight: 800
                      }}
                      onClick={() => setParentA(g)}
                    >
                      {isDom ? level.domEmoji : level.recEmoji} {formatGenotype(g, level.domSymbol, level.recSymbol)}（{isDom ? level.domLabel : level.recLabel}）
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: "0.92rem" }}>🌸 母本基因型：</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {allowedGenos.map((g) => {
                  const isDom = g !== "aa";
                  return (
                    <button
                      key={`pb-${g}`}
                      type="button"
                      className="pill-btn"
                      style={{
                        borderColor: parentB === g ? ACCENT : undefined,
                        background: parentB === g ? "#dcfce7" : "#fff",
                        fontWeight: 800
                      }}
                      onClick={() => setParentB(g)}
                    >
                      {isDom ? level.domEmoji : level.recEmoji} {formatGenotype(g, level.domSymbol, level.recSymbol)}（{isDom ? level.domLabel : level.recLabel}）
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={plantSeeds}>
                🌱 播种验证比例！
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 孟德尔笔记
              </button>
            </div>
          </div>

          {tries > 0 && wonStars === 0 && (
            <DadSays
              text={`现在种出来是 ${doms} 格${level.domLabel}、${recs} 格${level.recLabel}，我们要凑出 ${level.goalDomCount}:${4 - level.goalDomCount} 哦！`}
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`成功育出 ${doms}:${recs} 经典分离比！`}
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

export const mendel: GameModule = {
  meta: {
    id: "mendel",
    title: "孟德尔种豌豆",
    category: "biology",
    emoji: "🫛",
    tag: "显隐性遗传棋盘",
    blurb: "搭配亲本豌豆的显性与隐性基因，在 2×2 庞氏棋盘格里亲手种出 3:1 与 1:1 的遗传奇迹。",
    maxStars: mendelLevels.length * 3
  },
  Play: MendelGame
};
