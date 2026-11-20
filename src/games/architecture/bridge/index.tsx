import { useEffect, useRef, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { bridgeLevels, evaluateBridge, isBayTriangulated, type BridgeBar, type BridgeNode } from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#b45309";

function BridgeGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(bridgeLevels[0].id);
  const starMap = useGameStars("bridge");
  const level = bridgeLevels.find((l) => l.id === levelId) ?? bridgeLevels[0];

  const [activeBars, setActiveBars] = useState<string[]>([...level.startBars]);
  const [testing, setTesting] = useState(false);
  const [truckProg, setTruckProg] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [budgetNotice, setBudgetNotice] = useState(false);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function stopAnim() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function load(id: number) {
    stopAnim();
    const next = bridgeLevels.find((l) => l.id === id) ?? bridgeLevels[0];
    setLevelId(next.id);
    setActiveBars([...next.startBars]);
    setTesting(false);
    setTruckProg(0);
    setCollapsed(false);
    setBudgetNotice(false);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  function toggleSlot(slotId: string) {
    if (testing) return;
    setCollapsed(false);
    setTruckProg(0);
    setBudgetNotice(false);

    setActiveBars((prev) => {
      if (prev.includes(slotId)) {
        return prev.filter((id) => id !== slotId);
      }
      if (prev.length >= level.budget) {
        setBudgetNotice(true);
        if (sound) chime(false);
        return prev;
      }
      return [...prev, slotId];
    });
  }

  const evalRes = evaluateBridge(level, activeBars);

  function runTruckTest() {
    if (testing) return;
    stopAnim();
    setBudgetNotice(false);
    setCollapsed(false);
    setTruckProg(0);
    setTesting(true);

    const nextTries = tries + 1;
    setTries(nextTries);

    const res = evaluateBridge(level, activeBars);
    const firstFailBay = level.bays.find((b) => res.saggedBays.includes(b.id));
    const stopAt = res.passed
      ? 1.0
      : firstFailBay
        ? (firstFailBay.progressSpan[0] + firstFailBay.progressSpan[1]) * 0.5
        : 0.5;

    let startTs: number | null = null;
    const durationMs = res.passed ? 1650 : 950;

    const step = (ts: number) => {
      if (startTs === null) startTs = ts;
      const t = Math.min(1, (ts - startTs) / durationMs);
      const curProg = stopAt * t;
      setTruckProg(curProg);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setTesting(false);
        rafRef.current = null;
        if (res.passed) {
          let awarded = res.stars;
          if (nextTries === 2) awarded = Math.min(awarded, 2);
          if (nextTries >= 3) awarded = Math.min(awarded, 1);
          if (showHint) awarded = Math.min(awarded, 2);
          awarded = Math.max(1, awarded);
          setWonStars(awarded);
          recordStars("bridge", String(level.id), awarded);
          if (sound) {
            chime(true);
            say(dad(level.win));
          }
        } else {
          setCollapsed(true);
          if (sound) chime(false);
        }
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }

  // Compute node positions with parallelogram racking sag if collapsed
  const sagNodeSet = new Set<string>();
  if (collapsed) {
    for (const bay of level.bays) {
      if (!isBayTriangulated(bay, activeBars)) {
        for (const nid of bay.sagNodeIds) sagNodeSet.add(nid);
      }
    }
  }

  const nodeMap = new Map<string, { x: number; y: number; node: BridgeNode }>();
  for (const n of level.nodes) {
    const isSagging = sagNodeSet.has(n.id) && !n.support;
    const dx = isSagging ? 14 : 0;
    const dy = isSagging ? 24 : 0;
    nodeMap.set(n.id, { x: n.x + dx, y: n.y + dy, node: n });
  }

  // Deck y & x span for truck motion
  const deckBars = level.fixedBars.filter((b) => b.kind === "deck");
  const deckXs = deckBars.flatMap((b) => [
    level.nodes.find((n) => n.id === b.from)?.x ?? 60,
    level.nodes.find((n) => n.id === b.to)?.x ?? 300
  ]);
  const baseDeckY = level.nodes.find((n) => n.id === deckBars[0]?.from)?.y ?? 188;
  const minDeckX = Math.min(...deckXs) - 24;
  const maxDeckX = Math.max(...deckXs) + 24;
  const truckX = minDeckX + (maxDeckX - minDeckX) * truckProg;
  const elasticDip = testing && !collapsed ? Math.sin(truckProg * Math.PI) * 2.5 : 0;
  const truckY = baseDeckY + (collapsed ? 22 : elasticDip);
  const truckTilt = collapsed ? 16 : 0;

  const next = bridgeLevels.find((l) => l.id > level.id);

  function renderBar(bar: BridgeBar, isSlot: boolean, isActive: boolean) {
    const a = nodeMap.get(bar.from);
    const b = nodeMap.get(bar.to);
    if (!a || !b) return null;

    if (!isSlot) {
      const isDeck = bar.kind === "deck";
      return (
        <line
          key={bar.id}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={isDeck ? "#78350f" : "#475569"}
          strokeWidth={isDeck ? 7 : 5}
          strokeLinecap="round"
        />
      );
    }

    return (
      <g
        key={bar.id}
        style={{ cursor: testing ? "default" : "pointer" }}
        onClick={() => toggleSlot(bar.id)}
        role="button"
        tabIndex={0}
        aria-label={`${isActive ? "拆除" : "安装"}钢构件 ${bar.id}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleSlot(bar.id);
          }
        }}
      >
        {/* Wide invisible click target */}
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={18} strokeLinecap="round" />
        {isActive ? (
          <>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#f59e0b"
              strokeWidth={5.5}
              strokeLinecap="round"
            />
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#fef3c7"
              strokeWidth={1.6}
              strokeDasharray="6 6"
              strokeLinecap="round"
            />
          </>
        ) : (
          <line
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="rgba(180, 83, 9, 0.52)"
            strokeWidth={2.8}
            strokeDasharray="6 5"
            strokeLinecap="round"
          />
        )}
      </g>
    );
  }

  return (
    <div className="page">
      <TopBar
        emoji="🌉"
        title="造桥大师 · 三角桁架"
        onBack={exit}
        backLabel="建筑结构馆"
        stars={sumStars(starMap)}
        maxStars={bridgeLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={bridgeLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}>
          <svg
            viewBox="0 0 360 276"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`${level.title} 桁架桥实验台，已用 ${evalRes.usedBars}/${level.budget} 根钢材`}
          >
            <defs>
              <linearGradient id="skyGradBridge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dbeafe" />
                <stop offset="72%" stopColor="#eff6ff" />
                <stop offset="100%" stopColor="#e0f2fe" />
              </linearGradient>
              <linearGradient id="riverGradBridge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="360" height="276" rx="12" fill="url(#skyGradBridge)" />

            {/* River water */}
            <rect x="36" y="226" width="288" height="50" fill="url(#riverGradBridge)" />
            <path
              d="M 52 244 Q 82 238 112 244 T 172 244 T 232 244 T 292 244"
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="2"
            />
            <path
              d="M 70 260 Q 100 254 130 260 T 190 260 T 250 260 T 310 260"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.8"
            />

            {/* Left & Right stone cliffs / abutments */}
            <polygon points={`0,${baseDeckY} ${minDeckX + 24},${baseDeckY} ${minDeckX + 34},276 0,276`} fill="#94a3b8" />
            <polygon points={`0,${baseDeckY} ${minDeckX + 24},${baseDeckY} ${minDeckX + 24},${baseDeckY + 10} 0,${baseDeckY + 10}`} fill="#64748b" />
            <polygon points={`${maxDeckX - 24},${baseDeckY} 360,${baseDeckY} 360,276 ${maxDeckX - 34},276`} fill="#94a3b8" />
            <polygon points={`${maxDeckX - 24},${baseDeckY} 360,${baseDeckY} 360,${baseDeckY + 10} ${maxDeckX - 24},${baseDeckY + 10}`} fill="#64748b" />

            {/* Finish flag on right bank */}
            <text x="334" y={baseDeckY - 6} fontSize="16">
              🏁
            </text>

            {/* Toggleable dashed slots first (behind fixed bars & joints) */}
            {level.slots.map((slot) => renderBar(slot, true, activeBars.includes(slot.id)))}

            {/* Fixed frame bars */}
            {level.fixedBars.map((bar) => renderBar(bar, false, true))}

            {/* Pin / Roller supports & gusset plates (riveted joints) */}
            {Array.from(nodeMap.values()).map(({ x, y, node }) => {
              const sagged = sagNodeSet.has(node.id) && !node.support;
              return (
                <g key={node.id}>
                  {node.support === "pin" && (
                    <polygon
                      points={`${x},${y + 4} ${x - 8},${y + 15} ${x + 8},${y + 15}`}
                      fill="#334155"
                    />
                  )}
                  {node.support === "roller" && (
                    <g>
                      <polygon
                        points={`${x},${y + 4} ${x - 8},${y + 13} ${x + 8},${y + 13}`}
                        fill="#334155"
                      />
                      <circle cx={x - 4} cy={y + 16} r="2.2" fill="#1e293b" />
                      <circle cx={x + 4} cy={y + 16} r="2.2" fill="#1e293b" />
                    </g>
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r="6"
                    fill={sagged ? "#ef4444" : "#f8fafc"}
                    stroke={sagged ? "#991b1b" : "#1e293b"}
                    strokeWidth="2.4"
                  />
                </g>
              );
            })}

            {/* Heavy truck */}
            {(testing || collapsed || wonStars > 0 || truckProg > 0) ? (
              <g transform={`translate(${truckX}, ${truckY - 12}) rotate(${truckTilt})`}>
                <rect x="-18" y="-12" width="24" height="13" rx="3" fill="#dc2626" stroke="#fff" strokeWidth="1.2" />
                <rect x="6" y="-8" width="11" height="9" rx="2" fill="#f59e0b" stroke="#fff" strokeWidth="1.2" />
                <circle cx="-10" cy="3" r="4" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.2" />
                <circle cx="10" cy="3" r="4" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.2" />
                <text x="-15" y="-3" fontSize="7.5" fill="#fff" fontWeight="800">
                  {level.truckTons}t
                </text>
              </g>
            ) : (
              <g transform={`translate(${minDeckX + 6}, ${baseDeckY - 12})`}>
                <rect x="-18" y="-12" width="24" height="13" rx="3" fill="#dc2626" stroke="#fff" strokeWidth="1.2" />
                <rect x="6" y="-8" width="11" height="9" rx="2" fill="#f59e0b" stroke="#fff" strokeWidth="1.2" />
                <circle cx="-10" cy="3" r="4" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.2" />
                <circle cx="10" cy="3" r="4" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.2" />
                <text x="-15" y="-3" fontSize="7.5" fill="#fff" fontWeight="800">
                  {level.truckTons}t
                </text>
              </g>
            )}

            {collapsed && (
              <text x="180" y="48" textAnchor="middle" fontSize="12" fontWeight="800" fill="#dc2626">
                ⚠️ 空心四边形受压歪斜成平行四边形，桥面塌陷！
              </text>
            )}

            <text x="12" y="22" fontSize="11" fontWeight="700" fill="#334155">
              👆 点击棕色虚线安装或拆除钢杆（限额 {level.budget} 根）
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>🔩 钢材用量</small>
                <strong style={{ color: evalRes.usedBars > level.budget ? "#dc2626" : "#b45309" }}>
                  {evalRes.usedBars} / {level.budget} 根
                </strong>
              </div>
              <div className="readout-box">
                <small>📐 三角锁定桥格</small>
                <strong style={{ color: evalRes.stable ? "#16a34a" : "#d97706" }}>
                  {evalRes.triangulatedCount} / {evalRes.totalBays} 格
                </strong>
              </div>
            </div>

            <ul className="legend-list" style={{ marginTop: 12 }}>
              {level.bays.map((bay) => {
                const ok = isBayTriangulated(bay, activeBars);
                return (
                  <li key={bay.id}>
                    <i style={{ background: ok ? "#22c55e" : "#f97316" }} />
                    <span>{bay.label}</span>
                    <b style={{ color: ok ? "#15803d" : "#c2410c" }}>
                      {ok ? "△ 已锁定" : "▱ 易歪斜"}
                    </b>
                  </li>
                );
              })}
            </ul>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={runTruckTest} disabled={testing}>
                🚛 通车承重测试！
              </button>
              <button
                type="button"
                className="pill-btn"
                onClick={() => {
                  stopAnim();
                  setTesting(false);
                  setCollapsed(false);
                  setTruckProg(0);
                  setBudgetNotice(false);
                  setActiveBars([]);
                }}
                disabled={testing}
              >
                🧹 清空重搭
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 结构锦囊
              </button>
            </div>
          </div>

          {budgetNotice && (
            <NianSays text={`爸爸！本关钢材预算最多只有 ${level.budget} 根，先把多余的亮黄钢杆点一下拆下来，再装到别处吧！`} />
          )}

          {collapsed && wonStars === 0 && (
            <DadSays
              text={`哎呀！还有 ${evalRes.saggedBays.length} 个方格没围成闭合三角形，${level.truckTons} 吨卡车一压就歪斜下沉啦！快检查哪一格还缺斜撑或顶梁！`}
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`${level.truckTons} 吨重卡稳稳过江！`}
              dadLine={level.win}
              note={`耗用钢杆 ${evalRes.usedBars} 根（最优设计 ${level.optimalBars} 根），全部 ${evalRes.totalBays} 个节间完成三角刚性锁定！`}
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

export const bridge: GameModule = { meta, Play: BridgeGame };
