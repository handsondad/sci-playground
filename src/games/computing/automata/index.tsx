import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  GRID_COLS,
  GRID_ROWS,
  automataLevels,
  checkAutomataGoal,
  runForestAutomata,
  type AutomataState
} from "./logic.ts";

const ACCENT = "#14b8a6";

function AutomataGame({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  const starMap = useGameStars("automata");
  const [levelId, setLevelId] = useState(automataLevels[0].id);
  const level = automataLevels.find((l) => l.id === levelId) ?? automataLevels[0];

  const [state, setState] = useState<AutomataState>(() => ({ ...level.start }));
  const [stepCursor, setStepCursor] = useState(99);
  const [tries, setTries] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [wonStars, setWonStars] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  const sim = useMemo(() => runForestAutomata(level.seed, state), [level.seed, state]);
  const passed = checkAutomataGoal(level, state);

  useEffect(() => {
    setStepCursor(0);
    const id = window.setInterval(() => {
      setStepCursor((prev) => (prev > sim.maxStep + 6 ? 0 : prev + 1));
    }, 110);
    return () => window.clearInterval(id);
  }, [sim]);

  function loadStage(id: number) {
    const next = automataLevels.find((l) => l.id === id) ?? automataLevels[0];
    setLevelId(next.id);
    setState({ ...next.start });
    setTries(0);
    setUsedHint(false);
    setWonStars(null);
  }

  function verifySimulation() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkAutomataGoal(level, state)) {
      let stars = nextTries <= 1 ? 3 : nextTries <= 3 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      recordStars("automata", level.id, stars);
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

  const cellSize = 20;
  const gridLeft = 96;
  const gridTop = 42;
  const nextLevel = automataLevels.find((l) => l.id > level.id);

  const statusText =
    level.mode === "percolate"
      ? sim.reachedEast
        ? "⚡ 信号已贯通东岸走廊！"
        : "⛔ 尚未连成贯通走廊"
      : sim.reachedEast
        ? "🔥 警报：山火烧到了东岸村庄！"
        : `🌲 东岸安全！幸存绿树 ${sim.survivingTrees} 棵（目标 ≥ ${level.minSurvivingTrees}）`;

  return (
    <div className="page">
      <TopBar
        emoji="🌲"
        title="元胞森林防火 · 59% 逾渗相变"
        onBack={exit}
        backLabel="计算逻辑馆"
        stars={sumStars(starMap)}
        maxStars={automataLevels.length * 3}
        settings={settings}
      />

      <StageStrip
        stages={automataLevels}
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
            aria-label={`元胞森林网格：${statusText}`}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, background: "#0f172a" }}
          >
            <text x={280} y={26} textAnchor="middle" fill="#e2e8f0" fontSize={13} fontWeight={700}>
              密度 {state.densityPct}% · 种树 {sim.plantedTrees} 棵 · 烧毁 {sim.burnedTrees} 棵 · 幸存 {sim.survivingTrees} 棵
            </text>

            {/* West lightning edge & East village edge */}
            <text x={52} y={164} textAnchor="middle" fill="#fb923c" fontSize={12} fontWeight={800}>
              ⚡西岸火源
            </text>
            <text
              x={508}
              y={164}
              textAnchor="middle"
              fill={sim.reachedEast ? (level.mode === "percolate" ? "#4ade80" : "#ef4444") : "#38bdf8"}
              fontSize={12}
              fontWeight={800}
            >
              {level.mode === "percolate" ? "📡东岸基站" : "🏡东岸村庄"}
            </text>

            {/* 18 x 12 Cellular Grid */}
            {Array.from({ length: GRID_ROWS }).map((_, r) =>
              Array.from({ length: GRID_COLS }).map((__, c) => {
                const initCell = sim.initialGrid[r][c];
                const bStep = sim.burnStepGrid[r][c];
                let fill = "#1e293b"; // empty soil
                if (initCell === "trench") {
                  fill = "#0284c7"; // firebreak water/trench
                } else if (initCell === "tree") {
                  if (bStep >= 0 && bStep <= stepCursor) {
                    fill = bStep === stepCursor ? "#facc15" : level.mode === "percolate" ? "#38bdf8" : "#ef4444";
                  } else {
                    fill = "#22c55e";
                  }
                }
                return (
                  <rect
                    key={`${r}-${c}`}
                    x={gridLeft + c * cellSize}
                    y={gridTop + r * cellSize}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    rx={3}
                    fill={fill}
                  />
                );
              })
            )}

            <text
              x={280}
              y={304}
              textAnchor="middle"
              fill={passed ? "#4ade80" : "#fde047"}
              fontSize={13}
              fontWeight={800}
            >
              {statusText}
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          {!level.lockDensity && (
            <Slider
              label="森林植树密度 p"
              value={state.densityPct}
              min={30}
              max={level.maxDensityPct ?? 86}
              step={2}
              format={fixed(0, "%")}
              color="#22c55e"
              onChange={(v) => {
                setState((s) => ({ ...s, densityPct: v }));
                setWonStars(null);
              }}
            />
          )}

          {!level.lockTrench && (
            <>
              <Slider
                label="防火沟所在列"
                value={state.trenchCol}
                min={2}
                max={15}
                step={1}
                format={fixed(0, "列")}
                color="#0ea5e9"
                onChange={(v) => {
                  setState((s) => ({ ...s, trenchCol: v }));
                  setWonStars(null);
                }}
              />
              <Slider
                label="防火沟开挖长度"
                value={state.trenchRows}
                min={0}
                max={level.maxTrenchRows ?? GRID_ROWS}
                step={1}
                format={fixed(0, "行")}
                color="#38bdf8"
                onChange={(v) => {
                  setState((s) => ({ ...s, trenchRows: v }));
                  setWonStars(null);
                }}
              />
            </>
          )}

          <Meter
            label={level.mode === "percolate" ? "走廊贯通度" : "护林达标度"}
            pct={
              passed
                ? 100
                : level.mode === "percolate"
                  ? 40
                  : Math.min(95, Math.round((sim.survivingTrees / (level.minSurvivingTrees ?? 80)) * 85))
            }
            valueText={level.mode === "percolate" ? (sim.reachedEast ? "已贯通" : "未贯通") : `${sim.survivingTrees} 棵`}
          />

          <div className="play-actions">
            <button type="button" className="primary-btn" onClick={verifySimulation}>
              🌲 点火推演验证
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

export const automata: GameModule = {
  meta: {
    id: "automata",
    title: "元胞森林防火",
    emoji: "🌲",
    category: "computing",
    tag: "元胞自动机 · 逾渗相变",
    blurb: "四邻域网格模拟山火蔓延：亲眼看见 59% 逾渗相变临界点，规划防火隔离沟守护整片森林！",
    maxStars: automataLevels.length * 3
  },
  Play: AutomataGame
};
