import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  isBalanced,
  leftTorque,
  leverLevels,
  rightTorque,
  tiltDegrees,
  type LeverItem,
  type PlacedItem
} from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#ff9f43";
const TICKS = [-4, -3, -2, -1, 1, 2, 3, 4] as const;

function LeverGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(leverLevels[0].id);
  const starMap = useGameStars("lever");
  const level = leverLevels.find((l) => l.id === levelId) ?? leverLevels[0];

  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(level.tray[0]?.id ?? null);
  const [testing, setTesting] = useState(false);
  const [tries, setTries] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = leverLevels.find((l) => l.id === id) ?? leverLevels[0];
    setLevelId(next.id);
    setPlaced([]);
    setSelectedId(next.tray[0]?.id ?? null);
    setTesting(false);
    setTries(0);
    setGuess(null);
    setShowHint(false);
    setWonStars(0);
  }

  const allItems = useMemo(() => [...level.fixed, ...placed], [level.fixed, placed]);
  const lTorque = leftTorque(allItems);
  const rTorque = rightTorque(allItems);
  const balanced = isBalanced(allItems);
  const angle = testing ? tiltDegrees(allItems) : 0;

  const unplacedTray: LeverItem[] = level.tray.filter((t) => !placed.some((p) => p.id === t.id));

  function clickTick(pos: number) {
    if (pos < 0) return; // left side holds fixed puzzle loads
    const existing = placed.find((p) => p.pos === pos);
    if (existing) {
      setPlaced(placed.filter((p) => p.pos !== pos));
      setSelectedId(existing.id);
      setTesting(false);
      return;
    }
    const item = level.tray.find((t) => t.id === selectedId) ?? unplacedTray[0];
    if (!item) return;
    const withoutItem = placed.filter((p) => p.id !== item.id);
    const nextPlaced = [...withoutItem, { ...item, pos }];
    setPlaced(nextPlaced);
    const rem = level.tray.find((t) => !nextPlaced.some((p) => p.id === t.id));
    setSelectedId(rem?.id ?? item.id);
    setTesting(false);
  }

  function finishWin(attemptCount: number) {
    let raw = attemptCount <= 1 ? 3 : attemptCount === 2 ? 2 : 1;
    if (showHint) raw = Math.min(raw, 2);
    setWonStars(raw);
    recordStars("lever", String(level.id), raw);
    if (sound) {
      chime(true);
      say(dad(level.win));
    }
  }

  function releaseProps() {
    if (testing) {
      setTesting(false);
      return;
    }
    const nextTries = tries + 1;
    setTries(nextTries);
    setTesting(true);
    if (balanced) {
      if (!level.mysteryAnswer) {
        finishWin(nextTries);
      } else if (guess === level.mysteryAnswer) {
        finishWin(nextTries);
      } else if (sound) {
        chime(true);
      }
    } else if (sound) {
      chime(false);
    }
  }

  function pickMystery(val: number) {
    setGuess(val);
    if (testing && balanced && val === level.mysteryAnswer) {
      finishWin(tries);
    } else if (val !== level.mysteryAnswer && sound) {
      chime(false);
    }
  }

  const next = leverLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="⚖️"
        title="跷跷板平衡 · 杠杆与力矩"
        onBack={exit}
        backLabel="机械动力馆"
        stars={sumStars(starMap)}
        maxStars={leverLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={leverLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card">
          <svg
            viewBox="0 0 440 260"
            style={{
              width: "100%",
              display: "block",
              borderRadius: 16,
              background: "linear-gradient(180deg, #eff8ff 0%, #f8fafc 74%, #e2e8f0 74%, #cbd5e1 100%)",
              border: "2px solid #e2e8f0"
            }}
            role="img"
            aria-label="杠杆天平实验台"
          >
            {/* Support pillars when not testing */}
            {!testing && (
              <g opacity="0.85">
                <rect x="66" y="140" width="14" height="58" rx="4" fill="#94a3b8" />
                <rect x="360" y="140" width="14" height="58" rx="4" fill="#94a3b8" />
                <text x="73" y="212" textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700">支架</text>
                <text x="367" y="212" textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700">支架</text>
              </g>
            )}

            {/* Central Fulcrum */}
            <polygon points="220,138 196,198 244,198" fill="#d97706" stroke="#92400e" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="220" cy="138" r="6" fill="#fef3c7" stroke="#92400e" strokeWidth="2.5" />
            <text x="220" y="216" textAnchor="middle" fontSize="11" fill="#78350f" fontWeight="800">支点 0</text>

            {/* Rotating Beam */}
            <g
              transform={`translate(220, 134) rotate(${angle})`}
              style={{ transition: "transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)" }}
            >
              <rect x="-184" y="-8" width="368" height="14" rx="6" fill="#eab308" stroke="#a16207" strokeWidth="2.5" />

              {TICKS.map((pos) => {
                const x = pos * 42;
                const item = allItems.find((it) => it.pos === pos);
                const clickable = pos > 0;
                return (
                  <g
                    key={pos}
                    transform={`translate(${x}, 0)`}
                    onClick={() => clickTick(pos)}
                    style={{ cursor: clickable ? "pointer" : "default" }}
                  >
                    <line x1="0" y1="-8" x2="0" y2="8" stroke="#854d0e" strokeWidth="2" />
                    <text x="0" y="22" textAnchor="middle" fontSize="11" fontWeight="800" fill={pos > 0 ? "#c2410c" : "#475569"}>
                      {pos > 0 ? `+${pos}` : pos}
                    </text>

                    {/* Target drop slot on right side */}
                    {clickable && !item && (
                      <rect
                        x="-16"
                        y="-42"
                        width="32"
                        height="30"
                        rx="8"
                        fill="rgba(255, 159, 67, 0.14)"
                        stroke="#ff9f43"
                        strokeWidth="1.8"
                        strokeDasharray="4 3"
                      />
                    )}

                    {/* Placed or fixed item */}
                    {item && (
                      <g transform="translate(0, -12)">
                        <rect
                          x="-19"
                          y="-42"
                          width="38"
                          height="40"
                          rx="10"
                          fill={pos < 0 ? "#dbeafe" : "#ffedd5"}
                          stroke={pos < 0 ? "#3b82f6" : "#ea580c"}
                          strokeWidth="2"
                        />
                        <text x="0" y="-21" textAnchor="middle" fontSize="20">{item.emoji}</text>
                        <text x="0" y="-5" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#1e293b">
                          {item.mystery ? "? kg" : `${item.mass}kg`}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {testing && (
              <text
                x="220"
                y="28"
                textAnchor="middle"
                fontSize="13"
                fontWeight="900"
                fill={balanced ? "#15803d" : "#c2410c"}
              >
                {balanced ? "✨ 稳稳水平！左右力矩相等！" : angle < 0 ? "↙ 左边力矩更大，往左沉！" : "↘ 右边力矩更大，往右沉！"}
              </text>
            )}
          </svg>
          <p style={{ margin: "10px 0 0", fontSize: "0.84rem", color: "#64748b" }}>
            👆 先在右侧选重物，再点木梁右半边的虚线格（+1 ~ +4）挂上去；点已挂的重物可取下。
          </p>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>左侧总力矩</small>
                <strong>{level.mysteryAnswer && !wonStars ? "2 × ? " : lTorque}</strong>
              </div>
              <div className="readout-box">
                <small>右侧总力矩</small>
                <strong style={{ color: testing && balanced ? "#3bb273" : "#ff9f43" }}>{rTorque}</strong>
              </div>
            </div>

            <p style={{ margin: "14px 0 8px", fontWeight: 800, fontSize: "0.95rem" }}>🎒 待挂重物托盘：</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {level.tray.map((item) => {
                const onBeam = placed.find((p) => p.id === item.id);
                const selected = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="pill-btn"
                    style={{
                      borderColor: selected ? ACCENT : undefined,
                      background: onBeam ? "#f1f5f9" : selected ? "#fff7ed" : "#fff",
                      fontWeight: 800
                    }}
                    onClick={() => setSelectedId(item.id)}
                  >
                    {item.emoji} {item.label} {onBeam ? `(已在+${onBeam.pos})` : ""}
                  </button>
                );
              })}
            </div>

            {level.mysteryChoices && (
              <div style={{ marginTop: 14 }}>
                <p style={{ margin: "0 0 8px", fontWeight: 800, fontSize: "0.95rem" }}>🎁 算出神秘礼盒有多重：</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {level.mysteryChoices.map((val) => (
                    <button
                      key={val}
                      type="button"
                      className="pill-btn"
                      style={{
                        borderColor: guess === val ? ACCENT : undefined,
                        background: guess === val ? "#fff7ed" : "#fff",
                        fontWeight: 800
                      }}
                      onClick={() => pickMystery(val)}
                    >
                      {val} kg
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={releaseProps}>
                {testing ? "🪵 放回支架调整" : "🚀 抽掉支架验证！"}
              </button>
              <button type="button" className="pill-btn" onClick={() => { setPlaced([]); setTesting(false); }}>
                🔄 清空右边
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 阿基米德提示
              </button>
            </div>
          </div>

          {testing && balanced && level.mysteryAnswer && guess !== level.mysteryAnswer && (
            <NianSays text="哇，杠杆已经完全水平啦！快看右边总力矩是多少，再除以礼盒所在的 2 格，选出它的重量吧！" />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict="力矩完美平衡！"
              dadLine={level.win}
              note={`平衡等式：左力矩 ${lTorque} = 右力矩 ${rTorque}`}
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

export const lever: GameModule = { meta, Play: LeverGame };
