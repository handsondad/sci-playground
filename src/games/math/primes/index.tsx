import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { allPrimesFound, isPrime, primeLevels, remainingNumbers, sieveMarks, twinPrimesUpTo } from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#4d96ff";

const BROOM_COLORS: Record<number, string> = {
  2: "#4d96ff",
  3: "#ff9f43",
  5: "#3bb273",
  7: "#a66cff",
  11: "#ff6b6b",
  13: "#20bf6b"
};

function PrimesGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(primeLevels[0].id);
  const starMap = useGameStars("primes");
  const level = primeLevels.find((l) => l.id === levelId) ?? primeLevels[0];

  const [activeBrooms, setActiveBrooms] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);
  const [wastedBroom, setWastedBroom] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    setLevelId(id);
    setActiveBrooms([]);
    setShowHint(false);
    setWonStars(0);
    setWastedBroom(null);
  }

  const marks = useMemo(() => sieveMarks(level.limit, activeBrooms), [level.limit, activeBrooms]);
  const remaining = useMemo(() => remainingNumbers(level.limit, activeBrooms), [level.limit, activeBrooms]);
  const totalComposites = useMemo(() => {
    let c = 0;
    for (let n = 2; n <= level.limit; n++) if (!isPrime(n)) c++;
    return c;
  }, [level.limit]);

  const sweptCount = Object.keys(marks).length;
  const pct = totalComposites > 0 ? Math.round((sweptCount / totalComposites) * 100) : 100;
  const solved = allPrimesFound(level.limit, activeBrooms);
  const twinSet = useMemo(() => {
    const s = new Set<number>();
    if (level.showTwins) {
      for (const [a, b] of twinPrimesUpTo(level.limit)) {
        s.add(a);
        s.add(b);
      }
    }
    return s;
  }, [level]);

  function toggleBroom(p: number) {
    const exists = activeBrooms.includes(p);
    const next = exists ? activeBrooms.filter((x) => x !== p) : [...activeBrooms, p];
    const prevSwept = Object.keys(sieveMarks(level.limit, activeBrooms)).length;
    const nextSwept = Object.keys(sieveMarks(level.limit, next)).length;

    if (!exists && nextSwept === prevSwept) {
      setWastedBroom(p);
    } else {
      setWastedBroom(null);
    }
    setActiveBrooms(next);

    if (allPrimesFound(level.limit, next)) {
      const extra = Math.max(0, next.length - level.parBrooms);
      let raw = extra === 0 ? 3 : extra === 1 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("primes", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    }
  }

  const next = primeLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🔢"
        title="筛质数寻宝 · 埃氏筛法"
        onBack={exit}
        backLabel="数学思维馆"
        stars={sumStars(starMap)}
        maxStars={primeLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={primeLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card">
          <Meter
            pct={pct}
            label="已扫除合数"
            valueText={`${sweptCount} / ${totalComposites}`}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, minmax(0, 1fr))",
              gap: 6,
              marginTop: 14
            }}
            role="grid"
            aria-label={`1 到 ${level.limit} 的数字网格`}
          >
            {Array.from({ length: level.limit }, (_, i) => i + 1).map((n) => {
              if (n === 1) {
                return (
                  <div
                    key={n}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 10,
                      border: "2px dashed #cbd5e1",
                      background: "#f8fafc",
                      color: "#94a3b8",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.82rem",
                      fontWeight: 700
                    }}
                    title="1 既不是质数也不是合数"
                  >
                    <span>1</span>
                  </div>
                );
              }
              const by = marks[n];
              const isBroomHead = activeBrooms.includes(n);
              const primeShine = solved && by === undefined;
              const isTwin = primeShine && twinSet.has(n);
              const bg = by
                ? `color-mix(in srgb, ${BROOM_COLORS[by] ?? "#94a3b8"} 16%, #ffffff)`
                : primeShine
                  ? isTwin
                    ? "linear-gradient(135deg, #fff3bf, #ffd8a8)"
                    : "linear-gradient(135deg, #fef9c3, #fde68a)"
                  : isBroomHead
                    ? `color-mix(in srgb, ${BROOM_COLORS[n] ?? ACCENT} 24%, #ffffff)`
                    : "#ffffff";
              const border = by
                ? `2px solid color-mix(in srgb, ${BROOM_COLORS[by] ?? "#94a3b8"} 42%, #ffffff)`
                : primeShine
                  ? "2px solid #f59e0b"
                  : isBroomHead
                    ? `2.5px solid ${BROOM_COLORS[n] ?? ACCENT}`
                    : "2px solid #e2e8f0";
              return (
                <div
                  key={n}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 10,
                    border,
                    background: bg,
                    color: by ? "#94a3b8" : "#1e293b",
                    textDecoration: by ? "line-through" : "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: primeShine || isBroomHead ? 900 : 700,
                    fontSize: level.limit > 50 ? "0.84rem" : "0.95rem",
                    boxShadow: primeShine ? "0 3px 10px rgba(245, 158, 11, 0.22)" : "none",
                    transition: "all 0.22s ease"
                  }}
                  title={by ? `${n} 是 ${by} 的倍数（合数）` : primeShine ? `${n} 是质数！` : `${n}`}
                >
                  <span>{n}</span>
                  {isTwin && <small style={{ fontSize: "0.58rem", lineHeight: 1, color: "#d9480f" }}>✦双星</small>}
                </div>
              );
            })}
          </div>
          <p style={{ margin: "10px 0 0", fontSize: "0.84rem", color: "#64748b" }}>
            💡 1 既不是质数也不是合数；划线变淡的格子是被扫走的合数，留到最后发金光的就是质数宝石！
          </p>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>已派扫把</small>
                <strong style={{ color: activeBrooms.length <= level.parBrooms ? "#3bb273" : "#ff9f43" }}>
                  {activeBrooms.length} / {level.parBrooms} 把
                </strong>
              </div>
              <div className="readout-box">
                <small>剩余数字</small>
                <strong>{remaining.length} 个</strong>
              </div>
            </div>

            <p style={{ margin: "14px 0 8px", fontWeight: 800, fontSize: "0.95rem" }}>🧹 点击派出倍数扫把：</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {level.brooms.map((p) => {
                const on = activeBrooms.includes(p);
                const c = BROOM_COLORS[p] ?? ACCENT;
                return (
                  <button
                    key={p}
                    type="button"
                    className="pill-btn"
                    style={{
                      borderColor: on ? c : undefined,
                      background: on ? `color-mix(in srgb, ${c} 18%, #fff)` : "#fff",
                      fontWeight: 800,
                      justifyContent: "space-between",
                      display: "flex",
                      alignItems: "center"
                    }}
                    onClick={() => toggleBroom(p)}
                  >
                    <span>🧹 筛 {p} 的倍数</span>
                    <span>{on ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="pill-btn" onClick={() => { setActiveBrooms([]); setWonStars(0); setWastedBroom(null); }}>
                🔄 清空重筛
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 平方根秘密
              </button>
            </div>
          </div>

          {wastedBroom !== null && (
            <NianSays
              text={`咦？我派出了 ${wastedBroom} 号扫把，结果一个新合数都没扫到！因为 ${wastedBroom}×${wastedBroom}=${wastedBroom * wastedBroom} 已经超过 ${level.limit} 啦！`}
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`找齐 ${remaining.length} 颗质数宝石！`}
              dadLine={level.win}
              note={level.showTwins ? `本关孪生质数对：${twinPrimesUpTo(level.limit).map(([a, b]) => `(${a},${b})`).join("、")}` : undefined}
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

export const primes: GameModule = { meta, Play: PrimesGame };
