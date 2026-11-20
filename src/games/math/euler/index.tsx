import { useEffect, useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { boards, covers, edgeKey, oddNodes } from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#7c6cf0";

export function EulerGame({ exit, sound, setSound }: GameProps) {
  const [boardId, setBoardId] = useState(boards[0].id);
  const [path, setPath] = useState<number[]>([]);
  const [slips, setSlips] = useState(0);
  const [wonStars, setWonStars] = useState(0);
  const [miss, setMiss] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const starMap = useGameStars("euler");
  const board = boards.find((item) => item.id === boardId) ?? boards[0];

  const used = new Set<string>();
  for (let i = 1; i < path.length; i++) used.add(edgeKey(path[i - 1], path[i]));

  const degrees = board.nodes.map((_, idx) =>
    board.edges.reduce((acc, [a, b]) => acc + (a === idx || b === idx ? 1 : 0), 0)
  );
  const odds = oddNodes(board.nodes.length, board.edges);
  const next = boards.find((item) => item.id > board.id);
  const lastNode = path.length > 0 ? path[path.length - 1] : null;

  const stuck =
    !wonStars &&
    lastNode !== null &&
    used.size < board.edges.length &&
    !board.edges.some(([a, b]) => (a === lastNode || b === lastNode) && !used.has(edgeKey(a, b)));

  useEffect(() => {
    if (sound) say(dad(`第${board.id}关，${board.title}。${board.hint}`));
  }, [board.id]);

  function load(id: number) {
    setBoardId(id);
    setPath([]);
    setSlips(0);
    setWonStars(0);
    setMiss(null);
    setShowHint(false);
  }

  function tap(index: number) {
    if (wonStars > 0) return;
    setMiss(null);
    if (path.length === 0) {
      setPath([index]);
      if (sound) chime(true);
      return;
    }
    const last = path[path.length - 1];
    if (index === last) return;
    const key = edgeKey(last, index);
    const exists = board.edges.some(([a, b]) => edgeKey(a, b) === key);
    if (!exists) {
      setSlips((n) => n + 1);
      setMiss("这两个圆点之间没有直接连线哦，点相邻的圆点试试！");
      if (sound) chime(false);
      return;
    }
    if (used.has(key)) {
      setSlips((n) => n + 1);
      setMiss("这条线已经描过啦！欧拉一笔画每条线只能走一次。");
      if (sound) chime(false);
      return;
    }
    const nextPath = [...path, index];
    setPath(nextPath);
    if (covers(board.edges, nextPath)) {
      const earned = slips === 0 ? 3 : slips <= 2 ? 2 : 1;
      setWonStars(earned);
      recordStars("euler", String(board.id), earned);
      if (sound) {
        chime(true);
        say(dad(earned === 3 ? "一气呵成！每条边都只走了一次！" : "一笔画通啦！掌握单数点秘诀还能拿满三星！"));
      }
    }
  }

  function tapEdge(a: number, b: number) {
    if (lastNode === null) {
      tap(odds.includes(b) && !odds.includes(a) ? b : a);
    } else if (lastNode === a) {
      tap(b);
    } else if (lastNode === b) {
      tap(a);
    }
  }

  const oddLabels = odds.map((i) => `${i + 1} 号点`).join(" 或 ");

  return (
    <div className="page">
      <TopBar
        emoji="✏️"
        title="一笔画 · 欧拉路径"
        onBack={exit}
        backLabel="数学思维馆"
        stars={sumStars(starMap)}
        maxStars={boards.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={boards.map((b) => ({ id: b.id, title: `${b.id}. ${b.title}`, stars: starMap[String(b.id)] ?? 0 }))}
        activeId={board.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${board.id} 关「${board.title}」：${board.hint}`} />

      <div className="workbench">
        <div className="card">
          <svg className="euler-svg" viewBox="0 0 100 100" aria-label={board.title}>
            {board.edges.map(([a, b]) => {
              const key = edgeKey(a, b);
              const on = used.has(key);
              const canStep =
                !on &&
                lastNode !== null &&
                (lastNode === a || lastNode === b);
              return (
                <g key={key}>
                  <line
                    x1={board.nodes[a].x}
                    y1={board.nodes[a].y}
                    x2={board.nodes[b].x}
                    y2={board.nodes[b].y}
                    className="euler-edge-bg"
                    style={canStep ? { stroke: "#c3baff", strokeDasharray: "2.5 2.5" } : undefined}
                  />
                  {on && (
                    <line
                      x1={board.nodes[a].x}
                      y1={board.nodes[a].y}
                      x2={board.nodes[b].x}
                      y2={board.nodes[b].y}
                      className="euler-edge-drawn"
                    />
                  )}
                  <line
                    x1={board.nodes[a].x}
                    y1={board.nodes[a].y}
                    x2={board.nodes[b].x}
                    y2={board.nodes[b].y}
                    className="euler-edge-clickable"
                    onClick={() => tapEdge(a, b)}
                  />
                </g>
              );
            })}

            {board.nodes.map((node, index) => {
              const isOdd = degrees[index] % 2 === 1;
              const startHere = path.length === 0 && (odds.length === 0 || isOdd);
              const isLast = lastNode === index;
              const canReach =
                lastNode !== null &&
                lastNode !== index &&
                board.edges.some(([a, b]) => edgeKey(a, b) === edgeKey(lastNode, index) && !used.has(edgeKey(a, b)));

              const fill = isLast ? "#ff9f43" : startHere ? "#fff4d6" : canReach ? "#eef5ff" : "#ffffff";
              const stroke = isLast ? "#d8662a" : isOdd ? "#ff6b6b" : "#7c6cf0";

              return (
                <g
                  key={index}
                  className="euler-node"
                  role="button"
                  tabIndex={0}
                  aria-label={`点 ${index + 1}，连着 ${degrees[index]} 条线`}
                  onClick={() => tap(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      tap(index);
                    }
                  }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isLast || startHere ? 7.6 : 6.2}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isLast || canReach ? 2.4 : 1.8}
                  />
                  <text
                    x={node.x}
                    y={node.y + 1.8}
                    textAnchor="middle"
                    fontSize="5.2"
                    fontWeight="700"
                    fill={isLast ? "#ffffff" : "#4a3b2a"}
                    pointerEvents="none"
                  >
                    {index + 1}
                  </text>
                  <text
                    x={node.x}
                    y={node.y - 8.6}
                    textAnchor="middle"
                    fontSize="3.6"
                    fontWeight="700"
                    fill={isOdd ? "#d94848" : "#6c7a96"}
                    pointerEvents="none"
                  >
                    {degrees[index]}线
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <Meter
              pct={Math.round((used.size / board.edges.length) * 100)}
              label="已描边数"
              valueText={`${used.size} / ${board.edges.length}`}
            />
            <div className="readout-grid" style={{ marginTop: 12 }}>
              <div className="readout-box">
                <small>单数线圆点</small>
                <strong style={{ color: odds.length > 0 ? "#ff6b6b" : "#3bb273" }}>
                  {odds.length === 0 ? "0 个（全双数）" : `${odds.length} 个`}
                </strong>
              </div>
              <div className="readout-box">
                <small>当前位置</small>
                <strong>{lastNode === null ? "等待落笔" : `${lastNode + 1} 号点`}</strong>
              </div>
            </div>
            <p className="note" style={{ marginTop: 10 }}>
              圆点上方写着它连了几条线。红圈圆点连着<strong>单数条线</strong>，蓝紫圆点连着<strong>双数条线</strong>。
            </p>
            <div className="play-actions">
              <button
                type="button"
                className="pill-btn"
                disabled={path.length === 0 || wonStars > 0}
                onClick={() => {
                  setSlips((n) => n + 1);
                  setPath((prev) => prev.slice(0, -1));
                  setMiss(null);
                }}
              >
                ↩ 退一步
              </button>
              <button type="button" className="pill-btn" onClick={() => load(board.id)}>
                🔄 重画本关
              </button>
              <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
                💡 欧拉秘诀
              </button>
            </div>
          </div>

          {miss && <p className="banner is-warn">{miss}</p>}
          {stuck && (
            <NianSays text={`哎呀，走到 ${lastNode! + 1} 号点没路出去啦！点「退一步」或者换个单数点重新出发试试！`} />
          )}

          {showHint && (
            <HintBox
              text={
                odds.length === 0
                  ? `这张图所有圆点都连着双数条线（一进一出刚好配对）！不管你从哪一点落笔，最后都能刚好回到起点。试试按 ${board.solution.slice(0, 3).map((i) => i + 1).join(" → ")} 走！`
                  : `大数学家欧拉发现：除起点和终点外，中间经过的点都是「一进一出」成双成对的。所以必须从单数点（${oddLabels}）出发！第一步试试 ${board.solution[0] + 1} → ${board.solution[1] + 1}。`
              }
            />
          )}
        </div>
      </div>

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={wonStars === 3 ? "零失误一笔画通！" : "成功画完所有边！"}
          dadLine={
            odds.length === 0
              ? `太棒啦！全双数点的图形叫「欧拉回路」，从 ${path[0] + 1} 号点出发，最后又稳稳回到了 ${path[path.length - 1] + 1} 号点！`
              : `看！你从单数点 ${path[0] + 1} 号出发，正好在另一个单数点 ${path[path.length - 1] + 1} 号收笔——这就是欧拉发现的一笔画定律！`
          }
          note={`路线：${path.map((i) => i + 1).join(" → ")}`}
          onRetry={() => load(board.id)}
          onNext={next ? () => load(next.id) : exit}
          nextLabel={next ? `下一关：${next.title} →` : "回数学馆 →"}
        />
      )}
    </div>
  );
}

export const euler = { meta, Play: EulerGame };
