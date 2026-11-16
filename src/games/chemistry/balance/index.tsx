import { useEffect, useState, type ReactNode } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { atoms, imbalance, reactions, type Term } from "./logic.ts";

const ACCENT = "#2fb380";
const EL_META: Record<string, { name: string; color: string }> = {
  H: { name: "氢原子 (H)", color: "#4d96ff" },
  O: { name: "氧原子 (O)", color: "#ff6b6b" },
  C: { name: "碳原子 (C)", color: "#5d4e37" },
  N: { name: "氮原子 (N)", color: "#a66cff" },
  Fe: { name: "铁原子 (Fe)", color: "#e07f22" }
};

function renderFormula(formula: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i];
    if (ch >= "0" && ch <= "9") {
      let num = "";
      while (i < formula.length && formula[i] >= "0" && formula[i] <= "9") num += formula[i++];
      out.push(<sub key={i}>{num}</sub>);
    } else {
      out.push(ch);
      i += 1;
    }
  }
  return out;
}

function sumSide(terms: readonly Term[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of terms) {
    for (const [el, n] of Object.entries(atoms(t.formula))) {
      counts[el] = (counts[el] ?? 0) + t.coeff * n;
    }
  }
  return counts;
}

export function BalanceGame({ exit, sound, setSound }: GameProps) {
  const [reactionId, setReactionId] = useState(reactions[0].id);
  const [coeffs, setCoeffs] = useState<number[]>(() => reactions[0].solution.map(() => 1));
  const [checked, setChecked] = useState<string | null | undefined>(undefined);
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const starMap = useGameStars("balance");
  const reaction = reactions.find((item) => item.id === reactionId) ?? reactions[0];
  const next = reactions.find((item) => item.id > reaction.id);

  useEffect(() => {
    if (sound) say(dad(`第${reaction.id}题，${reaction.title}。调前面的分子个数，让箭头两边的每种原子一样多！`));
  }, [reaction.id]);

  function load(id: number) {
    const item = reactions.find((entry) => entry.id === id) ?? reactions[0];
    setReactionId(item.id);
    setCoeffs(item.solution.map(() => 1));
    setChecked(undefined);
    setWonStars(0);
    setShowHint(false);
  }

  function nudge(index: number, delta: number) {
    if (wonStars > 0) return;
    setCoeffs((prev) => prev.map((value, i) => (i === index ? Math.min(8, Math.max(1, value + delta)) : value)));
    setChecked(undefined);
  }

  const leftTerms: Term[] = reaction.left.map((formula, i) => ({ formula, coeff: coeffs[i] }));
  const rightTerms: Term[] = reaction.right.map((formula, i) => ({
    formula,
    coeff: coeffs[reaction.left.length + i]
  }));
  const leftCounts = sumSide(leftTerms);
  const rightCounts = sumSide(rightTerms);
  const elements = Array.from(new Set([...Object.keys(leftCounts), ...Object.keys(rightCounts)]));

  function check() {
    const off = imbalance(leftTerms, rightTerms);
    setChecked(off);
    if (off === null) {
      const minimal = coeffs.every((v, i) => v === reaction.solution[i]);
      const earned = showHint ? 2 : minimal ? 3 : 2;
      setWonStars(earned);
      recordStars("balance", String(reaction.id), earned);
      if (sound) {
        chime(true);
        say(dad("天平完全持平！化学反应里一颗原子都不会凭空消失，也不会凭空多出来。"));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const terms = [...reaction.left, ...reaction.right];

  return (
    <div className="page">
      <TopBar
        emoji="⚖️"
        title="配平方程式 · 质量守恒"
        onBack={exit}
        backLabel="化学馆"
        stars={sumStars(starMap)}
        maxStars={reactions.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={reactions.map((r) => ({ id: r.id, title: `${r.id}. ${r.title}`, stars: starMap[String(r.id)] ?? 0 }))}
        activeId={reaction.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${reaction.id} 题「${reaction.title}」：增减分子前面的系数，让反应前后每一种颜色的原子珠子两边一样多！`} />

      <div className="card">
        <div className="equation-box">
          {terms.map((formula, index) => (
            <span key={`${formula}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              {index === reaction.left.length && (
                <strong style={{ fontSize: "1.5rem", color: "#ff9f43" }}>→</strong>
              )}
              {index > 0 && index !== reaction.left.length && (
                <strong style={{ fontSize: "1.35rem", color: "#8b7a5c" }}>+</strong>
              )}
              <span className="term-card">
                <span className="coeff-spin">
                  <button
                    type="button"
                    className="nudge"
                    onClick={() => nudge(index, 1)}
                    aria-label={`${formula} 系数加一`}
                  >
                    +
                  </button>
                  <strong>{coeffs[index]}</strong>
                  <button
                    type="button"
                    className="nudge"
                    onClick={() => nudge(index, -1)}
                    disabled={coeffs[index] <= 1}
                    aria-label={`${formula} 系数减一`}
                  >
                    −
                  </button>
                </span>
                <span className="formula-text">{renderFormula(formula)}</span>
              </span>
            </span>
          ))}
        </div>

        <div className="atom-balance-grid">
          {elements.map((el) => {
            const lCount = leftCounts[el] ?? 0;
            const rCount = rightCounts[el] ?? 0;
            const even = lCount === rCount && lCount > 0;
            const meta = EL_META[el] ?? { name: el, color: "#4d96ff" };
            return (
              <div key={el} className={`atom-card${even ? " is-even" : ""}`}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span>{meta.name}</span>
                  <span style={{ color: even ? "#2f8a3c" : "#d94848" }}>
                    {lCount} {even ? "＝" : "≠"} {rCount}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>反应前（左）：{lCount} 颗</div>
                <div className="atom-dots">
                  {Array.from({ length: Math.min(lCount, 16) }, (_, k) => (
                    <span key={k} className="atom-dot" style={{ background: meta.color }} />
                  ))}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>反应后（右）：{rCount} 颗</div>
                <div className="atom-dots">
                  {Array.from({ length: Math.min(rCount, 16) }, (_, k) => (
                    <span key={k} className="atom-dot" style={{ background: meta.color }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="play-actions" style={{ marginTop: 14 }}>
          <button type="button" className="primary-btn" onClick={check} disabled={wonStars > 0}>
            ⚖️ 点火验证配平！
          </button>
          <button type="button" className="pill-btn" onClick={() => load(reaction.id)}>
            🔄 全部归 1
          </button>
          <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
            💡 配平口诀
          </button>
        </div>
      </div>

      {typeof checked === "string" && (
        <NianSays text={`看下面的原子计数卡！「${checked}」左右两边的珠子还不相等哦，再调调它的系数！`} />
      )}

      {showHint && (
        <HintBox
          text={`先配只在一个分子里出现的元素，最后配单质（比如 O₂、Fe）！本关最简整数比是：${reaction.solution.join(" : ")}。`}
        />
      )}

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={`配平成功！系数比 ${coeffs.join(" : ")} 严丝合缝！`}
          dadLine="拉瓦锡用精密天平证明：化学反应就像拆积木重搭，积木块（原子）一颗不少、一颗不多，只是换了牵手的方式！"
          onRetry={() => load(reaction.id)}
          onNext={next ? () => load(next.id) : exit}
          nextLabel={next ? `下一题：${next.title} →` : "回化学馆 →"}
        />
      )}
    </div>
  );
}

export const balance = {
  meta: {
    id: "balance",
    category: "chemistry" as const,
    title: "配平方程式",
    emoji: "⚖️",
    blurb: "看着左右两边的彩色原子珠子调系数，亲手验证「反应前后一颗原子都不少」！",
    tag: "定量 · 质量守恒",
    maxStars: reactions.length * 3
  },
  Play: BalanceGame
};
