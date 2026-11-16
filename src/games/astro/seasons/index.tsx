import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, degrees } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { angleDiff, atMark, northSeason, orbits, southSeason, wrap } from "./logic.ts";

const ACCENT = "#3f8efc";
const TILT_RAD = (23.5 * Math.PI) / 180;
const SEASON_EMOJI = { 春天: "🌸", 夏天: "☀️", 秋天: "🍂", 冬天: "❄️" } as const;

export function SeasonsGame({ exit, sound, setSound }: GameProps) {
  const [questIdx, setQuestIdx] = useState(0);
  const [angle, setAngle] = useState(95);
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const dragging = useRef(false);

  const starMap = useGameStars("seasons");
  const target = orbits[questIdx];
  const rad = (wrap(angle) * Math.PI) / 180;
  // At angle=0, Earth is on the left (x = 170 - 96 = 74), and North Pole tilts right (+x) TOWARD the Sun!
  const earth = { x: 170 - Math.cos(rad) * 94, y: 122 - Math.sin(rad) * 72 };
  const axisDx = Math.sin(TILT_RAD) * 24;
  const axisDy = Math.cos(TILT_RAD) * 24;

  const nSeason = northSeason(angle);
  const sSeason = southSeason(angle);
  const nextIdx = questIdx + 1 < orbits.length ? questIdx + 1 : null;

  useEffect(() => {
    if (sound) say(dad(`第${target.id}关，把歪着身子的地球公转到「${target.title}」的位置！`));
  }, [target.id]);

  function load(idx: number) {
    const startDeg = (orbits[idx].deg + 110) % 360;
    setQuestIdx(idx);
    setAngle(startDeg);
    setWonStars(0);
    setShowHint(false);
  }

  function checkNow() {
    if (atMark(angle, target.deg)) {
      const exact = angleDiff(angle, target.deg) <= 8;
      const earned = showHint ? 2 : exact ? 3 : 2;
      setWonStars(earned);
      recordStars("seasons", String(target.id), earned);
      if (sound) {
        chime(true);
        say(dad(`${target.title}！${target.why}`));
      }
    } else if (sound) {
      chime(false);
    }
  }

  function pointerToAngle(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * 340;
    const sy = ((e.clientY - rect.top) / rect.height) * 244;
    const deg = (Math.atan2(122 - sy, 170 - sx) * 180) / Math.PI;
    setAngle(Math.round(wrap(deg)));
  }

  // Sun direction from Earth (+1 when Earth is left of Sun, -1 when right of Sun)
  const northLean = Math.cos(rad); // +1 = North Pole leans toward Sun (summer), -1 = leans away (winter)

  return (
    <div className="page">
      <TopBar
        emoji="🌍"
        title="谁在过夏天 · 地轴倾角与四季"
        onBack={exit}
        backLabel="天文宇宙馆"
        stars={sumStars(starMap)}
        maxStars={orbits.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={orbits.map((o, idx) => ({ id: idx, title: `${o.id}. ${o.title}`, stars: starMap[String(o.id)] ?? 0 }))}
        activeId={questIdx}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${target.id} 关：注意地轴顶端的红点（北极）永远指向右上方的北极星！拖动地球绕太阳公转，找到「${target.title}」！`} />

      <div className="workbench">
        <div className="card" style={{ padding: 12 }}>
          <svg
            className="space-svg"
            viewBox="0 0 340 244"
            role="img"
            aria-label={`地球公转位置 ${Math.round(wrap(angle))} 度，北半球${nSeason}，南半球${sSeason}`}
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
            {/* North Star indicator */}
            <text x="292" y="22" fontSize="10" fontWeight="700" fill="#ffd93d">⭐ 北极星方向 ↗</text>

            {/* Elliptical perspective orbit */}
            <ellipse
              cx="170"
              cy="122"
              rx="94"
              ry="72"
              fill="none"
              stroke="rgba(160, 196, 255, 0.36)"
              strokeWidth="2"
              strokeDasharray="5 5"
            />

            {/* Ray from Sun to Earth */}
            <line x1="170" y1="122" x2={earth.x} y2={earth.y} stroke="rgba(255, 217, 61, 0.45)" strokeWidth="3" strokeDasharray="4 3" />

            {/* Sun in center */}
            <circle cx="170" cy="122" r="28" fill="rgba(255, 183, 3, 0.28)" />
            <circle cx="170" cy="122" r="21" fill="#ffd93d" stroke="#ff9f43" strokeWidth="2.5" />
            <text x="170" y="160" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffe08a">☀️ 太阳</text>

            {/* Tilted Earth */}
            <g style={{ cursor: "grab" }}>
              {/* Axis rod (always tilted 23.5 deg toward upper-right!) */}
              <line
                x1={earth.x - axisDx}
                y1={earth.y + axisDy}
                x2={earth.x + axisDx}
                y2={earth.y - axisDy}
                stroke="#ffffff"
                strokeWidth="2.4"
              />
              <circle cx={earth.x} cy={earth.y} r="17" fill="#2b7de9" stroke="#9ec5ff" strokeWidth="1.4" />
              {/* Equator tilted perpendicular to axis */}
              <line
                x1={earth.x - axisDy * 0.68}
                y1={earth.y - axisDx * 0.68}
                x2={earth.x + axisDy * 0.68}
                y2={earth.y + axisDx * 0.68}
                stroke="rgba(255,255,255,0.75)"
                strokeWidth="1.5"
                strokeDasharray="2.5 2"
              />
              {/* Red North Pole & Blue South Pole */}
              <circle cx={earth.x + axisDx} cy={earth.y - axisDy} r="4" fill="#ff6b6b" />
              <circle cx={earth.x - axisDx} cy={earth.y + axisDy} r="3.5" fill="#7fd6ff" />
            </g>

            <text x="16" y="232" fontSize="9.5" fill="#cfe0ff">🔴 红珠：北极 · 🔵 蓝珠：南极（地轴倾角 23.5° 不变）</text>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>🔴 北半球现在是</small>
                <strong style={{ color: nSeason === "夏天" ? "#ff6b6b" : nSeason === "冬天" ? "#4d96ff" : "#3bb273" }}>
                  {SEASON_EMOJI[nSeason]} {nSeason}
                </strong>
                <small>{northLean > 0.35 ? "阳光直射·昼长" : northLean < -0.35 ? "阳光斜射·昼短" : "昼夜平分"}</small>
              </div>
              <div className="readout-box">
                <small>🔵 南半球现在是</small>
                <strong style={{ color: sSeason === "夏天" ? "#ff6b6b" : sSeason === "冬天" ? "#4d96ff" : "#3bb273" }}>
                  {SEASON_EMOJI[sSeason]} {sSeason}
                </strong>
                <small>{northLean < -0.35 ? "阳光直射·昼长" : northLean > 0.35 ? "阳光斜射·昼短" : "昼夜平分"}</small>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <Slider
                label="公转位置"
                value={Math.round(wrap(angle))}
                min={0}
                max={360}
                step={5}
                wrap
                color="#3f8efc"
                format={degrees}
                onChange={(v) => setAngle(wrap(v))}
              />
            </div>

            <div className="play-actions" style={{ marginTop: 12 }}>
              <button type="button" className="primary-btn" onClick={checkNow}>
                {atMark(angle, target.deg) ? "✨ 锁定这个节气位置！" : "🌍 验证当前位置"}
              </button>
              <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
                💡 地轴提示
              </button>
            </div>
          </div>

          {showHint && (
            <HintBox
              text="看地球头顶那颗红珠子（北极）：当地球转到太阳左边（0°）时，红珠子朝太阳点头，北半球就是夏天；转到太阳右边（180°）时，红珠子背对太阳，北半球过冬、南半球过夏！转到下侧（270°）就是昼夜平分的春分！"
            />
          )}
        </div>
      </div>

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={`找准「${target.title}」啦！`}
          dadLine={`${target.why} 很多人误以为夏天是因为地球离太阳更近——其实一月份北半球寒冬时，地球反而处在近日点呢！真正决定四季的是 23.5° 地轴倾斜带来的直射与斜射。`}
          onRetry={() => load(questIdx)}
          onNext={nextIdx !== null ? () => load(nextIdx) : exit}
          nextLabel={nextIdx !== null ? `下一关：${orbits[nextIdx].title} →` : "回天文馆 →"}
        />
      )}
    </div>
  );
}

export const seasons = {
  meta: {
    id: "seasons",
    category: "astro" as const,
    title: "谁在过夏天",
    emoji: "🌍",
    blurb: "地轴歪着 23.5° 绕太阳转！看南北半球怎样轮流朝向阳光，过着相反的冬与夏。",
    tag: "行星 · 地轴与四季",
    maxStars: orbits.length * 3
  },
  Play: SeasonsGame
};
