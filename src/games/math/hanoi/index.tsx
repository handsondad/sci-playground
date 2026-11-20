import { useEffect, useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { SIZES, canPlace, fewest, moveDisk, solved, startTowers, type Towers } from "./logic.ts";
import { meta } from "./meta.ts";

const DISK_COLORS = ["#ff6b6b", "#ff9f43", "#f0b429", "#3bb273", "#4d96ff"];
const PEG_NAMES = ["起点 A 柱", "中转 B 柱", "终点 C 柱"];
const ACCENT = "#7c6cf0";

export function HanoiGame({ exit, sound, setSound }: GameProps) {
  const [n, setN] = useState<number>(3);
  const [towers, setTowers] = useState<Towers>(() => startTowers(3));
  const [history, setHistory] = useState<Towers[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const starMap = useGameStars("hanoi");
  const moves = history.length;
  const done = solved(towers, n);
  const best = fewest(n);
  const stars = !done ? 0 : moves <= best ? 3 : moves <= best + n ? 2 : 1;
  const nextSize = SIZES.find((s) => s > n);

  useEffect(() => {
    if (sound) {
      say(dad(`${n}层汉诺塔！把所有圆盘搬到最右边的 C 柱，最少需要 ${fewest(n)} 步。`));
    }
  }, [n]);

  function reset(next = n) {
    setN(next);
    setTowers(startTowers(next));
    setHistory([]);
    setPicked(null);
    setWarn(null);
    setShowHint(false);
  }

  function tap(peg: number) {
    if (done) return;
    setWarn(null);
    if (picked === null) {
      if (towers[peg].length) setPicked(peg);
      return;
    }
    if (picked === peg) {
      setPicked(null);
      return;
    }
    const next = moveDisk(towers, picked, peg);
    if (!next) {
      setWarn("大盘子不能压在小盘子上面哦！换一根柱子放吧。");
      if (sound) chime(false);
      return;
    }
    const nextHistory = [...history, towers];
    setHistory(nextHistory);
    setTowers(next);
    setPicked(null);

    if (solved(next, n)) {
      const m = nextHistory.length;
      const earned = m <= best ? 3 : m <= best + n ? 2 : 1;
      recordStars("hanoi", String(n), earned);
      if (sound) {
        chime(true);
        say(dad(earned === 3 ? `太神啦！正好 ${m} 步，一步都没多走！` : `成功搬完 ${n} 层宝塔！`));
      }
    }
  }

  function undo() {
    if (history.length === 0 || done) return;
    setTowers(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setPicked(null);
    setWarn(null);
  }

  return (
    <div className="page">
      <TopBar
        emoji="🗼"
        title="汉诺塔 · 递归搬盘"
        onBack={exit}
        backLabel="数学思维馆"
        stars={sumStars(starMap)}
        maxStars={SIZES.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={SIZES.map((s) => ({
          id: s,
          title: `${s} 层宝塔（${fewest(s)}步）`,
          stars: starMap[String(s)] ?? 0
        }))}
        activeId={n}
        accent={ACCENT}
        onSelect={reset}
      />

      <DadSays
        text={`把 ${n} 个彩盘从左边「起点 A 柱」全搬到右边「终点 C 柱」。一次只搬最上面一块，大盘绝不能压小盘！`}
      />

      <div className="card">
        <div className="hanoi-stage">
          <div className="pegs">
            {towers.map((peg, index) => {
              const isPicked = picked === index;
              const isValid = picked !== null && picked !== index && canPlace(towers, picked, index);
              return (
                <button
                  key={index}
                  type="button"
                  className={`peg${isPicked ? " is-picked" : ""}${isValid ? " is-valid" : ""}`}
                  onClick={() => tap(index)}
                  aria-label={`${PEG_NAMES[index]}，共 ${peg.length} 个圆盘`}
                >
                  <span className="peg-label">{PEG_NAMES[index]}</span>
                  {peg.map((disk, diskIdx) => {
                    const isTop = diskIdx === peg.length - 1;
                    return (
                      <span
                        key={disk}
                        className={`disk${isPicked && isTop ? " is-lifted" : ""}`}
                        style={{
                          width: `${30 + (disk / n) * 64}%`,
                          background: DISK_COLORS[disk - 1]
                        }}
                      >
                        {disk}
                      </span>
                    );
                  })}
                </button>
              );
            })}
          </div>
        </div>

        <div className="readout-grid" style={{ marginTop: 14 }}>
          <div className="readout-box">
            <small>已走步数</small>
            <strong style={{ color: moves > best ? "#d96b27" : "#4d96ff" }}>{moves} 步</strong>
          </div>
          <div className="readout-box">
            <small>理论最少步数 (2ⁿ−1)</small>
            <strong>{best} 步</strong>
          </div>
          <div className="readout-box">
            <small>终点 C 柱已叠</small>
            <strong style={{ color: "#3bb273" }}>{towers[2].length} / {n}</strong>
          </div>
        </div>

        <div className="play-actions">
          <button type="button" className="pill-btn" onClick={undo} disabled={history.length === 0 || done}>
            ↩ 退一步
          </button>
          <button type="button" className="pill-btn" onClick={() => reset()}>
            🔄 重新开始
          </button>
          <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
            💡 递归口诀
          </button>
        </div>
      </div>

      {warn && <NianSays text={warn} />}

      {showHint && (
        <HintBox
          text={
            n % 2 === 1
              ? `秘诀：${n} 是单数层，第一步先把最小的 1 号红盘搬到最右边的「终点 C 柱」！想搬第 ${n} 号最大盘，只要先把上面 ${n - 1} 层搬到中间 B 柱（需要 ${fewest(n - 1)} 步），大盘一步到位，再把 ${n - 1} 层搬过来：${fewest(n - 1)} + 1 + ${fewest(n - 1)} = ${best} 步！`
              : `秘诀：${n} 是双数层，第一步先把最小的 1 号红盘搬到中间的「中转 B 柱」！先用 ${fewest(n - 1)} 步把上面 ${n - 1} 层叠到 B 柱，腾出路让 ${n} 号大盘去 C 柱，再用 ${fewest(n - 1)} 步合体：共 ${best} 步！`
          }
        />
      )}

      {done && (
        <WinCard
          stars={stars}
          verdict={stars === 3 ? `完美 ${moves} 步达成最优解！` : `用了 ${moves} 步搬完宝塔！`}
          dadLine={
            stars === 3
              ? `一步不差！每多加一层，最少步数就翻一倍再加一（2^${n} − 1 = ${best}）。传说神庙里有 64 层金盘，就算每秒搬一次也要搬五千八百亿年呢！`
              : `搬通啦！${n} 层最少只要 ${best} 步，要不要再来一局挑战满三星？`
          }
          onRetry={() => reset(n)}
          onNext={nextSize ? () => reset(nextSize) : exit}
          nextLabel={nextSize ? `挑战 ${nextSize} 层（${fewest(nextSize)}步）→` : "回数学馆 →"}
        />
      )}
    </div>
  );
}

export const hanoi = { meta, Play: HanoiGame };
