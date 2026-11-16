import { useEffect, useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { hostOpens, switched, tally, wins } from "./logic.ts";

const ACCENT = "#7c6cf0";
const STAGES = [
  { id: 1, title: "① 亲手猜门" },
  { id: 2, title: "② 百次模拟机" },
  { id: 3, title: "③ 十扇门放大镜" }
] as const;

export function MontyGame({ exit, sound, setSound }: GameProps) {
  const [stageId, setStageId] = useState<number>(1);
  const starMap = useGameStars("monty");

  // Stage 1 state: live 3-door show
  const [prize, setPrize] = useState(() => Math.floor(Math.random() * 3));
  const [pick, setPick] = useState<number | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  const [finalDoor, setFinalDoor] = useState<number | null>(null);
  const [score, setScore] = useState({ stayWin: 0, stayTotal: 0, swapWin: 0, swapTotal: 0 });
  const [showHint, setShowHint] = useState(false);

  // Stage 2 state: simulation lab
  const [trials, setTrials] = useState(30);
  const [simResult, setSimResult] = useState<{ stay: number; swap: number; n: number } | null>(null);
  const [labAnswer, setLabAnswer] = useState<"stay" | "swap" | null>(null);

  // Stage 3 state: 10-door amplifier
  const [tenPick, setTenPick] = useState<number | null>(null);
  const [tenPrize, setTenPrize] = useState(() => Math.floor(Math.random() * 10));
  const [tenQuiz, setTenQuiz] = useState<string | null>(null);

  useEffect(() => {
    if (!sound) return;
    if (stageId === 1) say(dad("三扇门后面藏着一辆小汽车和两只山羊！先挑一扇门吧。"));
    if (stageId === 2) say(dad("运气会骗人，但做上百次实验不会骗人！按按钮启动模拟机看看。"));
    if (stageId === 3) say(dad("把三扇门变成十扇门，你的直觉一下子就会醒过来！先选一扇吧。"));
  }, [stageId]);

  function resetRound() {
    setPrize(Math.floor(Math.random() * 3));
    setPick(null);
    setOpened(null);
    setFinalDoor(null);
  }

  function chooseDoor(door: number) {
    if (pick !== null) return;
    const goatDoor = hostOpens(prize, door);
    setPick(door);
    setOpened(goatDoor);
    if (sound) say(dad(`我帮你推开没奖的第 ${goatDoor + 1} 号山羊门！现在你要坚持 ${door + 1} 号门，还是换门？`));
  }

  function decide(stay: boolean) {
    if (pick === null || opened === null || finalDoor !== null) return;
    const door = stay ? pick : switched(pick, opened);
    const won = door === prize;
    setFinalDoor(door);
    const nextScore = {
      stayWin: score.stayWin + (stay && won ? 1 : 0),
      stayTotal: score.stayTotal + (stay ? 1 : 0),
      swapWin: score.swapWin + (!stay && won ? 1 : 0),
      swapTotal: score.swapTotal + (!stay ? 1 : 0)
    };
    setScore(nextScore);
    const totalPlayed = nextScore.stayTotal + nextScore.swapTotal;
    if (totalPlayed >= 3) {
      recordStars("monty", "1", nextScore.swapTotal >= 1 && nextScore.stayTotal >= 1 ? 3 : 2);
    } else if (won) {
      recordStars("monty", "1", 1);
    }
    if (sound) chime(won);
  }

  function runSim(count: number) {
    setTrials(count);
    setLabAnswer(null);
    if (count === 30) {
      const exact = tally(30);
      setSimResult({ ...exact, n: 30 });
    } else {
      let stay = 0;
      let swap = 0;
      for (let i = 0; i < count; i++) {
        const p = Math.floor(Math.random() * 3);
        const first = Math.floor(Math.random() * 3);
        if (wins(p, first, true)) stay += 1;
        if (wins(p, first, false)) swap += 1;
      }
      setSimResult({ stay, swap, n: count });
    }
    if (sound) chime(true);
  }

  function answerLab(choice: "stay" | "swap") {
    setLabAnswer(choice);
    if (choice === "swap") {
      recordStars("monty", "2", 3);
      if (sound) {
        chime(true);
        say(dad("答对啦！换门能赢三分之二，整整是坚持原门的两倍！"));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const tenRival = tenPick === null ? 0 : tenPick === tenPrize ? (tenPick + 1) % 10 : tenPrize;

  function answerTen(choice: string) {
    setTenQuiz(choice);
    if (choice === "9/10") {
      recordStars("monty", "3", 3);
      if (sound) {
        chime(true);
        say(dad("完全正确！另外九扇门 9/10 的机会全浓缩在剩下的那一扇门上了！"));
      }
    } else {
      recordStars("monty", "3", 1);
      if (sound) chime(false);
    }
  }

  const totalRounds = score.stayTotal + score.swapTotal;

  return (
    <div className="page">
      <TopBar
        emoji="🚪"
        title="三扇门 · 蒙提霍尔悖论"
        onBack={exit}
        backLabel="数学思维馆"
        stars={sumStars(starMap)}
        maxStars={9}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={STAGES.map((s) => ({ id: s.id, title: s.title, stars: starMap[String(s.id)] ?? 0 }))}
        activeId={stageId}
        accent={ACCENT}
        onSelect={setStageId}
      />

      {stageId === 1 && (
        <>
          <DadSays
            text={
              pick === null
                ? "三扇门后只有一辆小汽车🚗，另外两扇是山羊🐐。先点一扇门选定，再试试「坚持」和「换门」各玩几局（满 3 局点亮勋章）！"
                : finalDoor === null
                  ? `你选了 ${pick + 1} 号门。爸爸知道车在哪，特意打开了没奖的 ${opened! + 1} 号山羊门——现在换去另一扇门吗？`
                  : finalDoor === prize
                    ? `恭喜！${finalDoor + 1} 号门后面真是小汽车🚗！再来一局攒够 3 局看看规律吧！`
                    : `哈哈，${finalDoor + 1} 号门是贪吃山羊🐐，汽车藏在 ${prize + 1} 号门！再来一局！`
            }
          />

          <div className="card">
            <div className="doors">
              {[0, 1, 2].map((door) => {
                const open = opened === door || finalDoor !== null;
                const showPrize = open && door === prize;
                const isPicked = pick === door;
                return (
                  <button
                    key={door}
                    type="button"
                    className={`door${open ? " is-open" : ""}${isPicked ? " is-picked" : ""}${showPrize ? " is-prize" : ""}`}
                    onClick={() => chooseDoor(door)}
                    disabled={pick !== null}
                  >
                    {isPicked && <span className="door-badge">你先选的</span>}
                    <span aria-hidden="true">{showPrize ? "🚗" : open ? "🐐" : "🚪"}</span>
                    <small>
                      {opened === door
                        ? `${door + 1} 号门（主持人揭开）`
                        : finalDoor === door
                          ? `${door + 1} 号门（最终选择）`
                          : `${door + 1} 号门`}
                    </small>
                  </button>
                );
              })}
            </div>

            {pick !== null && finalDoor === null && (
              <div className="play-actions" style={{ justifyContent: "center" }}>
                <button type="button" className="pill-btn" onClick={() => decide(true)}>
                  🔒 坚持 {pick + 1} 号门
                </button>
                <button type="button" className="primary-btn" onClick={() => decide(false)}>
                  🔄 换去 {switched(pick, opened!) + 1} 号门！
                </button>
              </div>
            )}

            <div className="readout-grid" style={{ marginTop: 12 }}>
              <div className="readout-box">
                <small>坚持原门战绩</small>
                <strong>{score.stayWin} 胜 / {score.stayTotal} 局</strong>
              </div>
              <div className="readout-box">
                <small>换一扇门战绩</small>
                <strong style={{ color: "#3bb273" }}>{score.swapWin} 胜 / {score.swapTotal} 局</strong>
              </div>
              <div className="readout-box">
                <small>已玩总局数</small>
                <strong>{totalRounds} / 3 局</strong>
              </div>
            </div>

            <div className="play-actions">
              <button type="button" className="primary-btn is-blue" onClick={resetRound}>
                🎲 再开一局
              </button>
              <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
                💡 为什么换门更划算？
              </button>
            </div>
          </div>

          {showHint && (
            <HintBox text="你第一次瞎猜时，猜中汽车只有 1/3，猜中山羊却有 2/3！只要你一开始选的是山羊（2/3 的情况），主持人把另一只山羊揭开后，剩下那扇门百分百就是汽车！" />
          )}

          {totalRounds >= 3 && finalDoor !== null && (
            <WinCard
              stars={score.swapTotal >= 1 && score.stayTotal >= 1 ? 3 : 2}
              verdict="完成了亲手试门实验！"
              dadLine="只玩三五局还会碰上运气波动——走，去第 ② 关「百次模拟机」一口气跑几百局看真相！"
              onRetry={resetRound}
              onNext={() => setStageId(2)}
              nextLabel="下一关：百次模拟机 →"
            />
          )}
        </>
      )}

      {stageId === 2 && (
        <>
          <DadSays text="让电脑同时测试「死守原门」和「每次必换」两种策略！点下面按钮跑 30 次、100 次或 600 次看看胜率条。" />
          <div className="card">
            <div className="play-actions">
              <button type="button" className={simResult?.n === 30 ? "primary-btn" : "pill-btn"} onClick={() => runSim(30)}>
                ⚡ 各跑 30 局
              </button>
              <button type="button" className={simResult?.n === 100 ? "primary-btn" : "pill-btn"} onClick={() => runSim(100)}>
                ⚡ 各跑 100 局
              </button>
              <button type="button" className={simResult?.n === 600 ? "primary-btn" : "pill-btn"} onClick={() => runSim(600)}>
                🚀 各跑 600 局
              </button>
            </div>

            {simResult && (
              <>
                <div className="sim-bars" aria-label={`坚持赢了 ${simResult.stay} 次，换门赢了 ${simResult.swap} 次`}>
                  <div className="sim-bar-row">
                    <span>🔒 坚持原门</span>
                    <span className="sim-bar-track">
                      <span
                        className="sim-bar-fill"
                        style={{ width: `${(simResult.stay / simResult.n) * 100}%`, background: "#4d96ff" }}
                      />
                    </span>
                    <span>{Math.round((simResult.stay / simResult.n) * 100)}% ({simResult.stay})</span>
                  </div>
                  <div className="sim-bar-row">
                    <span>🔄 每次换门</span>
                    <span className="sim-bar-track">
                      <span
                        className="sim-bar-fill"
                        style={{ width: `${(simResult.swap / simResult.n) * 100}%`, background: "#ff9f43" }}
                      />
                    </span>
                    <span>{Math.round((simResult.swap / simResult.n) * 100)}% ({simResult.swap})</span>
                  </div>
                </div>

                <NianSays text={`哇！跑了 ${simResult.n} 局，哪一种办法赢汽车的次数明显更多呀？`} />
                <div className="play-actions">
                  <button type="button" className="pill-btn" onClick={() => answerLab("stay")}>
                    坚持原门赢得更多
                  </button>
                  <button type="button" className="primary-btn" onClick={() => answerLab("swap")}>
                    换一扇门赢得更多（约 2/3）
                  </button>
                </div>
              </>
            )}

            {labAnswer === "stay" && (
              <p className="banner is-warn">再瞄一眼上面的彩色长条！坚持原门只赢了约 1/3，换门赢了足足 2/3 哦。</p>
            )}
          </div>

          {labAnswer === "swap" && (
            <WinCard
              stars={3}
              verdict={`大数定律揭晓：换门胜率稳定在 67%（${trials} 局赢 ${simResult?.swap} 局）！`}
              dadLine="很多人直觉以为剩两扇门就是五五开，其实主持人「故意避开汽车」这个动作悄悄送了你一条关键情报！去第 ③ 关用十扇门看个彻底！"
              onNext={() => setStageId(3)}
              nextLabel="下一关：十扇门放大镜 →"
            />
          )}
        </>
      )}

      {stageId === 3 && (
        <>
          <DadSays text="把 3 扇门放大成 10 扇门！先随便点一扇门选好，看爸爸一挥手帮你排除 8 只山羊！" />
          <div className="card">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: 8,
                marginBottom: 14
              }}
            >
              {Array.from({ length: 10 }, (_, d) => {
                const isPicked = tenPick === d;
                const goatOpened = tenPick !== null && d !== tenPick && d !== tenRival;
                const revealed = tenQuiz === "9/10";
                return (
                  <button
                    key={d}
                    type="button"
                    className={`pill-btn${isPicked ? " is-active" : ""}`}
                    style={{
                      minHeight: 72,
                      flexDirection: "column",
                      background: goatOpened ? "#f5f2ed" : isPicked ? "#fff4d6" : "#ffffff",
                      borderColor: d === tenRival && tenPick !== null ? "#ff9f43" : undefined
                    }}
                    disabled={tenPick !== null}
                    onClick={() => {
                      setTenPick(d);
                      setTenQuiz(null);
                      if (sound) chime(true);
                    }}
                  >
                    <span style={{ fontSize: "1.45rem" }}>
                      {revealed && d === tenPrize ? "🚗" : goatOpened ? "🐐" : "🚪"}
                    </span>
                    <small>{isPicked ? `${d + 1}号(你选)` : goatOpened ? "已排除" : `${d + 1}号门`}</small>
                  </button>
                );
              })}
            </div>

            {tenPick !== null && (
              <>
                <NianSays
                  text={`我先盲选了 ${tenPick + 1} 号门（只有 1/10 猜中）。爸爸一口气推开了 8 扇山羊门，只留下 ${tenRival + 1} 号门没开！这时候换去 ${tenRival + 1} 号门，赢汽车的概率是多少？`}
                />
                <div className="play-actions">
                  {["1/10（一成）", "1/2（五五开）", "9/10（九成稳赢！）"].map((label) => {
                    const code = label.split("（")[0];
                    return (
                      <button
                        key={code}
                        type="button"
                        className={tenQuiz === code ? "primary-btn" : "pill-btn"}
                        onClick={() => answerTen(code)}
                      >
                        {label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="pill-btn"
                    onClick={() => {
                      setTenPick(null);
                      setTenQuiz(null);
                      setTenPrize(Math.floor(Math.random() * 10));
                    }}
                  >
                    🔄 换一轮十扇门
                  </button>
                </div>
              </>
            )}

            {tenQuiz && tenQuiz !== "9/10" && (
              <p className="banner is-warn">
                想想看：你最初瞎蒙 {tenPick! + 1} 号门只有 1/10 猜中，另外 9 扇门合起来有 9/10！现在 8 只山羊被排除了，那 9/10 的机会全落在了谁身上？
              </p>
            )}
          </div>

          {tenQuiz === "9/10" && (
            <WinCard
              stars={3}
              verdict="直觉彻底通透：9/10 的概率全集中在剩下的那扇门上！"
              dadLine="这叫「极端化思维」——数学家遇到想不通的 3 扇门，就把它放大成 10 扇、100 扇，藏着的概率真相一秒钟就水落石出啦！"
              onRetry={() => {
                setTenPick(null);
                setTenQuiz(null);
                setTenPrize(Math.floor(Math.random() * 10));
              }}
              onNext={exit}
              nextLabel="回数学馆 →"
            />
          )}
        </>
      )}
    </div>
  );
}

export const monty = {
  meta: {
    id: "monty",
    category: "math" as const,
    title: "三扇门",
    emoji: "🚪",
    blurb: "主持人揭开一只山羊后，换门胜率竟翻倍！亲手猜门、跑百次模拟、再用十扇门看穿真相。",
    tag: "概率 · 贝叶斯直觉",
    maxStars: 9
  },
  Play: MontyGame
};
