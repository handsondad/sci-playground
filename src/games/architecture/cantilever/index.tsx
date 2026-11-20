import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { BLOCK_LEN, cantileverLevels, stackStability, totalOverhangPct } from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#b45309";
const CLIFF_X = 142;
const CLIFF_Y = 222;
const SLAB_H = 26;
const BLOCK_COLORS = ["#d97706", "#ea580c", "#0284c7", "#7c3aed"];

function CantileverGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(cantileverLevels[0].id);
  const starMap = useGameStars("cantilever");
  const level = cantileverLevels.find((l) => l.id === levelId) ?? cantileverLevels[0];

  const [offsets, setOffsets] = useState<number[]>([...level.startOffsets]);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const dragRef = useRef<{ idx: number; startClientX: number; startVal: number; pxScale: number } | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = cantileverLevels.find((l) => l.id === id) ?? cantileverLevels[0];
    setLevelId(next.id);
    setOffsets([...next.startOffsets]);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
    setFeedback(null);
  }

  function setBlockOffset(index: number, val: number) {
    setFeedback(null);
    const clamped = Math.max(0, Math.min(72, Math.round(val)));
    setOffsets((prev) => prev.map((v, i) => (i === index ? clamped : v)));
  }

  const stab = stackStability(offsets, BLOCK_LEN);
  const pct = totalOverhangPct(offsets, BLOCK_LEN);
  const reachedFlag = pct >= level.targetPct - 1e-6;

  function verifyCantilever() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (!stab.stable) {
      const tipLayer = (stab.tippingFromIndex ?? 0) + 1;
      setFeedback(`哎呀！从第 ${tipLayer} 层往上的联合重心已经越过下方支承边缘（红线探出去了），一松手就会翻落深谷！往左收回一点点试试！`);
      if (sound) chime(false);
      return;
    }
    if (!reachedFlag) {
      setFeedback(`目前结构很稳，但总悬挑只有 ${pct.toFixed(1)}% 砖长，还没够到 ${level.targetPct}% 处的红旗呢！再大胆往右推一点！`);
      if (sound) chime(false);
      return;
    }

    let stars = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
    if (showHint) stars = Math.min(stars, 2);
    setWonStars(stars);
    setFeedback(null);
    recordStars("cantilever", String(level.id), stars);
    if (sound) {
      chime(true);
      say(dad(level.win));
    }
  }

  function handlePointerDown(idx: number, e: PointerEvent<SVGGElement>) {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pxScale = rect.width > 0 ? 360 / rect.width : 1;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      idx,
      startClientX: e.clientX,
      startVal: offsets[idx] ?? 0,
      pxScale
    };
  }

  function handlePointerMove(e: PointerEvent<SVGGElement>) {
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.startClientX) * dragRef.current.pxScale;
    setBlockOffset(dragRef.current.idx, dragRef.current.startVal + dx);
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  const targetX = CLIFF_X + (level.targetPct / 100) * BLOCK_LEN;
  const fullBrickX = CLIFF_X + BLOCK_LEN;
  const next = cantileverLevels.find((l) => l.id > level.id);

  // Tipping pivot coordinates when unstable
  const tipIdx = stab.tippingFromIndex;
  const pivotX =
    tipIdx === null ? CLIFF_X : CLIFF_X + (tipIdx === 0 ? 0 : stab.rightEdges[tipIdx - 1]);
  const pivotY = tipIdx === null ? CLIFF_Y : CLIFF_Y - tipIdx * SLAB_H;

  return (
    <div className="page">
      <TopBar
        emoji="🧱"
        title="积木悬空桥 · 调和级数"
        onBack={exit}
        backLabel="建筑结构馆"
        stars={sumStars(starMap)}
        maxStars={cantileverLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={cantileverLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#f8fafc", borderColor: "#cbd5e1" }}>
          <svg
            viewBox="0 0 360 284"
            style={{ width: "100%", display: "block", borderRadius: 12, touchAction: "none" }}
            role="img"
            aria-label={`积木悬空桥实验台，总悬挑 ${pct.toFixed(1)}% 砖长，${stab.stable ? "稳定" : "倾覆失稳"}`}
          >
            <defs>
              <linearGradient id="gorgeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="65%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="360" height="284" rx="12" fill="url(#gorgeGrad)" />

            {/* Cliff ledge on left */}
            <polygon points={`0,${CLIFF_Y} ${CLIFF_X},${CLIFF_Y} ${CLIFF_X},284 0,284`} fill="#64748b" />
            <rect x="0" y={CLIFF_Y} width={CLIFF_X} height="8" fill="#475569" />
            <text x="16" y={CLIFF_Y + 30} fontSize="11" fontWeight="800" fill="#f1f5f9">
              ⛰️ 稳固悬崖（x ≤ 0）
            </text>

            {/* Cliff edge plumb reference line x = 0 */}
            <line
              x1={CLIFF_X}
              y1="38"
              x2={CLIFF_X}
              y2="280"
              stroke="#475569"
              strokeWidth="1.4"
              strokeDasharray="4 4"
            />

            {/* 100% full block length reference line */}
            {level.blockCount >= 3 && (
              <g>
                <line
                  x1={fullBrickX}
                  y1="44"
                  x2={fullBrickX}
                  y2="264"
                  stroke="rgba(124, 58, 237, 0.45)"
                  strokeWidth="1.4"
                  strokeDasharray="3 3"
                />
                <text x={fullBrickX} y="275" textAnchor="middle" fontSize="9" fontWeight="700" fill="#6d28d9">
                  100%砖长
                </text>
              </g>
            )}

            {/* Target flag out over the gorge */}
            <line
              x1={targetX}
              y1="52"
              x2={targetX}
              y2="246"
              stroke={reachedFlag && stab.stable ? "#16a34a" : "#dc2626"}
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            <text x={targetX + 3} y="64" fontSize="15">
              🚩
            </text>
            <text
              x={targetX}
              y="45"
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="800"
              fill={reachedFlag && stab.stable ? "#15803d" : "#b91c1c"}
            >
              目标 {level.targetPct}%
            </text>

            {/* Stable lower blocks */}
            {offsets.map((_, idx) => {
              if (tipIdx !== null && idx >= tipIdx) return null;
              const leftX = CLIFF_X + stab.leftEdges[idx];
              const topY = CLIFF_Y - (idx + 1) * SLAB_H;
              const color = BLOCK_COLORS[idx % BLOCK_COLORS.length];
              return (
                <g
                  key={idx}
                  style={{ cursor: "ew-resize" }}
                  onPointerDown={(e) => handlePointerDown(idx, e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <rect
                    x={leftX}
                    y={topY}
                    width={BLOCK_LEN}
                    height={SLAB_H - 2}
                    rx="5"
                    fill={color}
                    stroke="#fff"
                    strokeWidth="1.8"
                  />
                  <text
                    x={leftX + BLOCK_LEN / 2}
                    y={topY + 16}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="800"
                    fill="#fff"
                  >
                    第 {idx + 1} 层（L=120）
                  </text>
                </g>
              );
            })}

            {/* Unstable tipping sub-stack (rotated around fulcrum if tipping) */}
            {tipIdx !== null && (
              <g
                transform={`rotate(13, ${pivotX}, ${pivotY})`}
                style={{ transition: "transform 0.28s ease" }}
              >
                {offsets.map((_, idx) => {
                  if (idx < tipIdx) return null;
                  const leftX = CLIFF_X + stab.leftEdges[idx];
                  const topY = CLIFF_Y - (idx + 1) * SLAB_H;
                  return (
                    <g
                      key={idx}
                      style={{ cursor: "ew-resize" }}
                      onPointerDown={(e) => handlePointerDown(idx, e)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                    >
                      <rect
                        x={leftX}
                        y={topY}
                        width={BLOCK_LEN}
                        height={SLAB_H - 2}
                        rx="5"
                        fill="#ef4444"
                        stroke="#fee2e2"
                        strokeWidth="1.8"
                      />
                      <text
                        x={leftX + BLOCK_LEN / 2}
                        y={topY + 16}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="800"
                        fill="#fff"
                      >
                        ⚠️ 第 {idx + 1} 层倾覆！
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Combined Center-of-Mass plumb lines for every top-k sub-stack */}
            {stab.checks.map((chk) => {
              const cx = CLIFF_X + chk.cmX;
              const yStart = CLIFF_Y - offsets.length * SLAB_H + 4;
              const yEnd = CLIFF_Y - chk.fromIndex * SLAB_H;
              const color = chk.stable ? "#16a34a" : "#dc2626";
              return (
                <g key={chk.fromIndex}>
                  <line
                    x1={cx}
                    y1={yStart + (offsets.length - chk.blockCount) * 6}
                    x2={cx}
                    y2={yEnd}
                    stroke={color}
                    strokeWidth="2.2"
                    strokeDasharray="3 2"
                  />
                  <circle cx={cx} cy={yEnd} r="4.2" fill={color} stroke="#fff" strokeWidth="1.2" />
                </g>
              );
            })}

            {stab.topBlockClearOfCliff && stab.stable && (
              <text x="246" y="88" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#15803d">
                ✨ 顶砖已 100% 脱离悬崖上空！
              </text>
            )}

            <text x="12" y="22" fontSize="10.5" fontWeight="700" fill="#334155">
              ↔️ 拖动积木或拉滑块：绿点为各层联合重心铅垂落点
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>📏 当前总悬挑</small>
                <strong style={{ color: reachedFlag && stab.stable ? "#16a34a" : stab.stable ? "#b45309" : "#dc2626" }}>
                  {pct.toFixed(1)}% L
                </strong>
              </div>
              <div className="readout-box">
                <small>🎯 过关红旗 / 极限</small>
                <strong>
                  {level.targetPct}% / {level.maxTheoreticalPct}%
                </strong>
              </div>
            </div>

            <div className="sliders" style={{ marginTop: 14 }}>
              {[...offsets].map((val, idx) => {
                // Render sliders from top block down to bottom block so players naturally tune top-down!
                const revIdx = offsets.length - 1 - idx;
                const revVal = offsets[revIdx];
                return (
                  <Slider
                    key={revIdx}
                    label={`第 ${revIdx + 1} 层伸出`}
                    value={revVal}
                    min={0}
                    max={68}
                    step={1}
                    color={BLOCK_COLORS[revIdx % BLOCK_COLORS.length]}
                    format={fixed(0, "px")}
                    onChange={(nextVal) => setBlockOffset(revIdx, nextVal)}
                  />
                );
              })}
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={verifyCantilever}>
                🧱 松手检验悬空平衡！
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 调和级数秘诀
              </button>
            </div>
          </div>

          {feedback && wonStars === 0 && <DadSays text={feedback} />}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`无胶悬挑达到 ${pct.toFixed(1)}% 砖长！`}
              dadLine={level.win}
              note={`共 ${level.blockCount} 层石板，理论极限 ${level.maxTheoreticalPct}% L，所有子叠体重心均稳锁在支承边缘内！`}
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

export const cantilever: GameModule = { meta, Play: CantileverGame };
