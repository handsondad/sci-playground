import { useEffect, useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { balloons, fizz, gas, type Fizz } from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#2fb380";

export function FizzGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState<number>(balloons[0].id);
  const [soda, setSoda] = useState(1);
  const [vinegar, setVinegar] = useState(1);
  const [checked, setChecked] = useState<Fizz | null>(null);
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const starMap = useGameStars("fizz");
  const level = balloons.find((item) => item.id === levelId) ?? balloons[0];
  const made = gas(soda, vinegar);
  const next = balloons.find((item) => item.id > level.id);
  const popped = checked === "pop";

  useEffect(() => {
    if (sound) say(dad(`第${level.id}只气球，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    setLevelId(id);
    setSoda(1);
    setVinegar(1);
    setChecked(null);
    setWonStars(0);
    setShowHint(false);
  }

  function mix() {
    const out = fizz(soda, vinegar, level.target, level.popAt, level.strict);
    setChecked(out);
    if (out === "fit") {
      const noWaste = soda === level.target && vinegar === level.target;
      const earned = showHint ? 2 : noWaste ? 3 : 2;
      setWonStars(earned);
      recordStars("fizz", String(level.id), earned);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const rx = checked ? Math.min(made, level.popAt) * 10 + 18 : 22;
  const ry = checked ? Math.min(made, level.popAt) * 12 + 22 : 26;

  return (
    <div className="page">
      <TopBar
        emoji="🎈"
        title="小苏打气球 · 限量反应物"
        onBack={exit}
        backLabel="化学分子馆"
        stars={sumStars(starMap)}
        maxStars={balloons.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={balloons.map((b) => ({ id: b.id, title: `${b.id}. ${b.title}`, stars: starMap[String(b.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${level.id} 只「${level.title}」：${level.story}`} />

      <div className="workbench">
        <div className="card" style={{ display: "grid", justifyItems: "center" }}>
          <svg viewBox="0 0 240 250" style={{ width: "100%", maxWidth: 280, display: "block" }} aria-hidden="true">
            {/* Balloon or popped shreds */}
            {popped ? (
              <g transform="translate(120, 95)">
                <text x="0" y="0" textAnchor="middle" fontSize="38">💥</text>
                <text x="0" y="24" textAnchor="middle" fontSize="12" fontWeight="700" fill="#c94040">撑破啦！</text>
              </g>
            ) : (
              <g style={{ transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                <ellipse
                  cx="120"
                  cy={132 - ry}
                  rx={rx}
                  ry={ry}
                  fill="url(#balloonGrad)"
                  stroke="#e04872"
                  strokeWidth="2.5"
                />
                <text
                  x="120"
                  y={136 - ry}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill="#ffffff"
                >
                  {checked ? `${made}格 CO₂` : "待充气"}
                </text>
              </g>
            )}
            <defs>
              <radialGradient id="balloonGrad" cx="35%" cy="30%">
                <stop offset="0%" stopColor="#ffd1df" />
                <stop offset="55%" stopColor="#ff7aa2" />
                <stop offset="100%" stopColor="#eb4678" />
              </radialGradient>
            </defs>

            {/* Bottle liquid & bubbles */}
            <path d="M 80 185 L 70 226 Q 68 236 80 236 L 160 236 Q 172 236 170 226 L 160 185 Z" fill="#dff0ff" />
            {checked &&
              Array.from({ length: made * 3 }, (_, i) => (
                <circle
                  key={i}
                  cx={92 + ((i * 23) % 56)}
                  cy={225 - ((i * 17) % 68)}
                  r="3.2"
                  fill="#ffffff"
                  stroke="#7eb6ff"
                  strokeWidth="1.2"
                />
              ))}
            <path
              d="M 106 134 L 106 156 L 70 226 Q 68 236 80 236 L 160 236 Q 172 236 170 226 L 134 156 L 134 134"
              fill="none"
              stroke="#9ec0e6"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>目标气量</small>
                <strong style={{ color: "#3bb273" }}>🎯 {level.target} 格</strong>
              </div>
              <div className="readout-box">
                <small>爆炸上限</small>
                <strong style={{ color: "#ff6b6b" }}>💥 {level.popAt} 格破</strong>
              </div>
              <div className="readout-box">
                <small>配对产气</small>
                <strong>{made} 格 CO₂</strong>
              </div>
            </div>

            <div className="sliders" style={{ marginTop: 14 }}>
              <Slider
                label="🧂 小苏打"
                value={soda}
                min={0}
                max={6}
                step={1}
                color="#ff9f43"
                format={(v) => `${v} 勺`}
                onChange={(v) => { setSoda(v); setChecked(null); }}
              />
              <Slider
                label="🍶 白醋"
                value={vinegar}
                min={0}
                max={6}
                step={1}
                color="#4d96ff"
                format={(v) => `${v} 勺`}
                onChange={(v) => { setVinegar(v); setChecked(null); }}
              />
            </div>

            <p className="note" style={{ marginTop: 10 }}>
              配对预览：<strong>{made} 对</strong>（🧂+🍶→💨）反应产气
              {Math.abs(soda - vinegar) > 0
                ? `，多出的 ${Math.abs(soda - vinegar)} 勺${soda > vinegar ? "小苏打" : "白醋"}找不到搭档会剩在瓶底。`
                : "，两边刚好一一配对零剩余！"}
            </p>

            <div className="play-actions">
              <button type="button" className="primary-btn" onClick={mix}>
                🧪 倒进瓶里吹气球！
              </button>
              <button type="button" className="pill-btn" onClick={() => load(level.id)}>
                🔄 换新气球
              </button>
              <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
                💡 反应物提示
              </button>
            </div>
          </div>

          {checked === "small" && <NianSays text={`才吹起 ${made} 格气，还没到 ${level.target} 格！较少的那一种原料卡住了产量哦。`} />}
          {checked === "big" && <NianSays text={`吹到 ${made} 格啦，虽然没破，但超过了本关要求的 ${level.target} 格！`} />}
          {checked === "waste" && <NianSays text={`气球是 ${made} 格没错，可瓶底还剩下了没反应的原料！本关要求一勺都不浪费哦。`} />}
          {checked === "pop" && <NianSays text={`砰！！${made} 格气冲破了 ${level.popAt} 格上限，气球炸开花啦！少放点原料试试！`} />}

          {showHint && (
            <HintBox
              text={`化学上这叫「限量反应物」：就像做三明治，2 片面包配 1 片火腿，谁先用完反应就停！想零浪费吹出 ${level.target} 格气，小苏打和白醋都调到 ${level.target} 勺最完美！`}
            />
          )}
        </div>
      </div>

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={`气球稳稳鼓到 ${made} 格！${soda === vinegar ? "而且零浪费完美配比！" : ""}`}
          dadLine={level.win}
          onRetry={() => load(level.id)}
          onNext={next ? () => load(next.id) : exit}
          nextLabel={next ? `下一只：${next.title} →` : "回化学馆 →"}
        />
      )}
    </div>
  );
}

export const fizzBalloon = { meta, Play: FizzGame };
