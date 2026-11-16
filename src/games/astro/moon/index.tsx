import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, degrees } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { angleDiff, hitPhase, phases, wrap } from "./logic.ts";

const ACCENT = "#3f8efc";
const STARS_BG = [
  [24, 28], [66, 18], [118, 34], [208, 22], [278, 30],
  [32, 198], [88, 214], [218, 212], [292, 198], [44, 114]
] as const;

function facePath(angle: number) {
  const phase = wrap(angle);
  const cos = Math.cos((phase * Math.PI) / 180);
  const rx = Math.abs(cos) * 46;
  if (rx < 0.8) return `M 50 4 A 46 46 0 0 ${phase < 180 ? 0 : 1} 50 96 Z`;
  const rightLit = phase <= 180;
  const outer = rightLit ? 0 : 1;
  const sweep = rightLit ? (cos >= 0 ? 1 : 0) : (cos >= 0 ? 0 : 1);
  return `M 50 4 A 46 46 0 0 ${outer} 50 96 A ${rx} 46 0 0 ${sweep} 50 4`;
}

export function MoonGame({ exit, sound, setSound }: GameProps) {
  const [questIdx, setQuestIdx] = useState(0);
  const [angle, setAngle] = useState(125);
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const dragging = useRef(false);

  const starMap = useGameStars("moon");
  const target = phases[questIdx];
  const rad = (wrap(angle) * Math.PI) / 180;
  const moonPos = { x: 148 + Math.cos(rad) * 82, y: 120 - Math.sin(rad) * 82 };
  const nextIdx = questIdx + 1 < phases.length ? questIdx + 1 : null;

  useEffect(() => {
    if (sound) say(dad(`第${questIdx + 1}关，请把月球转到「${target.name}」的位置！`));
  }, [questIdx]);

  function load(idx: number) {
    const startDeg = (phases[idx].deg + 135) % 360;
    setQuestIdx(idx);
    setAngle(startDeg);
    setWonStars(0);
    setShowHint(false);
  }

  function checkNow() {
    if (hitPhase(angle, target.deg)) {
      const exact = angleDiff(angle, target.deg) <= 5;
      const earned = showHint ? 2 : exact ? 3 : 2;
      setWonStars(earned);
      recordStars("moon", target.id, earned);
      if (sound) {
        chime(true);
        say(dad(`${target.name}！${target.why}`));
      }
    } else if (sound) {
      chime(false);
    }
  }

  function pointerToAngle(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * 340;
    const sy = ((e.clientY - rect.top) / rect.height) * 240;
    const deg = (Math.atan2(120 - sy, sx - 148) * 180) / Math.PI;
    setAngle(Math.round(wrap(deg)));
  }

  const aligned = hitPhase(angle, target.deg);

  return (
    <div className="page">
      <TopBar
        emoji="🌙"
        title="月相 · 阴晴圆缺之谜"
        onBack={exit}
        backLabel="天文馆"
        stars={sumStars(starMap)}
        maxStars={phases.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={phases.map((p, idx) => ({ id: idx, title: `${idx + 1}. ${p.name}`, stars: starMap[p.id] ?? 0 }))}
        activeId={questIdx}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`任务：金色的太阳光从最右边平行照过来！拖动轨道上的月亮（或滑块），让地球上的人看到「${target.name}」，再点锁定验证！`} />

      <div className="workbench">
        <div className="card" style={{ padding: 12 }}>
          <svg
            className="space-svg"
            viewBox="0 0 340 240"
            role="img"
            aria-label={`月球轨道角 ${Math.round(wrap(angle))} 度`}
            onPointerDown={(e) => {
              dragging.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              pointerToAngle(e);
            }}
            onPointerMove={(e) => {
              if (dragging.current) pointerToAngle(e);
            }}
            onPointerUp={() => { dragging.current = false; }}
          >
            {STARS_BG.map(([sx, sy], i) => (
              <circle key={i} cx={sx} cy={sy} r={i % 2 === 0 ? 1.4 : 1} fill="rgba(255,255,255,0.65)" />
            ))}

            {/* Parallel sunbeams from right */}
            {[46, 84, 120, 156, 194].map((ry) => (
              <g key={ry} opacity="0.55">
                <line x1="334" y1={ry} x2="274" y2={ry} stroke="#ffd93d" strokeWidth="2" strokeDasharray="5 4" />
                <polygon points={`270,${ry} 278,${ry - 3.5} 278,${ry + 3.5}`} fill="#ffd93d" />
              </g>
            ))}
            <circle cx="352" cy="120" r="38" fill="#ffb703" />
            <circle cx="352" cy="120" r="30" fill="#ffd93d" />
            <text x="304" y="226" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffe08a">☀️ 太阳光</text>

            {/* Moon orbit */}
            <circle cx="148" cy="120" r="82" fill="none" stroke="rgba(160, 196, 255, 0.35)" strokeWidth="1.8" strokeDasharray="5 5" />

            {/* Sightline from Earth to Moon */}
            <line x1="148" y1="120" x2={moonPos.x} y2={moonPos.y} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="3 3" />

            {/* Earth with day/night hemisphere */}
            <g transform="translate(148, 120)">
              <circle r="20" fill="#17376e" />
              <path d="M 0 -20 A 20 20 0 0 1 0 20 Z" fill="#4d96ff" />
              <circle cx="5" cy="-5" r="5" fill="#6bcb77" opacity="0.85" />
              <text y="34" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#cfe0ff">🌍 地球</text>
            </g>

            {/* Moon on orbit: right half ALWAYS lit by sun! */}
            <g transform={`translate(${moonPos.x}, ${moonPos.y})`} style={{ cursor: "grab" }}>
              <circle r="15" fill="rgba(255, 224, 138, 0.2)" />
              <circle r="12" fill="#334155" stroke="#fff" strokeWidth="1.4" />
              <path d="M 0 -12 A 12 12 0 0 1 0 12 Z" fill="#ffe08a" />
            </g>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="moon-preview">
            <strong>🔭 从地球夜空望月亮</strong>
            <svg viewBox="0 0 100 100" style={{ width: 132, height: 132 }} aria-hidden="true">
              <circle cx="50" cy="50" r="46" fill="#1e293b" stroke="#3b5280" strokeWidth="2" />
              <path d={facePath(angle)} fill="#ffe494" />
              <circle cx="38" cy="36" r="5" fill="rgba(120, 95, 40, 0.14)" />
              <circle cx="62" cy="58" r="7" fill="rgba(120, 95, 40, 0.14)" />
            </svg>
            <small>目标月相：<strong style={{ color: "#ffd93d" }}>{target.name}</strong> · 当前轨道角 {Math.round(wrap(angle))}°</small>
          </div>

          <div className="card">
            <Slider
              label="月球位置"
              value={Math.round(wrap(angle))}
              min={0}
              max={360}
              step={5}
              wrap
              color="#3f8efc"
              format={degrees}
              onChange={(v) => setAngle(wrap(v))}
            />

            <div className="play-actions" style={{ marginTop: 12 }}>
              <button type="button" className="primary-btn" onClick={checkNow}>
                {aligned ? "✨ 锁定当前月相！" : "🔭 验证这个位置"}
              </button>
              <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
                💡 角度提示
              </button>
            </div>
          </div>

          {showHint && (
            <HintBox
              text={`太阳在右侧（0° 方向）：月球转到 0°（夹在日地中间）是看不见亮面的「新月」；45° 是弯弯的「蛾眉月」；90° 成直角是「上弦月」；180° 跑到地球背后正对阳光就是圆圆的「满月」；270° 是「下弦月」！`}
            />
          )}
        </div>
      </div>

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={`找准「${target.name}」啦！（轨道角 ${Math.round(wrap(angle))}°）`}
          dadLine={`${target.why} 注意看太空图：月亮朝向太阳的右半边其实永远是亮的，只是我们在地球上歪着头看它的角度一直在变！`}
          onRetry={() => load(questIdx)}
          onNext={nextIdx !== null ? () => load(nextIdx) : exit}
          nextLabel={nextIdx !== null ? `下一个：${phases[nextIdx].name} →` : "回天文馆 →"}
        />
      )}
    </div>
  );
}

export const moon = {
  meta: {
    id: "moon",
    category: "astro" as const,
    title: "月相",
    emoji: "🌙",
    blurb: "在深空轨道上亲手拨动月球，对照望远镜视野解开新月、弦月和满月的几何秘密！",
    tag: "天体 · 月相盈亏",
    maxStars: phases.length * 3
  },
  Play: MoonGame
};
