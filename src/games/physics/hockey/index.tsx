import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  checkHockeyGoal,
  electricFieldAt,
  hockeyLevels,
  simulatePuck
} from "./logic.ts";

const ACCENT = "#f59e0b";

function formatCharge(q: number): string {
  if (Math.abs(q) < 0.01) return "0 (不带电)";
  return `${q > 0 ? "+" : ""}${q.toFixed(1)} μC`;
}

function HockeyGame({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  const starMap = useGameStars("hockey");
  const [levelId, setLevelId] = useState(hockeyLevels[0].id);
  const level = hockeyLevels.find((l) => l.id === levelId) ?? hockeyLevels[0];

  const [charges, setCharges] = useState<number[]>(() => level.electrodes.map((e) => e.startQ));
  const [animIdx, setAnimIdx] = useState(0);
  const [tries, setTries] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [wonStars, setWonStars] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  const trace = useMemo(() => simulatePuck(level, charges), [level, charges]);

  useEffect(() => {
    setAnimIdx(0);
    const timer = window.setInterval(() => {
      setAnimIdx((prev) => (prev + 3 >= trace.points.length ? 0 : prev + 3));
    }, 32);
    return () => window.clearInterval(timer);
  }, [trace]);

  function loadStage(id: number) {
    const next = hockeyLevels.find((l) => l.id === id) ?? hockeyLevels[0];
    setLevelId(next.id);
    setCharges(next.electrodes.map((e) => e.startQ));
    setTries(0);
    setUsedHint(false);
    setWonStars(null);
  }

  function updateCharge(idx: number, val: number) {
    setCharges((prev) => prev.map((c, i) => (i === idx ? val : c)));
    setWonStars(null);
  }

  function verifyShot() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkHockeyGoal(level, charges)) {
      let stars = nextTries <= 1 ? 3 : nextTries <= 3 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      recordStars("hockey", level.id, stars);
      setWonStars(stars);
      if (sound) {
        chime(true);
        say(nian(level.cheer), dad(level.explain));
      }
    } else if (sound) {
      chime(false);
      say(dad(level.dadTip));
    }
  }

  const fieldGrid = useMemo(() => {
    const arrows: { x: number; y: number; dx: number; dy: number; mag: number }[] = [];
    for (let gx = 84; gx <= 468; gx += 64) {
      for (let gy = 56; gy <= 272; gy += 54) {
        const nearElectrode = level.electrodes.some((e) => Math.hypot(gx - e.x, gy - e.y) < 34);
        if (nearElectrode) continue;
        const { ax, ay } = electricFieldAt(gx, gy, level.electrodes, charges);
        const mag = Math.hypot(ax, ay);
        if (mag < 2) continue;
        const len = Math.min(18, 5 + Math.log10(1 + mag) * 5.2);
        arrows.push({ x: gx, y: gy, dx: (ax / mag) * len, dy: (ay / mag) * len, mag });
      }
    }
    return arrows;
  }, [level, charges]);

  const pathD = trace.points
    .map(([x, y], idx) => `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const puckNow = trace.points[Math.min(animIdx, trace.points.length - 1)] ?? [
    level.puckStart.x,
    level.puckStart.y
  ];
  const closeness =
    trace.outcome === "goal" ? 100 : Math.max(0, Math.round(100 - trace.minDistToGoal * 0.42));
  const statusLabel =
    trace.outcome === "goal"
      ? "🥅 弧线破门！"
      : trace.outcome === "wall"
        ? "🧊 撞上冰墙"
        : trace.outcome === "electrode"
          ? "⚡ 吸到电极上"
          : "↗️ 偏出球门";
  const nextLevel = hockeyLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🏒"
        title="电场冰球 · 库仑力曲线射门"
        onBack={exit}
        backLabel="声光电磁馆"
        stars={sumStars(starMap)}
        maxStars={hockeyLevels.length * 3}
        settings={settings}
      />

      <StageStrip
        stages={hockeyLevels}
        activeId={level.id}
        stars={starMap}
        color={ACCENT}
        onSelect={loadStage}
      />

      <DadSays text={level.story} />

      <section className="card workbench">
        <div className="workbench-canvas">
          <svg
            viewBox="0 0 560 320"
            role="img"
            aria-label={`电场冰球球场：当前状态 ${statusLabel}`}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, background: "#0f172a" }}
          >
            {/* Rink boundary */}
            <rect
              x={20}
              y={20}
              width={520}
              height={280}
              rx={18}
              fill="#111c33"
              stroke="#38bdf8"
              strokeWidth={2}
            />
            <line x1={280} y1={22} x2={280} y2={298} stroke="rgba(56, 189, 248, 0.16)" strokeWidth={2} strokeDasharray="6 6" />

            {/* Electric field vectors */}
            {fieldGrid.map((a, idx) => (
              <g key={idx} opacity={0.55}>
                <line
                  x1={a.x - a.dx * 0.5}
                  y1={a.y - a.dy * 0.5}
                  x2={a.x + a.dx * 0.5}
                  y2={a.y + a.dy * 0.5}
                  stroke="#93c5fd"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
                <circle cx={a.x + a.dx * 0.5} cy={a.y + a.dy * 0.5} r={2} fill="#fde047" />
              </g>
            ))}

            {/* Ice barrier walls */}
            {level.obstacles.map((box, idx) => (
              <rect
                key={idx}
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                rx={5}
                fill="#38bdf8"
                fillOpacity={0.35}
                stroke="#7dd3fc"
                strokeWidth={2}
              />
            ))}

            {/* Goal net on right */}
            <rect
              x={level.goal.x}
              y={level.goal.y - level.goal.halfH}
              width={24}
              height={level.goal.halfH * 2}
              rx={6}
              fill={trace.outcome === "goal" ? "rgba(46, 213, 115, 0.35)" : "rgba(250, 204, 21, 0.2)"}
              stroke={trace.outcome === "goal" ? "#2ed573" : "#facc15"}
              strokeWidth={3}
            />

            {/* Trajectory curve */}
            <path
              d={pathD}
              fill="none"
              stroke={trace.outcome === "goal" ? "#2ed573" : "#fb923c"}
              strokeWidth={3}
              strokeDasharray={trace.outcome === "goal" ? undefined : "6 5"}
            />

            {/* Field Electrodes */}
            {level.electrodes.map((el, idx) => {
              const q = charges[idx] ?? 0;
              const fill = q > 0.05 ? "#ef4444" : q < -0.05 ? "#3b82f6" : "#64748b";
              const sign = q > 0.05 ? "+" : q < -0.05 ? "−" : "0";
              const labelY = el.y < 120 ? el.y - 22 : el.y + 30;
              return (
                <g key={el.id}>
                  <circle
                    cx={el.x}
                    cy={el.y}
                    r={14 + Math.abs(q) * 1.4}
                    fill={fill}
                    fillOpacity={0.22}
                  />
                  <circle cx={el.x} cy={el.y} r={14} fill={fill} stroke="#ffffff" strokeWidth={2} />
                  <text
                    x={el.x}
                    y={el.y + 5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={14}
                    fontWeight={800}
                  >
                    {sign}
                  </text>
                  <text
                    x={el.x}
                    y={labelY}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize={12}
                    fontWeight={700}
                  >
                    {el.id} ({q > 0 ? `+${q}` : q})
                  </text>
                </g>
              );
            })}

            {/* Start launcher & animated positive puck */}
            <circle
              cx={level.puckStart.x}
              cy={level.puckStart.y}
              r={9}
              fill="none"
              stroke="#fca5a5"
              strokeDasharray="3 3"
            />
            <circle cx={puckNow[0]} cy={puckNow[1]} r={9} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />

            {/* Top HUD banner (non-overlapping single line) */}
            <text x={36} y={42} fill="#e2e8f0" fontSize={13} fontWeight={700}>
              正电冰球 (+1) · {statusLabel}
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          {level.electrodes.map((el, idx) => (
            <Slider
              key={el.id}
              label={el.label}
              value={charges[idx] ?? 0}
              min={-5}
              max={5}
              step={0.5}
              format={formatCharge}
              color={(charges[idx] ?? 0) >= 0 ? "#ef4444" : "#3b82f6"}
              onChange={(v) => updateCharge(idx, v)}
            />
          ))}

          <Meter label="射门准度" pct={closeness} valueText={statusLabel} />

          <div className="play-actions">
            <button type="button" className="primary-btn" onClick={verifyShot}>
              🏒 发射验证
            </button>
            <button
              type="button"
              className="pill-btn"
              onClick={() => {
                setUsedHint(true);
                if (sound) say(dad(level.dadTip));
              }}
            >
              💡 听爸爸提示
            </button>
          </div>

          {usedHint && <HintBox text={level.dadTip} />}
        </div>
      </section>

      {wonStars !== null && (
        <WinCard
          stars={wonStars}
          cheer={level.cheer}
          explain={level.explain}
          nextLabel={nextLevel ? `下一关 · ${nextLevel.title} →` : undefined}
          onNext={nextLevel ? () => loadStage(nextLevel.id) : undefined}
          onAgain={() => loadStage(level.id)}
        />
      )}
    </div>
  );
}

export const hockey: GameModule = {
  meta: {
    id: "hockey",
    title: "电场冰球",
    emoji: "🏒",
    category: "physics",
    tag: "库仑定律 · 静电偏转",
    blurb: "给场上电极充上正电或负电，用同种相斥、异种相吸隔空打出 S 形香蕉球破门！",
    maxStars: hockeyLevels.length * 3
  },
  Play: HockeyGame
};
