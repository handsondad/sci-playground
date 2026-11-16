import { useMemo, useState } from "react";
import { Says, TopBar, starRow, type Settings } from "../../../../kit/Chrome.tsx";
import { TrackCanvas } from "../components/TrackCanvas.tsx";
import { quizzes, type Quiz } from "../data/quiz.ts";
import { useClock } from "../../../../kit/useClock.ts";
import { boundsAround, play, poseAt, trackThrough, type LevelSpec } from "../lib/slide.ts";

function specOf(quiz: Quiz): LevelSpec {
  return { id: 0, emoji: "", title: "", story: "", hint: "", win: "", ...quiz.spec };
}

function quizStars(correct: number) {
  if (correct >= 6) return 3;
  if (correct >= 4) return 2;
  if (correct >= 2) return 1;
  return 0;
}

export function QuizPage({ settings, onBack, onFinish }: {
  settings: Settings;
  onBack: () => void;
  onFinish: (stars: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [correct, setCorrect] = useState(0);
  const [nonce, setNonce] = useState(0);
  const quiz = quizzes[index];
  const done = index >= quizzes.length;

  if (done) {
    const stars = quizStars(correct);
    return (
      <div className="page">
        <TopBar emoji="🤔" title="谁先到底" onBack={onBack} settings={settings} />
        <p className="stars-now" aria-label={`${stars} 颗星`}>{starRow(stars)}</p>
        <h2 className="result-title">猜对 {correct} / {quizzes.length} 题</h2>
        <Says who="dad">{stars >= 3 ? "全对。你已经会用眼睛看出哪条滑梯更快了。" : "差一点的那几题，再看一次小球怎么加速。"}</Says>
        <button type="button" className="primary" onClick={() => { setIndex(0); setPicked(null); setCorrect(0); setNonce(0); }}>再猜一轮</button>
      </div>
    );
  }

  return (
    <QuizRound
      key={quiz.id}
      quiz={quiz}
      index={index}
      settings={settings}
      nonce={nonce}
      picked={picked}
      onBack={onBack}
      onPick={(side) => {
        setPicked(side);
        setNonce((n) => n + 1);
        if (side === quiz.claim) setCorrect((n) => n + 1);
      }}
      onNext={() => {
        const last = index + 1 >= quizzes.length;
        if (last) onFinish(quizStars(correct));
        setPicked(null);
        setIndex(index + 1);
      }}
    />
  );
}

function QuizRound({ quiz, index, settings, nonce, picked, onBack, onPick, onNext }: {
  quiz: Quiz;
  index: number;
  settings: Settings;
  nonce: number;
  picked: "a" | "b" | null;
  onBack: () => void;
  onPick: (side: "a" | "b") => void;
  onNext: () => void;
}) {
  const spec = specOf(quiz);
  const built = useMemo(() => {
    const course = specOf(quiz);
    return { a: play(course, quiz.a), b: play(course, quiz.b) };
  }, [quiz]);
  const duration = Math.max(built.a.motion.time, built.b.motion.time);
  const clock = useClock(picked ? nonce : 0, picked ? duration : 0);
  const reveal = picked != null && clock >= duration - 0.03;
  const extras: { x: number; y: number }[] = [spec.start, spec.end];
  for (const rock of spec.rocks ?? []) {
    extras.push({ x: rock.x - rock.r, y: rock.y - rock.r }, { x: rock.x + rock.r, y: rock.y + rock.r });
  }
  for (const gate of spec.gates ?? []) extras.push({ x: gate.x, y: gate.y0 }, { x: gate.x, y: gate.y1 });
  const bounds = boundsAround([built.a.points, built.b.points, extras], 0.45, 0.4);
  const bead = (side: "a" | "b") => {
    const motion = built[side].motion;
    const p = poseAt(motion, picked ? clock : 0);
    return { x: p.x, y: p.y, color: side === "a" ? "#ff6b6b" : "#4d96ff" };
  };

  return (
    <div className="page">
      <TopBar emoji="🤔" title={`谁先到底 · ${index + 1} / ${quizzes.length}`} onBack={onBack} settings={settings} />
      <Says who="nian">{quiz.prompt}</Says>
      <TrackCanvas
        label="两条滑梯"
        bounds={bounds}
        rocks={spec.rocks}
        gates={spec.gates}
        flag={spec.end}
        dock={spec.start}
        tracks={[
          { points: trackThrough(spec.start, spec.end, spec.xs, quiz.a), color: "#ff6b6b", width: 6 },
          { points: trackThrough(spec.start, spec.end, spec.xs, quiz.b), color: "#4d96ff", width: 6 }
        ]}
        beads={[bead("a"), bead("b")]}
      />
      <div className="row">
        <button type="button" className="primary is-red" disabled={picked != null} onClick={() => onPick("a")}>红滑梯更快</button>
        <button type="button" className="primary is-blue" disabled={picked != null} onClick={() => onPick("b")}>蓝滑梯更快</button>
      </div>
      {reveal && (
        <>
          <p className="banner">{picked === quiz.claim ? "猜对了！" : "这次是另一条。"} {quiz.why}</p>
          <p className="times">
            <span>红 <b>{built.a.motion.finished ? `${built.a.motion.time.toFixed(2)} 秒` : "到不了"}</b></span>
            <span>蓝 <b>{built.b.motion.finished ? `${built.b.motion.time.toFixed(2)} 秒` : "到不了"}</b></span>
          </p>
          <button type="button" className="primary" onClick={onNext}>{index + 1 === quizzes.length ? "看成绩" : "下一题"}</button>
        </>
      )}
    </div>
  );
}
