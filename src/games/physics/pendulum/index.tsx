import { useEffect, useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { lengthFor, matched, period, swings } from "./logic.ts";

const ACCENT = "#ff7a45";

export function PendulumGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState<number>(swings[0].id);
  const [length, setLength] = useState(0.8);
  const [mass, setMass] = useState(80);
  const [massMoved, setMassMoved] = useState(false);
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const starMap = useGameStars("pendulum");
  const level = swings.find((item) => item.id === levelId) ?? swings[0];
  const seconds = period(length);
  const targetLen = lengthFor(level.target);
  const next = swings.find((item) => item.id > level.id);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setElapsed((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [level.id]);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    setLevelId(id);
    setLength(0.8);
    setMass(80);
    setMassMoved(false);
    setWonStars(0);
    setShowHint(false);
  }

  function setRope(value: number) {
    setLength(value);
    const hit = matched(value, level.target);
    if (hit && wonStars === 0) {
      const exact = Math.abs(period(value) - level.target) <= 0.02;
      const earned = showHint ? 2 : exact ? 3 : 2;
      setWonStars(earned);
      recordStars("pendulum", String(level.id), earned);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    }
  }

  // Real-time pendulum angles (in degrees)
  const yourAngle = 22 * Math.cos((2 * Math.PI * elapsed) / Math.max(0.25, seconds));
  const goalAngle = 22 * Math.cos((2 * Math.PI * elapsed) / level.target);

  const ropePx = 34 + length * 86;
  const goalRopePx = 34 + targetLen * 86;
  const bobR = 10 + mass / 24;

  return (
    <div className="page">
      <TopBar
        emoji="🕰️"
        title="摆的秘密 · 伽利略单摆"
        onBack={exit}
        backLabel="声光电磁馆"
        stars={sumStars(starMap)}
        maxStars={swings.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={swings.map((s) => ({ id: s.id, title: `${s.id}. ${s.title}`, stars: starMap[String(s.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${level.id} 关「${level.title}」：${level.story} 让你的橙色钟摆和绿色目标影子齐步摆动（周期 ${level.target} 秒）！`} />

      <div className="workbench">
        <div className="card">
          <svg
            viewBox="0 0 320 250"
            style={{ width: "100%", display: "block", borderRadius: 16, background: "#fbfdff", border: "2px solid #e3edf9" }}
            role="img"
            aria-label={`你的单摆周期 ${seconds.toFixed(2)} 秒，目标周期 ${level.target.toFixed(2)} 秒`}
          >
            {/* Ceiling beam */}
            <rect x="40" y="14" width="240" height="10" rx="5" fill="#c9844a" />
            <circle cx="160" cy="24" r="5" fill="#5d4e37" />

            {/* Protractor guide arc */}
            <path d="M 110 120 A 100 100 0 0 0 210 120" fill="none" stroke="#e5eef9" strokeWidth="2" strokeDasharray="4 4" />

            {/* Target ghost pendulum (green dashed) */}
            <g transform={`translate(160, 24) rotate(${goalAngle})`} opacity="0.55">
              <line x1="0" y1="0" x2="0" y2={goalRopePx} stroke="#3bb273" strokeWidth="2.5" strokeDasharray="5 4" />
              <circle cx="0" cy={goalRopePx} r="13" fill="rgba(59, 178, 115, 0.25)" stroke="#3bb273" strokeWidth="2.5" strokeDasharray="4 3" />
            </g>

            {/* Player pendulum */}
            <g transform={`translate(160, 24) rotate(${yourAngle})`}>
              <line x1="0" y1="0" x2="0" y2={ropePx} stroke="#8c5a2b" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="0" cy={ropePx} r={bobR} fill="#ff9f43" stroke="#b85d14" strokeWidth="3" />
              <circle cx={-bobR * 0.3} cy={ropePx - bobR * 0.3} r={bobR * 0.22} fill="rgba(255,255,255,0.55)" />
            </g>

            <text x="16" y="236" fontSize="11" fill="#3bb273" fontWeight="700">🟢 虚线：目标节拍 ({level.target.toFixed(2)}s)</text>
            <text x="184" y="236" fontSize="11" fill="#d96b27" fontWeight="700">🟠 实线：你的摆 ({seconds.toFixed(2)}s)</text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>你的往返周期</small>
                <strong style={{ color: matched(length, level.target) ? "#3bb273" : "#ff9f43" }}>
                  {seconds.toFixed(2)} 秒
                </strong>
              </div>
              <div className="readout-box">
                <small>目标周期</small>
                <strong>{level.target.toFixed(2)} 秒</strong>
              </div>
              <div className="readout-box">
                <small>砝码重量</small>
                <strong>{mass} 克</strong>
              </div>
            </div>

            <div className="sliders" style={{ marginTop: 14 }}>
              <Slider
                label="绳子长度"
                value={length}
                min={0.05}
                max={2.0}
                step={0.01}
                color="#ff9f43"
                format={fixed(2, "m")}
                onChange={setRope}
              />
              <Slider
                label="砝码质量"
                value={mass}
                min={40}
                max={280}
                step={10}
                color="#4d96ff"
                format={(v) => `${v}g`}
                onChange={(v) => {
                  setMass(v);
                  setMassMoved(true);
                }}
              />
            </div>

            <div className="play-actions">
              <button type="button" className="pill-btn" onClick={() => load(level.id)}>
                🔄 恢复初始
              </button>
              <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
                💡 钟表匠公式
              </button>
            </div>
          </div>

          {massMoved && (
            <NianSays text={`咦！我把砝码调到 ${mass} 克，球变大了，可往返一次还是 ${seconds.toFixed(2)} 秒，一丁点都没变！`} />
          )}

          {showHint && (
            <HintBox
              text={`伽利略发现单摆周期 T = 2π√(L/g)，只跟绳长 L 有关，跟球有多重无关！要摆出 ${level.target} 秒，把绳长调到约 ${targetLen.toFixed(2)} 米试试！`}
            />
          )}
        </div>
      </div>

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={`分秒不差！绳长 ${length.toFixed(2)} 米，周期正好对准 ${seconds.toFixed(2)} 秒！`}
          dadLine={level.win}
          onRetry={() => load(level.id)}
          onNext={next ? () => load(next.id) : exit}
          nextLabel={next ? `下一关：${next.title} →` : "回物理馆 →"}
        />
      )}
    </div>
  );
}

export const pendulum = {
  meta: {
    id: "pendulum",
    category: "physics" as const,
    title: "摆的秘密",
    emoji: "🕰️",
    blurb: "跟目标影子同频摆动！亲手验证：把砝码加重三倍，钟摆快慢竟纹丝不动。",
    tag: "振动 · 单摆等时性",
    maxStars: swings.length * 3
  },
  Play: PendulumGame
};
