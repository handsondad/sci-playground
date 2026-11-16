import { useEffect, useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { cast, mirrorLevels, type Dir, type Mirror } from "./logic.ts";

const ORDER: readonly (Mirror | "")[] = ["", "/", "\\"];
const ACCENT = "#ff7a45";
const STEP_VEC: Record<Dir, { c: number; r: number }> = {
  N: { c: 0, r: -1 }, E: { c: 1, r: 0 }, S: { c: 0, r: 1 }, W: { c: -1, r: 0 }
};

export function MirrorsGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(mirrorLevels[0].id);
  const [placed, setPlaced] = useState<Record<string, Mirror>>({});
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const starMap = useGameStars("mirrors");
  const level = mirrorLevels.find((item) => item.id === levelId) ?? mirrorLevels[0];
  const beam = cast({ ...level, mirrors: placed });
  const lit = new Set(beam.cells.map((cell) => `${cell.c},${cell.r}`));
  const next = mirrorLevels.find((item) => item.id > level.id);
  const minMirrors = Object.keys(level.solution).length;
  const placedCount = Object.keys(placed).length;

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    setLevelId(id);
    setPlaced({});
    setWonStars(0);
    setShowHint(false);
  }

  function tap(key: string) {
    if (wonStars > 0) return;
    const start = `${level.start.c},${level.start.r}`;
    const goal = `${level.goal.c},${level.goal.r}`;
    if (key === start || key === goal || level.walls.includes(key)) return;
    const nextMirror = ORDER[(ORDER.indexOf(placed[key] ?? "") + 1) % ORDER.length];
    const mirrors = { ...placed };
    if (nextMirror) mirrors[key] = nextMirror;
    else delete mirrors[key];
    setPlaced(mirrors);

    if (cast({ ...level, mirrors }).hit) {
      const used = Object.keys(mirrors).length;
      const raw = used <= minMirrors ? 3 : used <= minMirrors + 1 ? 2 : 1;
      const earned = showHint ? Math.min(raw, 2) : raw;
      setWonStars(earned);
      recordStars("mirrors", String(level.id), earned);
      if (sound) {
        chime(true);
        say(dad("激光正中红宝石！入射角等于反射角，每面 45 度斜镜都让光线利落地拐了 90 度直角！"));
      }
    }
  }

  // Build continuous SVG laser polyline coordinates in 0..cols*100 x 0..rows*100 space
  const pts: string[] = [];
  if (beam.cells.length > 0) {
    const first = beam.cells[0];
    pts.push(`${(first.c + 0.5) * 100},${(first.r + 0.5) * 100}`);
    for (let i = 1; i < beam.cells.length; i++) {
      pts.push(`${(beam.cells[i].c + 0.5) * 100},${(beam.cells[i].r + 0.5) * 100}`);
    }
    if (!beam.hit) {
      // Extend beam half a cell past the last visited cell to show exit/wall impact
      const last = beam.cells[beam.cells.length - 1];
      let dir = level.start.dir;
      for (const cell of beam.cells) {
        const m = placed[`${cell.c},${cell.r}`];
        if (m === "/") dir = ({ E: "N", N: "E", W: "S", S: "W" } as const)[dir];
        if (m === "\\") dir = ({ E: "S", S: "E", W: "N", N: "W" } as const)[dir];
      }
      pts.push(`${(last.c + 0.5 + STEP_VEC[dir].c * 0.5) * 100},${(last.r + 0.5 + STEP_VEC[dir].r * 0.5) * 100}`);
    }
  }

  return (
    <div className="page">
      <TopBar
        emoji="🔦"
        title="镜子迷宫 · 光的反射"
        onBack={exit}
        backLabel="声光电磁馆"
        stars={sumStars(starMap)}
        maxStars={mirrorLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={mirrorLevels.map((l) => ({ id: l.id, title: `${l.id}. ${l.title}`, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${level.id} 关「${level.title}」：${level.story}`} />

      <div className="workbench">
        <div className="card" style={{ display: "grid", justifyItems: "center" }}>
          <div className="mirror-stage-wrap">
            <div className="mirror-grid" style={{ gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: level.rows * level.cols }, (_, index) => {
                const c = index % level.cols;
                const r = Math.floor(index / level.cols);
                const key = `${c},${r}`;
                const start = c === level.start.c && r === level.start.r;
                const goal = c === level.goal.c && r === level.goal.r;
                const wall = level.walls.includes(key);
                const mirror = placed[key];
                return (
                  <button
                    key={key}
                    type="button"
                    className={`mirror-cell${lit.has(key) ? " is-lit" : ""}${wall ? " is-wall" : ""}${start || goal ? " is-fixed" : ""}`}
                    onClick={() => tap(key)}
                    aria-label={wall ? "砖墙" : start ? "激光发射器" : goal ? "红宝石目标" : mirror ? `斜镜 ${mirror}` : "空格子"}
                  >
                    {wall ? "🧱" : start ? "🔦" : goal ? (beam.hit ? "✨" : "💎") : ""}
                  </button>
                );
              })}
            </div>

            <svg
              className="mirror-beam-svg"
              viewBox={`0 0 ${level.cols * 100} ${level.rows * 100}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {pts.length >= 2 && (
                <>
                  <polyline
                    points={pts.join(" ")}
                    fill="none"
                    stroke="rgba(255, 217, 61, 0.34)"
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={pts.join(" ")}
                    fill="none"
                    stroke={beam.hit ? "#6bcb77" : "#ffd93d"}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}
              {Object.entries(placed).map(([key, m]) => {
                const [c, r] = key.split(",").map(Number);
                const cx = (c + 0.5) * 100;
                const cy = (r + 0.5) * 100;
                const dx = 28;
                const dy = m === "/" ? -28 : 28;
                return (
                  <g key={key}>
                    <line
                      x1={cx - dx}
                      y1={cy - dy}
                      x2={cx + dx}
                      y2={cy + dy}
                      stroke="#7fd6ff"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    <line
                      x1={cx - dx}
                      y1={cy - dy}
                      x2={cx + dx}
                      y2={cy + dy}
                      stroke="#ffffff"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>已放镜子</small>
                <strong>{placedCount} 面</strong>
              </div>
              <div className="readout-box">
                <small>三星目标镜数</small>
                <strong style={{ color: "#3bb273" }}>{minMirrors} 面</strong>
              </div>
              <div className="readout-box">
                <small>红宝石状态</small>
                <strong style={{ color: beam.hit ? "#3bb273" : "#d96b27" }}>
                  {beam.hit ? "✨ 已点亮" : "💎 待照射"}
                </strong>
              </div>
            </div>
            <p className="note" style={{ marginTop: 12 }}>
              点击空白格子：第 1 下放 <strong>／斜镜</strong>，第 2 下换 <strong>＼反斜镜</strong>，第 3 下收起镜子。
            </p>
            <div className="play-actions">
              <button type="button" className="pill-btn" onClick={() => load(level.id)}>
                🔄 清空重摆
              </button>
              <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
                💡 反射提示
              </button>
            </div>
          </div>

          {showHint && (
            <HintBox
              text={`光沿直线传播，碰到 45° 斜镜就会拐 90° 直角：往东射来的光遇「／」往北折，遇「＼」往南折！本关最少只要 ${minMirrors} 面镜子（比如先在 (${Object.keys(level.solution)[0].split(",").map((n) => Number(n) + 1).join("列,")}行) 放一面「${Object.values(level.solution)[0]}」镜）。`}
            />
          )}
        </div>
      </div>

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={wonStars === 3 ? `精准 ${placedCount} 面镜子点亮红宝石！` : "激光成功击中红宝石！"}
          dadLine="潜望镜、万花筒、还有海底光纤能够转弯传信号，靠的全是镜面反射！入射角有多大，反射角就有多大。"
          onRetry={() => load(level.id)}
          onNext={next ? () => load(next.id) : exit}
          nextLabel={next ? `下一关：${next.title} →` : "回物理馆 →"}
        />
      )}
    </div>
  );
}

export const mirrors = {
  meta: {
    id: "mirrors",
    category: "physics" as const,
    title: "镜子迷宫",
    emoji: "🔦",
    blurb: "摆下 45° 小斜镜，让金色激光束拐过砖墙、正中红宝石！",
    tag: "光学 · 镜面反射",
    maxStars: mirrorLevels.length * 3
  },
  Play: MirrorsGame
};
