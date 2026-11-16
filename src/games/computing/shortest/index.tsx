import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  dijkstraShortestCost,
  neighborsOf,
  pathCost,
  shortestLevels,
  type IslandEdge
} from "./logic.ts";

const ACCENT = "#14b8a6";

function edgeOnPath(path: readonly string[], a: string, b: string): boolean {
  for (let i = 1; i < path.length; i++) {
    if ((path[i - 1] === a && path[i] === b) || (path[i - 1] === b && path[i] === a)) {
      return true;
    }
  }
  return false;
}

function edgeStyle(edge: IslandEdge, active: boolean) {
  if (active) return { stroke: "#4ade80", width: 5, dash: undefined };
  if (edge.terrain === "mud") return { stroke: "#b45309", width: 3.5, dash: "6 4" };
  if (edge.terrain === "cliff") return { stroke: "#ef4444", width: 3.5, dash: "3 3" };
  return { stroke: "#38bdf8", width: 3.2, dash: undefined };
}

function ShortestGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(shortestLevels[0].id);
  const starMap = useGameStars("shortest");
  const level = shortestLevels.find((l) => l.id === levelId) ?? shortestLevels[0];

  const [path, setPath] = useState<string[]>([level.start]);
  const [tries, setTries] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = shortestLevels.find((l) => l.id === id) ?? shortestLevels[0];
    setLevelId(next.id);
    setPath([next.start]);
    setTries(0);
    setFeedback(null);
    setShowHint(false);
    setWonStars(0);
  }

  const currentNode = path[path.length - 1];
  const reachable = neighborsOf(level.edges, currentNode);
  const currentCost = pathCost(level.edges, path);
  const optimalCost = dijkstraShortestCost(level.nodes, level.edges, level.start, level.end);
  const reachedGoal = currentNode === level.end;

  function clickIsland(nodeId: string) {
    if (wonStars > 0) return;
    setFeedback(null);
    if (path.length >= 2 && path[path.length - 2] === nodeId) {
      setPath((prev) => prev.slice(0, -1));
      return;
    }
    if (nodeId === currentNode) return;
    if (!reachable.includes(nodeId)) {
      setFeedback(`从当前位置 ${currentNode} 没有直通 ${nodeId} 的航道哦！请点闪着绿圈的相邻小岛一步步前进。`);
      return;
    }
    if (path.includes(nodeId)) {
      const idx = path.indexOf(nodeId);
      setPath((prev) => prev.slice(0, idx + 1));
      return;
    }
    setPath((prev) => [...prev, nodeId]);
  }

  function stepBack() {
    if (wonStars > 0 || path.length <= 1) return;
    setFeedback(null);
    setPath((prev) => prev.slice(0, -1));
  }

  function resetPath() {
    if (wonStars > 0) return;
    setFeedback(null);
    setPath([level.start]);
  }

  function confirmRoute() {
    if (!reachedGoal) {
      setFeedback(`船还没开到终点【${level.end}】呢！继续点相邻小岛抵达终点再确认航线。`);
      return;
    }
    const nextTries = tries + 1;
    setTries(nextTries);
    if (currentCost <= optimalCost) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("shortest", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else {
      if (sound) chime(false);
      setFeedback(
        `你走的路线 ${path.join(" → ")} 总共耗时 ${currentCost} 分钟，但迪杰斯特拉最短路只要 ${optimalCost} 分钟！点『退一步』或『重选航线』再找找更快的走法！`
      );
    }
  }

  const nodeById = Object.fromEntries(level.nodes.map((n) => [n.id, n]));
  const next = shortestLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🧭"
        title="最短寻宝路 · 图论权重与 Dijkstra"
        onBack={exit}
        backLabel="计算逻辑馆"
        stars={sumStars(starMap)}
        maxStars={shortestLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={shortestLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#081c2e", borderColor: "#1d4e6e", color: "#e2e8f0" }}>
          <svg
            viewBox="0 0 360 288"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`海岛寻宝航线图，当前路径 ${path.join("到")}，耗时 ${currentCost} 分钟`}
          >
            <rect x="0" y="0" width="360" height="288" rx="12" fill="#061626" />
            <text x="12" y="19" fontSize="10" fill="#94a3b8" fontWeight="700">
              🗺️ 蓝线=畅通航道 · 棕虚线=泥潭慢路 · 红点线=高山险路（点相邻岛前进）
            </text>

            {/* Edges & Weights */}
            {level.edges.map((edge) => {
              const a = nodeById[edge.from];
              const b = nodeById[edge.to];
              if (!a || !b) return null;
              const active = edgeOnPath(path, edge.from, edge.to);
              const st = edgeStyle(edge, active);
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              return (
                <g key={`${edge.from}-${edge.to}`}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={st.stroke}
                    strokeWidth={st.width}
                    strokeDasharray={st.dash}
                    strokeLinecap="round"
                  />
                  <rect
                    x={mx - 15}
                    y={my - 10}
                    width="30"
                    height="19"
                    rx="7"
                    fill={active ? "#14532d" : "#0f172a"}
                    stroke={active ? "#4ade80" : st.stroke}
                    strokeWidth="1.5"
                  />
                  <text
                    x={mx}
                    y={my + 3.5}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="800"
                    fill={active ? "#86efac" : "#fde047"}
                  >
                    {edge.cost}分
                  </text>
                </g>
              );
            })}

            {/* Island Nodes */}
            {level.nodes.map((node) => {
              const visited = path.includes(node.id);
              const isCurrent = node.id === currentNode;
              const isNextOption = !visited && reachable.includes(node.id);
              const isEnd = node.id === level.end;
              return (
                <g
                  key={node.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => clickIsland(node.id)}
                >
                  {isNextOption && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="25"
                      fill="none"
                      stroke="#2dd4bf"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="20"
                    fill={
                      isCurrent
                        ? "#14b8a6"
                        : visited
                          ? "#15803d"
                          : isEnd
                            ? "#78350f"
                            : "#1e293b"
                    }
                    stroke={
                      isCurrent
                        ? "#fef08a"
                        : visited
                          ? "#4ade80"
                          : isEnd
                            ? "#fbbf24"
                            : "#64748b"
                    }
                    strokeWidth="2.4"
                  />
                  <text x={node.x} y={node.y + 5} textAnchor="middle" fontSize="14">
                    {node.emoji}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 33}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="800"
                    fill={isCurrent ? "#fde047" : "#e2e8f0"}
                  >
                    {node.id}·{node.name}
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
                <small>当前航线耗时</small>
                <strong
                  style={{
                    color:
                      reachedGoal && currentCost <= optimalCost
                        ? "#16a34a"
                        : reachedGoal
                          ? "#dc2626"
                          : "#0d9488"
                  }}
                >
                  {currentCost} 分钟（{path.length - 1} 步）
                </strong>
              </div>
              <div className="readout-box">
                <small>🏆 Dijkstra 最短目标</small>
                <strong>{optimalCost} 分钟</strong>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                padding: "9px 12px",
                borderRadius: 12,
                background: "#f8fafc",
                border: "2px solid #e2e8f0",
                fontSize: 13.5,
                fontWeight: 700
              }}
            >
              🧭 当前航迹：{path.map((id) => `${id}(${nodeById[id]?.name ?? id})`).join(" → ")}
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="primary-btn"
                onClick={confirmRoute}
                disabled={!reachedGoal || wonStars > 0}
              >
                🚩 抵达终点核验耗时！
              </button>
              <button type="button" className="pill-btn" onClick={stepBack} disabled={path.length <= 1 || wonStars > 0}>
                ↩️ 退一步
              </button>
              <button type="button" className="pill-btn" onClick={resetPath} disabled={path.length <= 1 || wonStars > 0}>
                🔄 重选航线
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 寻路提示
              </button>
            </div>
          </div>

          {feedback && wonStars === 0 && <DadSays text={feedback} />}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`找到 ${optimalCost} 分钟黄金最短航线：${path.join(" → ")}！`}
              dadLine={level.win}
              note={`最短路核验：你的耗时 ${currentCost} 分钟 = Dijkstra 全局最优解 ${optimalCost} 分钟`}
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

export const shortest: GameModule = {
  meta: {
    id: "shortest",
    title: "最短寻宝路",
    category: "computing",
    emoji: "🧭",
    tag: "图论权重 · Dijkstra",
    blurb: "在海岛航线图上绕开烂泥近道与贪心雪山坑，跑出耗时最短的 Dijkstra 黄金路线。",
    maxStars: 12
  },
  Play: ShortestGame
};
