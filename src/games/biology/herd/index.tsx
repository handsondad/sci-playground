import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  POPULATION,
  checkHerdGoal,
  herdLevels,
  simulateSIR,
  type HerdState
} from "./logic.ts";

const ACCENT = "#3bb273";

function HerdGame({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  const starMap = useGameStars("herd");
  const [levelId, setLevelId] = useState(herdLevels[0].id);
  const level = herdLevels.find((l) => l.id === levelId) ?? herdLevels[0];

  const [state, setState] = useState<HerdState>(() => ({ ...level.start }));
  const [tries, setTries] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [wonStars, setWonStars] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  const sim = useMemo(() => simulateSIR(level.r0Basic, state), [level.r0Basic, state]);
  const passed = checkHerdGoal(level, state);

  function loadStage(id: number) {
    const next = herdLevels.find((l) => l.id === id) ?? herdLevels[0];
    setLevelId(next.id);
    setState({ ...next.start });
    setTries(0);
    setUsedHint(false);
    setWonStars(null);
  }

  function verifyDefense() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkHerdGoal(level, state)) {
      let stars = nextTries <= 1 ? 3 : nextTries <= 3 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      recordStars("herd", level.id, stars);
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

  // SIR 60-day curve area: x in [62..352], y in [48..258] (maxY scales dynamically to highlight hospital cap)
  const chartMaxN = level.id === 1 ? 360 : 240;
  const dayToX = (d: number) => 62 + (d / 60) * 290;
  const nToY = (n: number) => 258 - Math.min(1, n / chartMaxN) * 204;

  const infectedPath = sim.series
    .map((pt, idx) => `${idx === 0 ? "M" : "L"}${dayToX(pt.day).toFixed(1)},${nToY(pt.I).toFixed(1)}`)
    .join(" ");
  const infectedFill = `${infectedPath} L ${dayToX(60)} 258 L ${dayToX(0)} 258 Z`;

  const capY = nToY(level.hospitalCap);

  // Right-side 10x10 mini community dot matrix (each dot = 10 residents)
  const immuneDots = Math.round(state.vaccinePct);
  const infectedDots = Math.max(1, Math.round(sim.totalNewCases / 10));

  const nextLevel = herdLevels.find((l) => l.id > level.id);
  const effortSum = state.vaccinePct + state.hygienePct;

  return (
    <div className="page">
      <TopBar
        emoji="🛡️"
        title="免疫屏障实验室 · SIR 曲线与群体免疫"
        onBack={exit}
        backLabel="生命科学馆"
        stars={sumStars(starMap)}
        maxStars={herdLevels.length * 3}
        settings={settings}
      />

      <StageStrip
        stages={herdLevels}
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
            aria-label={`SIR 传染病曲线：有效传染数 Re=${sim.rEffective.toFixed(2)}，感染峰值 ${sim.peakInfected} 人`}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, background: "#0f172a" }}
          >
            <text x={280} y={26} textAnchor="middle" fill="#f8fafc" fontSize={13} fontWeight={700}>
              基础 R₀={level.r0Basic.toFixed(1)} → 有效传染数 Rₑ={sim.rEffective.toFixed(2)} · 峰值 {sim.peakInfected} 人 · 累计新发 {sim.totalNewCases} 人
            </text>

            {/* Left SIR infection curve chart */}
            <rect x={62} y={48} width={290} height={210} rx={10} fill="#131f36" stroke="#334155" />
            {[0, 0.5, 1].map((frac, idx) => {
              const val = Math.round(chartMaxN * frac);
              const y = nToY(val);
              return (
                <g key={idx}>
                  <line x1={62} y1={y} x2={352} y2={y} stroke="rgba(148,163,184,0.16)" strokeDasharray="4 4" />
                  <text x={54} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize={10}>
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Hospital capacity red line */}
            <line
              x1={62}
              y1={capY}
              x2={352}
              y2={capY}
              stroke="#f43f5e"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            <text x={346} y={Math.max(64, capY - 6)} textAnchor="end" fill="#fda4af" fontSize={10} fontWeight={700}>
              病床红线 {level.hospitalCap}
            </text>

            {/* Infected mountain curve */}
            <path d={infectedFill} fill="rgba(239, 68, 68, 0.26)" />
            <path
              d={infectedPath}
              fill="none"
              stroke={sim.peakInfected <= level.hospitalCap ? "#4ade80" : "#ef4444"}
              strokeWidth={3}
            />

            <text x={207} y={276} textAnchor="middle" fill="#94a3b8" fontSize={11}>
              0 ~ 60 天在校与社区感染人数曲线 I(t)
            </text>

            {/* Right 10x10 Town Crowd Shield Matrix (each dot = 10 of 1000 residents) */}
            <text x={456} y={60} textAnchor="middle" fill="#cbd5e1" fontSize={11} fontWeight={700}>
              小镇 {POPULATION} 人缩影（蓝=免疫盾）
            </text>
            {Array.from({ length: 100 }).map((_, idx) => {
              const r = Math.floor(idx / 10);
              const c = idx % 10;
              let fill = "#cbd5e1"; // susceptible
              if (idx < immuneDots) {
                fill = "#38bdf8"; // vaccinated shield
              } else if (idx < immuneDots + infectedDots) {
                fill = "#ef4444"; // infected during outbreak
              } else {
                fill = "#4ade80"; // stayed safe without catching virus
              }
              return (
                <circle
                  key={idx}
                  cx={384 + c * 16}
                  cy={80 + r * 16}
                  r={5.2}
                  fill={fill}
                />
              );
            })}

            <text
              x={280}
              y={304}
              textAnchor="middle"
              fill={passed ? "#4ade80" : "#fde047"}
              fontSize={13}
              fontWeight={800}
            >
              {passed
                ? `✅ 防疫达标！Rₑ=${sim.rEffective.toFixed(2)}，稳稳护住全镇居民！`
                : level.maxCombinedEffort !== undefined && effortSum > level.maxCombinedEffort
                  ? `⚠️ 预算超标：两项合计 ${effortSum}%（上限 ${level.maxCombinedEffort}%）`
                  : `🧪 待优化：峰值 ${sim.peakInfected}/${level.hospitalCap} 人${level.maxNewCases ? ` · 新发 ${sim.totalNewCases}/${level.maxNewCases} 人` : ""}`}
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          {!level.lockVaccine && (
            <Slider
              label="疫苗免疫覆盖率"
              value={state.vaccinePct}
              min={0}
              max={level.maxVaccinePct ?? 90}
              step={2}
              format={fixed(0, "%")}
              color="#38bdf8"
              onChange={(v) => {
                setState((s) => ({ ...s, vaccinePct: v }));
                setWonStars(null);
              }}
            />
          )}

          {!level.lockHygiene && (
            <Slider
              label="通风洗手与口罩防护率"
              value={state.hygienePct}
              min={0}
              max={level.maxHygienePct ?? 60}
              step={2}
              format={fixed(0, "%")}
              color="#3bb273"
              onChange={(v) => {
                setState((s) => ({ ...s, hygienePct: v }));
                setWonStars(null);
              }}
            />
          )}

          <Meter
            label="防疫安全度"
            pct={passed ? 100 : Math.max(15, Math.round(100 - (sim.peakInfected - level.hospitalCap) * 0.6))}
            valueText={`Rₑ = ${sim.rEffective.toFixed(2)}`}
          />

          <div className="play-actions">
            <button type="button" className="primary-btn" onClick={verifyDefense}>
              🛡️ 启动 60 天推演
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

export const herd: GameModule = {
  meta: {
    id: "herd",
    title: "免疫屏障实验室",
    emoji: "🛡️",
    category: "biology",
    tag: "SIR 模型 · 群体免疫",
    blurb: "拨动疫苗接种率与日常卫生防护，看懂基本传染数 R₀ 与『群体免疫盾牌』怎样守护全镇居民！",
    maxStars: herdLevels.length * 3
  },
  Play: HerdGame
};
