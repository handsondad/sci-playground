import { useEffect, useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, degrees } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { arc, landing, onTarget, shots } from "./logic.ts";

const ACCENT = "#ff7a45";

export function TossGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState<number>(shots[0].id);
  const [angle, setAngle] = useState(20);
  const [prevAngles, setPrevAngles] = useState<number[]>([]);
  const [hitAngles, setHitAngles] = useState<number[]>([]);
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const starMap = useGameStars("toss");
  const level = shots.find((item) => item.id === levelId) ?? shots[0];
  const pts = arc(level.speed, angle);
  const distance = landing(level.speed, angle);
  const next = shots.find((item) => item.id > level.id);

  // Fixed world scale per level so the target flag never jumps around when aiming!
  const maxRange = (level.speed * level.speed) / 9.8;
  const worldW = maxRange * 1.12;
  const worldH = ((level.speed * level.speed) / (2 * 9.8)) * 1.12;

  const toSvg = (x: number, y: number) => ({
    sx: 26 + (x / worldW) * 320,
    sy: 168 - (y / worldH) * 136
  });

  const mainPath = pts.map((pt) => {
    const { sx, sy } = toSvg(pt.x, pt.y);
    return `${sx.toFixed(1)},${sy.toFixed(1)}`;
  }).join(" ");

  const flagPos = toSvg(level.target, 0);
  const zoneLeft = toSvg(Math.max(0, level.target - level.tol), 0).sx;
  const zoneRight = toSvg(level.target + level.tol, 0).sx;
  const ballEnd = toSvg(pts[pts.length - 1].x, 0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}投，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    setLevelId(id);
    setAngle(20);
    setPrevAngles([]);
    setHitAngles([]);
    setWonStars(0);
    setShowHint(false);
  }

  function aim(value: number) {
    setAngle(value);
  }

  function fire() {
    setPrevAngles((prev) => [...prev.slice(-3), angle]);
    const hit = onTarget(level.speed, angle, level.target, level.tol);
    if (hit) {
      const bucket = angle >= 45 ? 60 : 30;
      const nextHits = level.id === 2 ? Array.from(new Set([...hitAngles, bucket])) : [angle];
      setHitAngles(nextHits);
      const earned = showHint ? 2 : level.id === 2 && nextHits.length < 2 ? 2 : 3;
      if (earned > wonStars) {
        setWonStars(earned);
        recordStars("toss", String(level.id), earned);
      }
      if (sound) {
        chime(true);
        say(dad(level.id === 2 && nextHits.length < 2 ? "命中啦！再试试另一个互补角度（一平一陡），拿满三颗星！" : level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const hitNow = onTarget(level.speed, angle, level.target, level.tol);

  return (
    <div className="page">
      <TopBar
        emoji="🎾"
        title="扔得最远 · 抛物线射程"
        onBack={exit}
        backLabel="机械动力馆"
        stars={sumStars(starMap)}
        maxStars={shots.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={shots.map((s) => ({ id: s.id, title: `${s.id}. ${s.title}`, stars: starMap[String(s.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${level.id} 投「${level.title}」（出手速度 ${level.speed} m/s）：${level.story}`} />

      <div className="card">
        <svg
          viewBox="0 0 366 192"
          style={{ width: "100%", display: "block", borderRadius: 16, background: "linear-gradient(180deg, #eaf5ff 0%, #f9fcff 78%, #dff2d8 78%)", border: "2px solid #d6e7fa" }}
          role="img"
          aria-label={`仰角 ${angle} 度，落点 ${distance.toFixed(1)} 米`}
        >
          {/* Ground & target zone */}
          <line x1="14" y1="168" x2="354" y2="168" stroke="#68a357" strokeWidth="3" />
          <rect
            x={zoneLeft}
            y="164"
            width={Math.max(6, zoneRight - zoneLeft)}
            height="8"
            rx="4"
            fill="#6bcb77"
          />

          {/* Launch angle protractor */}
          <path d="M 52 168 A 26 26 0 0 0 26 142" fill="none" stroke="#b9d0ec" strokeWidth="1.5" strokeDasharray="3 2" />

          {/* Previous ghost trajectories */}
          {prevAngles.map((oldDeg, idx) => {
            const gPts = arc(level.speed, oldDeg)
              .map((p) => {
                const { sx, sy } = toSvg(p.x, p.y);
                return `${sx.toFixed(1)},${sy.toFixed(1)}`;
              })
              .join(" ");
            return (
              <polyline
                key={`${oldDeg}-${idx}`}
                points={gPts}
                fill="none"
                stroke="rgba(120, 145, 180, 0.35)"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
            );
          })}

          {/* Live trajectory */}
          <polyline
            points={mainPath}
            fill="none"
            stroke={hitNow ? "#3bb273" : "#4d96ff"}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Flag */}
          <line x1={flagPos.sx} y1="168" x2={flagPos.sx} y2="134" stroke="#c94040" strokeWidth="2.8" />
          <polygon points={`${flagPos.sx},134 ${flagPos.sx + 16},140 ${flagPos.sx},146`} fill="#ff6b6b" />
          <text x={flagPos.sx} y="183" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#4f6348">
            🎯 {level.target.toFixed(1)}m
          </text>

          {/* Launcher & landing ball */}
          <circle cx="26" cy="168" r="6" fill="#5d4e37" />
          <circle cx={ballEnd.sx} cy="168" r="6.5" fill={hitNow ? "#3bb273" : "#ff9f43"} stroke="#fff" strokeWidth="2" />
        </svg>

        <div className="readout-grid" style={{ marginTop: 14 }}>
          <div className="readout-box">
            <small>发射仰角</small>
            <strong style={{ color: "#4d96ff" }}>{angle}°</strong>
          </div>
          <div className="readout-box">
            <small>预计落点</small>
            <strong style={{ color: hitNow ? "#3bb273" : "#ff9f43" }}>{distance.toFixed(1)} 米</strong>
          </div>
          <div className="readout-box">
            <small>红旗距离</small>
            <strong>{level.target.toFixed(1)} 米</strong>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <Slider
            label="发射角度"
            value={angle}
            min={10}
            max={80}
            step={1}
            color="#4d96ff"
            format={degrees}
            onChange={aim}
          />
        </div>

        <div className="play-actions">
          <button type="button" className="primary-btn" onClick={fire}>
            🚀 发射记录轨迹！
          </button>
          <button type="button" className="pill-btn" onClick={() => load(level.id)}>
            🔄 清空轨迹
          </button>
          <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
            💡 抛体秘诀
          </button>
        </div>
      </div>

      {level.id === 2 && hitAngles.length === 1 && (
        <NianSays
          text={`哇，用 ${hitAngles[0] === 30 ? "较平的 30°" : "高高吊起的 60°"} 命中啦！再找找另一个相加等于 90° 的姐妹角度发射一次，直接拿满三颗星！`}
        />
      )}

      {showHint && (
        <HintBox
          text={
            level.id === 2
              ? "平地抛体射程公式是 v²·sin(2θ)/g。因为 sin(60°) = sin(120°)，所以 30°（低平球）和 60°（高吊球）会落在分毫不差的同一个位置！两个都发射试试！"
              : "不管出手速度是多少，忽略空气阻力时，45° 永远是水平速度与滞空时间配合得最好的「最远黄金角」！"
          }
        />
      )}

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={
            level.id === 2 && hitAngles.length >= 2
              ? "低平球 30° 与高吊球 60° 双双命中红旗！"
              : `稳稳命中 ${distance.toFixed(1)} 米红旗区！`
          }
          dadLine={level.win}
          onRetry={() => load(level.id)}
          onNext={next ? () => load(next.id) : exit}
          nextLabel={next ? `下一投：${next.title} →` : "回物理馆 →"}
        />
      )}
    </div>
  );
}

export const toss = {
  meta: {
    id: "toss",
    category: "mechanics" as const,
    title: "扔得最远",
    emoji: "🎾",
    blurb: "调仰角、拉抛物线！找准 45° 最远黄金角，再发现 30° 与 60° 同落点的秘密。",
    tag: "力学 · 抛体运动",
    maxStars: shots.length * 3
  },
  Play: TossGame
};
