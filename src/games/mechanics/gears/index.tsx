import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  GEAR_SIZES,
  INPUT_RPM,
  buildGearPath,
  checkGearGoal,
  gearLevels,
  gearRatio,
  outputDirection
} from "./logic.ts";

const ACCENT = "#ea580c";
const MODULE_PX = 1.65;
const CY = 144;

function GearsGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(gearLevels[0].id);
  const starMap = useGameStars("gears");
  const level = gearLevels.find((l) => l.id === levelId) ?? gearLevels[0];

  const [teethList, setTeethList] = useState<number[]>([...level.startTeeth]);
  const [driverDeg, setDriverDeg] = useState(0);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  useEffect(() => {
    let raf = 0;
    let last: number | null = null;
    const tick = (ts: number) => {
      if (last !== null) {
        const dt = (ts - last) / 1000;
        // Smooth visual rotation: 90 deg/sec for 60 RPM driver shaft
        setDriverDeg((prev) => (prev + dt * 90) % 36000);
      }
      last = ts;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function load(id: number) {
    const next = gearLevels.find((l) => l.id === id) ?? gearLevels[0];
    setLevelId(next.id);
    setTeethList([...next.startTeeth]);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  function setShaftTeeth(shaftIndex: number, teeth: number) {
    setTeethList((prev) => prev.map((t, i) => (i === shaftIndex ? teeth : t)));
  }

  function toggleIdler() {
    setTeethList((prev) => (prev.length === 2 ? [prev[0], 16, prev[1]] : [prev[0], prev[prev.length - 1]]));
  }

  const ratio = gearRatio(teethList);
  const outDir = outputDirection(teethList);
  const outRpm = Math.round(INPUT_RPM * ratio);
  const torqueMul = ratio > 0 ? 1 / ratio : 0;

  const gearVisuals = useMemo(() => {
    const radii = teethList.map((t) => t * MODULE_PX);
    const totalSpan =
      radii.reduce((acc, r) => acc + r * 2, 0);
    const startX = (390 - totalSpan) / 2 + radii[0];

    const centers: number[] = [startX];
    const rotations: number[] = [driverDeg];

    for (let i = 1; i < teethList.length; i++) {
      centers.push(centers[i - 1] + radii[i - 1] + radii[i]);
      const prevRot = rotations[i - 1];
      const nPrev = teethList[i - 1];
      const nCurr = teethList[i];
      // Exact tooth-to-valley interlocking phase formula
      rotations.push(180 - (prevRot * (nPrev / nCurr) + 180 / nCurr));
    }

    return teethList.map((teeth, idx) => ({
      teeth,
      radius: radii[idx],
      cx: centers[idx],
      rotDeg: rotations[idx],
      dir: idx % 2 === 0 ? "cw" : "ccw",
      path: buildGearPath(teeth, radii[idx])
    }));
  }, [teethList, driverDeg]);

  function verifyGearbox() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkGearGoal(level, teethList)) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("gears", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const next = gearLevels.find((l) => l.id > level.id);
  const hasIdler = teethList.length === 3;
  const shaftNames = hasIdler
    ? ["主动轮 A", "中间惰轮 B", "从动轮 C"]
    : ["主动轮 A", "从动轮 C"];

  return (
    <div className="page">
      <TopBar
        emoji="⚙️"
        title="齿轮变速箱 · 齿数比与传动转向"
        onBack={exit}
        backLabel="机械动力馆"
        stars={sumStars(starMap)}
        maxStars={gearLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={gearLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#141821", borderColor: "#475569" }}>
          <svg
            viewBox="0 0 390 286"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`齿轮箱：齿数 ${teethList.join(" - ")}，输出倍率 ${ratio.toFixed(2)} 倍`}
          >
            <rect x="0" y="0" width="390" height="286" rx="12" fill="#0f141d" />

            {/* Steel Mounting Rail */}
            <rect x="28" y={CY - 8} width="334" height="16" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />

            {gearVisuals.map((g, idx) => {
              const colors = hasIdler
                ? [
                    { fill: "#f59e0b", stroke: "#fef08a" },
                    { fill: "#38bdf8", stroke: "#bae6fd" },
                    { fill: "#4ade80", stroke: "#bbf7d0" }
                  ]
                : [
                    { fill: "#f59e0b", stroke: "#fef08a" },
                    { fill: "#4ade80", stroke: "#bbf7d0" }
                  ];
              const palette = colors[idx];
              const shaftRpm = Math.round(INPUT_RPM * (teethList[0] / g.teeth));
              const maxR = Math.max(...gearVisuals.map((v) => v.radius));
              const isFirst = idx === 0;
              const isLast = idx === gearVisuals.length - 1;
              const anchor = isFirst ? "end" : isLast ? "start" : "middle";
              const labelX = isFirst ? g.cx - 6 : isLast ? g.cx + 6 : g.cx;
              const topY = !isFirst && !isLast ? CY - maxR - 30 : CY - maxR - 12;
              const botY = !isFirst && !isLast ? CY + maxR + 42 : CY + maxR + 16;
              return (
                <g key={idx}>
                  <g transform={`translate(${g.cx.toFixed(2)}, ${CY}) rotate(${g.rotDeg.toFixed(2)})`}>
                    <path d={g.path} fill={palette.fill} stroke={palette.stroke} strokeWidth="1.2" />
                    <circle cx="0" cy="0" r={Math.max(5, g.radius * 0.52)} fill="#1e293b" opacity="0.55" />
                    {/* Spokes */}
                    {[0, 90, 180, 270].map((sp) => (
                      <line
                        key={sp}
                        x1="0"
                        y1="0"
                        x2={Math.cos((sp * Math.PI) / 180) * Math.max(5, g.radius * 0.52)}
                        y2={Math.sin((sp * Math.PI) / 180) * Math.max(5, g.radius * 0.52)}
                        stroke={palette.stroke}
                        strokeWidth="2"
                      />
                    ))}
                    <circle cx="0" cy="0" r="4.5" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
                  </g>

                  <text
                    x={labelX}
                    y={topY}
                    textAnchor={anchor}
                    fontSize="10.5"
                    fontWeight="800"
                    fill={palette.stroke}
                  >
                    {g.dir === "cw" ? "↻ 顺时针" : "↺ 逆时针"}
                  </text>
                  <text
                    x={labelX}
                    y={botY}
                    textAnchor={anchor}
                    fontSize="10.5"
                    fontWeight="700"
                    fill="#f8fafc"
                  >
                    {shaftNames[idx]} ({g.teeth}齿)
                  </text>
                  <text
                    x={labelX}
                    y={botY + 13}
                    textAnchor={anchor}
                    fontSize="9.5"
                    fill="#94a3b8"
                  >
                    {shaftRpm} RPM
                  </text>
                </g>
              );
            })}

            <text x="14" y="23" fontSize="11.5" fontWeight="800" fill="#e2e8f0">
              ⚙️ 输入轴 A：60 RPM 顺时针 → 末轮 C：{outRpm} RPM {outDir === "cw" ? "顺时针" : "逆时针"}
            </text>
            <text x="14" y="274" fontSize="10.5" fill="#94a3b8">
              齿数比公式：ω_出 / ω_入 = N_主动({teethList[0]}) ÷ N_末轮({teethList[teethList.length - 1]}) = {ratio.toFixed(2)}× · 扭矩 {torqueMul.toFixed(2)}×
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>末轮转速比</small>
                <strong style={{ color: Math.abs(ratio - level.targetRatio) < 0.01 ? "#16a34a" : "#ea580c" }}>
                  {ratio.toFixed(2)}× ({outRpm} RPM)
                </strong>
              </div>
              <div className="readout-box">
                <small>末轮转向</small>
                <strong style={{ color: !level.targetDirection || outDir === level.targetDirection ? "#2563eb" : "#dc2626" }}>
                  {outDir === "cw" ? "↻ 顺时针" : "↺ 逆时针"}
                </strong>
              </div>
            </div>

            <div className="play-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className={`pill-btn${hasIdler ? " is-active" : ""}`}
                onClick={toggleIdler}
              >
                {hasIdler ? "➖ 拆下中间惰轮 B（改双轴）" : "➕ 装上中间惰轮 B（改三轴）"}
              </button>
            </div>

            {teethList.map((t, shaftIdx) => (
              <div key={shaftIdx} style={{ marginTop: 10 }}>
                <small style={{ fontWeight: 700, color: "#5d4e37" }}>
                  🔩 {shaftNames[shaftIdx]} 齿数：
                </small>
                <div className="play-actions" style={{ marginTop: 5, gap: 8 }}>
                  {GEAR_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`pill-btn${t === size ? " is-active" : ""}`}
                      style={{ padding: "5px 12px" }}
                      onClick={() => setShaftTeeth(shaftIdx, size)}
                    >
                      {size} 齿
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={verifyGearbox}>
                ⚙️ 啮合锁定变速箱！
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 机械师口诀
              </button>
            </div>
          </div>

          {tries > 0 && wonStars === 0 && (
            <NianSays
              text={
                level.targetDirection && outDir !== level.targetDirection
                  ? `末轮现在是${outDir === "cw" ? "顺时针" : "逆时针"}，跟目标转向相反啦！想想需不需要加减一个中间惰轮 B？`
                  : `现在输出转速是 ${ratio.toFixed(2)}×，目标是 ${level.targetRatio.toFixed(2)}×，再换一组主动轮和末轮齿数试试！`
              }
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`${teethList.map((n) => `${n}齿`).join(" → ")} 完美传动！`}
              dadLine={level.win}
              note={`输出转速：${ratio.toFixed(2)}× (${outRpm} RPM) · 转向：${outDir === "cw" ? "顺时针" : "逆时针"} · 扭矩放大：${torqueMul.toFixed(2)}×`}
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

export const gears: GameModule = {
  meta: {
    id: "gears",
    title: "齿轮变速箱",
    category: "mechanics",
    emoji: "⚙️",
    tag: "齿数比 · 传动转向",
    blurb: "混搭 8 齿到 32 齿大小齿轮与中间惰轮，既能造出三倍速小风车，也能造出四倍扭力爬坡绞车。",
    maxStars: gearLevels.length * 3
  },
  Play: GearsGame
};
