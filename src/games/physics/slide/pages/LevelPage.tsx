import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Says, TopBar, starRow, type Settings } from "../../../../kit/Chrome.tsx";
import { HintBox } from "../../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../../kit/Slider.tsx";
import { TrackCanvas } from "../components/TrackCanvas.tsx";
import { levels, openingOf, type Level } from "../data/levels.ts";
import { useClock } from "../../../../kit/useClock.ts";
import { chime } from "../../../../kit/audio.ts";
import {
  idealYs, levelBounds, play, poseAt, starsFor, straightMotion, trackThrough, type Motion
} from "../lib/slide.ts";

type Stars = Partial<Record<number, number>>;

export function LevelHome({ stars, settings, onBack, onPlay }: {
  stars: Stars;
  settings: Settings;
  onBack: () => void;
  onPlay: (id: number) => void;
}) {
  return (
    <div className="page">
      <TopBar emoji="🏆" title="滑梯闯关" onBack={onBack} settings={settings} />
      <Says who="dad">灰色小球走直线。拖动圆点，让黄色小球比它先到。看过提示，这关最多两颗星。</Says>
      <div className="stages">
        {levels.map((level) => (
          <button key={level.id} type="button" className="stage" style={{ "--bubble": "#ef7d3c" } as CSSProperties} onClick={() => onPlay(level.id)}>
            <span className="stage-emoji" aria-hidden="true">{level.emoji}</span>
            <strong>{level.id}. {level.title}</strong>
            <span className="level-stars" aria-label={`最好 ${stars[level.id] ?? 0} 颗星`}>{starRow(stars[level.id] ?? 0)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function feedback(level: Level, motion: Motion, stars: number, straight: number, raw: number) {
  if (!motion.finished) {
    if (motion.cause === "rock") return "撞上石头了。换一条能过去的路。";
    if (motion.cause === "gate") return "没钻进窗口。轨道要从两根木桩中间过去。";
    return "有一段太高，小球速度不够，滑不上去。";
  }
  if (raw >= 3 && stars < 3) return "这就是最快的形状。看过提示，这一次记两颗星。";
  if (stars >= 3) return level.win;
  if (stars === 2) return "已经很快了。再贴近最快的形状，小数点后面还能再少一点。";
  if (stars === 1) return "超过直线了！开头再陡一些，会更快。";
  if (motion.time < straight + 0.04) return "还和直线差不多。把圆点往下拖，让开头变陡。";
  return "还没超过直线。试着让出发的地方更陡。";
}

export function LevelPlay({ level, settings, onBack, onAgain, onNext, onFinish }: {
  level: Level;
  settings: Settings;
  onBack: () => void;
  onAgain: () => void;
  onNext: (id: number) => void;
  onFinish: (id: number, stars: number) => void;
}) {
  const [ys, setYs] = useState(() => openingOf(level));
  const [shot, setShot] = useState(() => openingOf(level));
  const [hinted, setHinted] = useState(false);
  const [nonce, setNonce] = useState(1);
  const heard = useRef(0);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setShot(ys);
      setNonce((n) => n + 1);
    }, 240);
    return () => window.clearTimeout(id);
  }, [ys]);

  const ghost = useMemo(() => straightMotion(level), [level]);
  const live = useMemo(() => play(level, ys), [level, ys]);
  const racing = useMemo(() => play(level, shot), [level, shot]);
  const par = useMemo(() => play(level, level.solution).motion.time, [level]);
  const raw = starsFor(live.motion.finished ? live.motion.time : null, ghost.time, par, false);
  const stars = hinted ? Math.min(raw, 2) : raw;
  const pending = ys.some((y, i) => y !== shot[i]);
  const clock = useClock(nonce, Math.max(racing.motion.time, ghost.time));
  const beadT = pending ? 0 : clock;
  const ideal = useMemo(() => idealYs(level), [level]);
  const blocked = useMemo(() => !play(level, ideal).motion.finished, [level, ideal]);
  const next = levels.find((item) => item.id === level.id + 1);

  useEffect(() => {
    if (stars > heard.current) {
      if (settings.sound) chime(true);
      heard.current = stars;
      onFinish(level.id, stars);
    }
  }, [stars, settings.sound, level.id, onFinish]);

  const yours = pending ? live.motion : racing.motion;
  const yourBead = poseAt(yours, beadT);
  const ghostBead = poseAt(ghost, beadT);
  const bob = (done: boolean) => (done && !pending ? Math.sin(clock * 8) * 0.03 : 0);

  const tracks = [
    { points: ghost.samples, color: "#9aa0a6", width: 3, dash: true },
    ...(hinted && blocked ? [{ points: trackThrough(level.start, level.end, level.xs, ideal), color: "rgba(255,107,107,0.85)", width: 3, dash: true }] : []),
    ...(hinted ? [{ points: trackThrough(level.start, level.end, level.xs, level.solution), color: "#3aaa5a", width: 3, dash: true }] : []),
    { points: live.points, color: "#ef7d3c", wood: true, width: 11 }
  ];

  return (
    <div className="page">
      <TopBar emoji={level.emoji} title={`第 ${level.id} 关 · ${level.title}`} onBack={onBack} backLabel="选关" settings={settings} />
      <Says who="dad">{level.story}</Says>
      <p className="stars-now" aria-label={`这一次 ${stars} 颗星`}>{starRow(stars)}</p>
      <TrackCanvas
        label={`${level.title}。拖动圆点改变滑梯`}
        bounds={levelBounds(level)}
        tracks={tracks}
        rocks={level.rocks}
        gates={level.gates}
        handles={level.xs.map((x, i) => ({ x, y: ys[i] }))}
        limits={{ min: level.minY, max: level.maxY }}
        onHandle={(index, y) => setYs((prev) => prev.map((value, i) => i === index ? y : value))}
        flag={level.end}
        dock={level.start}
        beads={[
          { x: ghostBead.x, y: ghostBead.y + bob(beadT >= ghost.time), color: "#c5c0b6" },
          { x: yourBead.x, y: yourBead.y + bob(yours.finished && beadT >= yours.time), color: "#ffd23f" }
        ]}
      />
      <div className="card" style={{ marginTop: 12 }}>
        <div className="times" aria-live="polite" style={{ marginTop: 0 }}>
          <span>🟡 你的滑梯：<b>{live.motion.finished ? `${live.motion.time.toFixed(2)} 秒` : "到不了终点"}</b></span>
          <span>⚪ 直线滑梯：<b>{ghost.time.toFixed(2)} 秒</b></span>
          <span>🏁 最优参考：<b>{par.toFixed(2)} 秒</b></span>
        </div>
        <div className="sliders">
          {ys.map((y, i) => (
            <Slider
              key={level.xs[i]}
              label={`控制点 ${i + 1}`}
              value={y}
              min={level.minY}
              max={level.maxY}
              step={0.01}
              color="#ff9f43"
              format={fixed(2, "m")}
              onChange={(next) => setYs((prev) => prev.map((value, j) => (j === i ? next : value)))}
            />
          ))}
        </div>
      </div>
      <p className="banner">{feedback(level, live.motion, stars, ghost.time, raw)}</p>
      {hinted && (
        <HintBox
          text={`${level.hint} 绿色虚线是这些圆点能搭出的最快形状${blocked ? "，红色虚线是被石头挡住的理想摆线" : ""}。（看过提示本关最多记两颗星）`}
        />
      )}
      <div className="play-actions">
        <button type="button" className="primary-btn" onClick={() => setNonce((n) => n + 1)}>▶ 再滑一次</button>
        <button type="button" className="pill-btn" onClick={() => setHinted(true)} disabled={hinted}>💡 看看最快的形状</button>
        {next && stars > 0 && <button type="button" className="primary-btn is-green" onClick={() => onNext(next.id)}>下一关 →</button>}
        <button type="button" className="pill-btn" onClick={onAgain}>🔄 重来</button>
      </div>
    </div>
  );
}
