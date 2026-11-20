import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  analyzeSuspension,
  checkSuspensionGoal,
  suspensionLevels,
  type SuspensionState
} from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#b45309";

function SuspensionGame({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  const starMap = useGameStars("suspension");
  const [levelId, setLevelId] = useState(suspensionLevels[0].id);
  const level = suspensionLevels.find((l) => l.id === levelId) ?? suspensionLevels[0];

  const [state, setState] = useState<SuspensionState>(() => ({ ...level.start }));
  const [tries, setTries] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [wonStars, setWonStars] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  const mech = useMemo(() => analyzeSuspension(level, state), [level, state]);
  const passed = checkSuspensionGoal(level, state);

  function loadStage(id: number) {
    const next = suspensionLevels.find((l) => l.id === id) ?? suspensionLevels[0];
    setLevelId(next.id);
    setState({ ...next.start });
    setTries(0);
    setUsedHint(false);
    setWonStars(null);
  }

  function verifyBridge() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkSuspensionGoal(level, state)) {
      let stars = nextTries <= 1 ? 3 : nextTries <= 3 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      recordStars("suspension", level.id, stars);
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

  // Geometry on 560x320 canvas: deck at y=222, left tower x=136, right tower x=424 (span 288px = 400m)
  const deckY = 222;
  const pxPerM = 1.9;
  const towerTopY = deckY - state.towerHeightM * pxPerM;
  const midCableY = towerTopY + state.sagM * pxPerM;
  const quadControlY = 2 * midCableY - towerTopY;

  const cableColor = !mech.cableSafe || !mech.anchorSafe ? "#ef4444" : !mech.clearanceSafe ? "#facc15" : "#4ade80";

  // Suspender vertical hangers along parabola y(u) = towerTopY + 4 * sagPx * u * (1 - u)
  const hangers = useMemo(() => {
    const arr: { x: number; yTop: number }[] = [];
    for (let i = 1; i <= 11; i++) {
      const u = i / 12;
      const x = 136 + u * 288;
      const yTop = towerTopY + 4 * (state.sagM * pxPerM) * u * (1 - u);
      arr.push({ x, yTop });
    }
    return arr;
  }, [towerTopY, state.sagM]);

  const nextLevel = suspensionLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🌉"
        title="悬索大桥主缆 · 抛物线垂度与拉力"
        onBack={exit}
        backLabel="建筑结构馆"
        stars={sumStars(starMap)}
        maxStars={suspensionLevels.length * 3}
        settings={settings}
      />

      <StageStrip
        stages={suspensionLevels}
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
            aria-label={`悬索大桥受力图：最大钢缆拉力 ${mech.maxCableTensionMN} MN`}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, background: "#0c172b" }}
          >
            <text x={280} y={26} textAnchor="middle" fill="#f8fafc" fontSize={12.5} fontWeight={700}>
              主缆拉力 {mech.maxCableTensionMN}/{level.maxCableLimitMN}MN · 水平锚力 {mech.horizontalPullMN}MN · 净高 {mech.midClearanceM}m
              {level.maxBudgetMillion ? ` · 造价 ${mech.costMillion}/${level.maxBudgetMillion}M` : ""}
            </text>

            {/* Sea water below bridge */}
            <rect x={20} y={258} width={520} height={30} rx={8} fill="#0369a1" opacity={0.55} />

            {/* Left & Right Heavy Concrete Anchorages */}
            <polygon
              points="28,258 68,258 68,216 36,232"
              fill={mech.anchorSafe ? "#94a3b8" : "#ef4444"}
            />
            <polygon
              points="532,258 492,258 492,216 524,232"
              fill={mech.anchorSafe ? "#94a3b8" : "#ef4444"}
            />

            {/* Vertical suspender cables */}
            {hangers.map((h, idx) => (
              <line
                key={idx}
                x1={h.x}
                y1={Math.min(deckY, h.yTop)}
                x2={h.x}
                y2={deckY}
                stroke="#cbd5e1"
                strokeWidth={1.3}
                opacity={0.7}
              />
            ))}

            {/* Bridge deck */}
            <rect x={54} y={deckY - 4} width={452} height={9} rx={3} fill="#e2e8f0" />

            {/* Twin Bridge Towers */}
            <rect x={130} y={towerTopY} width={12} height={258 - towerTopY} rx={3} fill="#f59e0b" />
            <rect x={418} y={towerTopY} width={12} height={258 - towerTopY} rx={3} fill="#f59e0b" />

            {/* Backstays + Parabolic Main Cable */}
            <path
              d={`M 54 222 L 136 ${towerTopY.toFixed(1)} Q 280 ${quadControlY.toFixed(1)} 424 ${towerTopY.toFixed(1)} L 506 222`}
              fill="none"
              stroke={cableColor}
              strokeWidth={4.5}
              strokeLinecap="round"
            />

            {/* Sag dimension indicator */}
            <line
              x1={280}
              y1={towerTopY}
              x2={280}
              y2={midCableY}
              stroke="#fde047"
              strokeDasharray="4 3"
            />
            <text x={290} y={(towerTopY + midCableY) / 2 + 4} fill="#fde047" fontSize={11} fontWeight={700}>
              垂度 f={state.sagM}m
            </text>

            <text
              x={280}
              y={305}
              textAnchor="middle"
              fill={passed ? "#4ade80" : "#fca5a5"}
              fontSize={13}
              fontWeight={800}
            >
              {passed
                ? `✅ 结构全优通过！（垂跨比 f/L = 1/${(1 / mech.sagRatio).toFixed(1)}）`
                : !mech.cableSafe
                  ? `⚠️ 钢缆过载报警：${mech.maxCableTensionMN} MN > 上限 ${level.maxCableLimitMN} MN！请增大垂度！`
                  : !mech.anchorSafe
                    ? `⚠️ 两岸锚碇拔出报警：水平力 ${mech.horizontalPullMN} MN > ${level.maxAnchorLimitMN} MN！`
                    : !mech.clearanceSafe
                      ? `⚠️ 主缆擦碰桥面列车：净高 ${mech.midClearanceM}m < 安全线 ${level.minClearanceM}m！`
                      : `💰 造价超预算：${mech.costMillion} 百万元 > 上限 ${level.maxBudgetMillion} 百万元`}
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          {!level.lockTower && (
            <Slider
              label="桥塔高出桥面高度"
              value={state.towerHeightM}
              min={44}
              max={level.maxTowerM ?? 84}
              step={2}
              format={fixed(0, "m")}
              color="#f59e0b"
              onChange={(v) => {
                setState((s) => ({ ...s, towerHeightM: v }));
                setWonStars(null);
              }}
            />
          )}

          <Slider
            label="主缆跨中下垂深度 f"
            value={state.sagM}
            min={10}
            max={70}
            step={2}
            format={fixed(0, "m")}
            color="#38bdf8"
            onChange={(v) => {
              setState((s) => ({ ...s, sagM: v }));
              setWonStars(null);
            }}
          />

          <Meter
            label="结构安全裕度"
            pct={
              passed
                ? 100
                : Math.max(
                    15,
                    Math.round((level.maxCableLimitMN / Math.max(1, mech.maxCableTensionMN)) * 75)
                  )
            }
            valueText={`${mech.maxCableTensionMN} MN`}
          />

          <div className="play-actions">
            <button type="button" className="primary-btn" onClick={verifyBridge}>
              🌉 加载列车验桥
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

export const suspension: GameModule = { meta, Play: SuspensionGame };
