import { useEffect, useRef, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { checkMatterGoal, matterLevels, phaseLabel, phaseOf, SUBSTANCES } from "./logic.ts";

const ACCENT = "#a66cff";

type Particle = { x: number; y: number; vx: number; vy: number; homeX: number; homeY: number };

function initParticles(): Particle[] {
  const list: Particle[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const hx = 128 + col * 36;
      const hy = 114 + row * 32;
      const ang = ((row * 4 + col) * 1.3) % (Math.PI * 2);
      list.push({
        x: hx,
        y: hy,
        vx: Math.cos(ang) * 2.2,
        vy: Math.sin(ang) * 2.2,
        homeX: hx,
        homeY: hy
      });
    }
  }
  return list;
}

function MatterGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(matterLevels[0].id);
  const starMap = useGameStars("matter");
  const level = matterLevels.find((l) => l.id === levelId) ?? matterLevels[0];
  const sub = SUBSTANCES[level.substanceId];

  const [tempC, setTempC] = useState(level.startC);
  const [particles, setParticles] = useState<Particle[]>(initParticles);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);
  const [tries, setTries] = useState(0);

  const phase = phaseOf(sub, tempC);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  useEffect(() => {
    let raf = 0;
    let tick = 0;
    const step = () => {
      tick++;
      const curPhase = phaseRef.current;
      setParticles((prev) =>
        prev.map((p, i) => {
          if (curPhase === "solid") {
            const jx = Math.sin(tick * 0.35 + i * 1.7) * 2.6;
            const jy = Math.cos(tick * 0.38 + i * 2.1) * 2.6;
            return { ...p, x: p.homeX + jx, y: p.homeY + jy };
          }
          if (curPhase === "liquid") {
            let nx = p.x + p.vx * 0.65;
            let ny = p.y + p.vy * 0.55 + 0.18;
            let vx = p.vx;
            let vy = p.vy;
            if (nx < 88 || nx > 272) {
              vx = -vx;
              nx = Math.max(88, Math.min(272, nx));
            }
            if (ny < 146 || ny > 224) {
              vy = -vy;
              ny = Math.max(146, Math.min(224, ny));
            }
            return { ...p, x: nx, y: ny, vx, vy };
          }
          // gas
          let nx = p.x + p.vx * 1.85;
          let ny = p.y + p.vy * 1.85;
          let vx = p.vx;
          let vy = p.vy;
          if (nx < 76 || nx > 284) {
            vx = -vx;
            nx = Math.max(76, Math.min(284, nx));
          }
          if (ny < 38 || ny > 224) {
            vy = -vy;
            ny = Math.max(38, Math.min(224, ny));
          }
          return { ...p, x: nx, y: ny, vx, vy };
        })
      );
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  function load(id: number) {
    const next = matterLevels.find((l) => l.id === id) ?? matterLevels[0];
    setLevelId(next.id);
    setTempC(next.startC);
    setParticles(initParticles());
    setShowHint(false);
    setWonStars(0);
    setTries(0);
  }

  function verifyState() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkMatterGoal(level, tempC)) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("matter", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const next = matterLevels.find((l) => l.id > level.id);
  const normTemp = (tempC - sub.minC) / (sub.maxC - sub.minC);

  return (
    <div className="page">
      <TopBar
        emoji="🧊"
        title="三态微观镜 · 物态变化与分子"
        onBack={exit}
        backLabel="化学分子馆"
        stars={sumStars(starMap)}
        maxStars={matterLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={matterLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card">
          <svg
            viewBox="0 0 360 265"
            style={{
              width: "100%",
              display: "block",
              borderRadius: 16,
              background: "#0f172a",
              border: "2px solid #334155"
            }}
            role="img"
            aria-label={`${sub.name}分子显微镜，当前温度 ${tempC}°C，状态为${phaseLabel(phase)}`}
          >
            {/* Microscope Chamber */}
            <rect
              x="62"
              y="24"
              width="236"
              height="214"
              rx="18"
              fill="#1e293b"
              stroke="#64748b"
              strokeWidth="3"
            />

            {/* Lattice faint guide lines in solid */}
            {phase === "solid" &&
              particles.map((p, idx) => (
                <circle key={`slot-${idx}`} cx={p.homeX} cy={p.homeY} r="12" fill="none" stroke="rgba(148,163,184,0.18)" strokeDasharray="2 2" />
              ))}

            {/* Molecules */}
            {particles.map((p, idx) => (
              <g key={idx} transform={`translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`}>
                <circle r="10.5" fill={sub.beadColor} stroke="#f8fafc" strokeWidth="1.6" />
                <circle cx="-3" cy="-3" r="3" fill="rgba(255,255,255,0.65)" />
              </g>
            ))}

            {/* Bottom Heater / Cooler Plate */}
            <rect
              x="82"
              y="242"
              width="196"
              height="12"
              rx="6"
              fill={normTemp > 0.6 ? "#ef4444" : normTemp < 0.35 ? "#38bdf8" : "#f59e0b"}
            />

            <text x="180" y="17" textAnchor="middle" fill="#e2e8f0" fontSize="11.5" fontWeight="800">
              🔬 {sub.name}（{sub.formula}）分子显微镜 · {phaseLabel(phase)}
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>当前温度</small>
                <strong style={{ color: normTemp > 0.6 ? "#e03131" : "#3b82f6" }}>{tempC} °C</strong>
              </div>
              <div className="readout-box">
                <small>熔点 / 沸点</small>
                <strong>{sub.meltC}°C / {sub.boilC}°C</strong>
              </div>
            </div>

            <div className="sliders" style={{ marginTop: 14 }}>
              <Slider
                label="🌡️ 控温台"
                value={tempC}
                min={sub.minC}
                max={sub.maxC}
                step={sub.stepC}
                color={ACCENT}
                format={(v) => `${v}°C`}
                onChange={setTempC}
              />
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={verifyState}>
                ✅ 锁定当前物态验证！
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 相变提示
              </button>
            </div>
          </div>

          {tries > 0 && wonStars === 0 && (
            <DadSays
              text={`现在 ${sub.name} 在 ${tempC}°C 下是${phaseLabel(phase)}，再仔细看看题目要求的物态和温度区间哦！`}
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`${sub.name}成功进入目标物态！`}
              dadLine={level.win}
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

export const matter: GameModule = {
  meta: {
    id: "matter",
    title: "三态微观镜",
    category: "chemistry",
    emoji: "🧊",
    tag: "物态变化与分子",
    blurb: "放大一亿倍看冰晶振动、液水滑移与蒸汽飞奔，还能在手心融化金属镓、把氮气冻成液氮。",
    maxStars: matterLevels.length * 3
  },
  Play: MatterGame
};
