import { useEffect, useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { bases, matches, partner, strands, type Base, type Strand } from "./logic.ts";
import { meta } from "./meta.ts";

function blanks(item: Strand) {
  return item.given ? [...item.given] : item.template.split("").map(() => "");
}

const TONE: Record<Base, string> = { A: "is-A", T: "is-T", C: "is-C", G: "is-G" };
const BASE_COLOR: Record<Base, string> = { A: "#ff6b6b", T: "#4d96ff", C: "#3bb273", G: "#ff9f43" };
const BASE_FULL: Record<Base, string> = { A: "A 腺嘌呤", T: "T 胸腺嘧啶", C: "C 胞嘧啶", G: "G 鸟嘌呤" };
const ACCENT = "#5ec269";

export function PairsGame({ exit, sound, setSound }: GameProps) {
  const [strandId, setStrandId] = useState(strands[0].id);
  const starMap = useGameStars("pairs");
  const strand = strands.find((item) => item.id === strandId) ?? strands[0];

  const [filled, setFilled] = useState<string[]>(() => blanks(strands[0]));
  const [cursor, setCursor] = useState(0);
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const letters = strand.template.split("") as Base[];
  const rightCount = letters.reduce((acc, b, i) => acc + (filled[i] === partner(b) ? 1 : 0), 0);
  const next = strands.find((item) => item.id > strand.id);

  useEffect(() => {
    if (sound) say(dad(`第${strand.id}条基因链，${strand.title}。${strand.story}`));
  }, [strand.id]);

  function load(id: number) {
    const item = strands.find((entry) => entry.id === id) ?? strands[0];
    setStrandId(item.id);
    const init = blanks(item);
    setFilled(init);
    const firstWrong = item.template.split("").findIndex((b, idx) => init[idx] !== partner(b as Base));
    setCursor(firstWrong >= 0 ? firstWrong : 0);
    setWonStars(0);
    setShowHint(false);
  }

  function applyAt(index: number, nextBase: Base) {
    if (wonStars > 0) return;
    const copy = filled.slice();
    copy[index] = nextBase;
    setFilled(copy);

    if (matches(strand.template, copy)) {
      const earned = showHint ? 2 : 3;
      setWonStars(earned);
      recordStars("pairs", String(strand.id), earned);
      if (sound) {
        chime(true);
        say(dad("双螺旋拉链严丝合缝！A 永远配 T，C 永远配 G，细胞复制基因就是靠这个密码！"));
      }
    } else {
      // Advance cursor to next unmatched slot
      for (let step = 1; step <= letters.length; step++) {
        const cand = (index + step) % letters.length;
        if (copy[cand] !== partner(letters[cand])) {
          setCursor(cand);
          break;
        }
      }
    }
  }

  function tapSlot(index: number) {
    if (wonStars > 0) return;
    setCursor(index);
    const current = filled[index];
    const at = bases.indexOf(current as Base);
    const nextBase = bases[(at + 1) % bases.length];
    applyAt(index, nextBase);
  }

  return (
    <div className="page">
      <TopBar
        emoji="🧬"
        title="碱基配对 · DNA 双螺旋密码"
        onBack={exit}
        backLabel="生命科学馆"
        stars={sumStars(starMap)}
        maxStars={strands.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={strands.map((s) => ({ id: s.id, title: `${s.id}. ${s.title}`, stars: starMap[String(s.id)] ?? 0 }))}
        activeId={strand.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${strand.id} 条「${strand.title}」：${strand.story} 记住钥匙扣规则——红 A 对蓝 T，绿 C 对橙 G！`} />

      <div className="card">
        <Meter
          pct={Math.round((rightCount / letters.length) * 100)}
          label="已配对碱基对"
          valueText={`${rightCount} / ${letters.length}`}
        />

        <div className="dna-ladder" style={{ marginTop: 14 }}>
          {letters.map((base, index) => {
            const value = filled[index] as Base | "";
            const isMatch = value === partner(base);
            const bonds = base === "A" || base === "T" ? "‖" : "|||";
            return (
              <div
                key={index}
                className={`dna-rung${cursor === index && wonStars === 0 ? " is-selected" : ""}${isMatch ? " is-match" : ""}`}
              >
                <span className={`base ${TONE[base]}`} aria-hidden="true">{base}</span>
                <span className="dna-bonds" aria-hidden="true">
                  {isMatch ? bonds : value ? "✕" : "⋮"}
                </span>
                <button
                  type="button"
                  className={`base ${value ? TONE[value] : "is-empty"}`}
                  onClick={() => tapSlot(index)}
                  aria-label={`第 ${index + 1} 格，模板是 ${base}，应对 ${partner(base)}，当前 ${value || "空"}`}
                >
                  {value || "?"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="note" style={{ textAlign: "center", marginTop: 10 }}>
          既可以直接点上面的格子切换，也可以点下面四个碱基按钮填入亮框位置（第 {cursor + 1} 格）：
        </p>

        <div className="base-keypad">
          {bases.map((b) => (
            <button
              key={b}
              type="button"
              className="base-key"
              style={{ background: BASE_COLOR[b] }}
              disabled={wonStars > 0}
              onClick={() => applyAt(cursor, b)}
            >
              {BASE_FULL[b]}
            </button>
          ))}
        </div>

        <div className="play-actions" style={{ justifyContent: "center", marginTop: 14 }}>
          <button type="button" className="pill-btn" onClick={() => load(strand.id)}>
            🔄 重新配对
          </button>
          <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
            💡 沃森与克里克秘诀
          </button>
        </div>
      </div>

      {showHint && (
        <HintBox
          text={`A（红）和 T（蓝）之间有 2 根氢键「‖」，C（绿）和 G（橙）之间有 3 根氢键「|||」，换别的字母根本扣不上！第 ${cursor + 1} 格上面是 ${letters[cursor]}，下面应该填 ${partner(letters[cursor])}。`}
        />
      )}

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={`完美互补！${letters.length} 对碱基氢键全部扣紧！`}
          dadLine="正因为 A 只认 T、C 只认 G，细胞分裂时只要把双螺旋像拉链一样拉开，照着每一半就能一字不差地复印出两份完整基因！"
          note={`上链 5'-${strand.template}-3' ⇄ 下链 3'-${filled.join("")}-5'`}
          onRetry={() => load(strand.id)}
          onNext={next ? () => load(next.id) : exit}
          nextLabel={next ? `下一条：${next.title} →` : "回生物馆 →"}
        />
      )}
    </div>
  );
}

export const pairs = { meta, Play: PairsGame };
