import { useEffect, useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { baths, cells, shift, type Shift } from "./logic.ts";

const SCALE: Record<Shift, number> = { swell: 1.32, stay: 1.0, shrink: 0.72 };
const SHIFT_DESC: Record<Shift, string> = {
  swell: "🫧 吸水鼓胀变大",
  stay: "⚖️ 进出平衡不变",
  shrink: "🥀 失水皱缩变瘪"
};
const ACCENT = "#5ec269";

export function OsmosisGame({ exit, sound, setSound }: GameProps) {
  const [cellId, setCellId] = useState(cells[0].id);
  const [bathId, setBathId] = useState<string | null>(null);
  const [slips, setSlips] = useState(0);
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const starMap = useGameStars("osmosis");
  const cell = cells.find((item) => item.id === cellId) ?? cells[0];
  const bath = baths.find((item) => item.id === bathId);
  const where = bath ? shift(cell.inside, bath.salt) : null;
  const next = cells.find((item) => item.id > cell.id);

  useEffect(() => {
    if (sound) say(dad(`第${cell.id}颗裸蛋，${cell.title}。${cell.story}`));
  }, [cell.id]);

  function load(id: number) {
    setCellId(id);
    setBathId(null);
    setSlips(0);
    setWonStars(0);
    setShowHint(false);
  }

  function choose(id: string) {
    if (wonStars > 0) return;
    setBathId(id);
    const picked = baths.find((item) => item.id === id)!;
    const result = shift(cell.inside, picked.salt);
    if (result === cell.want) {
      const raw = slips === 0 ? 3 : 2;
      const earned = showHint ? Math.min(raw, 2) : raw;
      setWonStars(earned);
      recordStars("osmosis", String(cell.id), earned);
      if (sound) {
        chime(true);
        say(dad(cell.win));
      }
    } else {
      setSlips((n) => n + 1);
      if (sound) chime(false);
    }
  }

  return (
    <div className="page">
      <TopBar
        emoji="🥚"
        title="裸蛋喝水 · 细胞膜渗透"
        onBack={exit}
        backLabel="生命科学馆"
        stars={sumStars(starMap)}
        maxStars={cells.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={cells.map((c) => ({ id: c.id, title: `${c.id}. ${c.title}`, stars: starMap[String(c.id)] ?? 0 }))}
        activeId={cell.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${cell.id} 关「${cell.title}」：${cell.story}`} />

      <div className="card">
        <div className="baths">
          {baths.map((item) => {
            const picked = bathId === item.id;
            const localShift = shift(cell.inside, item.salt);
            return (
              <button
                key={item.id}
                type="button"
                className={`bath${picked ? " is-picked" : ""}`}
                style={{ background: `linear-gradient(180deg, #ffffff 30%, ${item.tint})` }}
                onClick={() => choose(item.id)}
              >
                <span
                  className="cell-body"
                  style={{
                    transform: picked ? `scale(${SCALE[localShift]})` : undefined,
                    background: picked && localShift === "shrink" ? "#e99fb0" : "#f5c2cf"
                  }}
                />
                <strong>{item.name}</strong>
                <small>碗里盐浓度：{item.salt}%</small>
                <small style={{ color: "#8b7a5c" }}>蛋内浓度：{cell.inside}%</small>
              </button>
            );
          })}
        </div>

        {/* Semi-permeable membrane zoom diagram */}
        <svg
          viewBox="0 0 420 118"
          style={{ width: "100%", marginTop: 14, borderRadius: 16, background: "#fbfdff", border: "2px solid #e3edf9", display: "block" }}
          role="img"
          aria-label="半透膜水分子进出放大镜"
        >
          <rect x="0" y="0" width="206" height="118" fill="#eef7ff" />
          <rect x="214" y="0" width="206" height="118" fill="#fff5f7" />
          <line x1="210" y1="6" x2="210" y2="112" stroke="#ff9f43" strokeWidth="4" strokeDasharray="7 5" />
          <text x="103" y="22" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#3568a6">
            🥣 碗里的水 {bath ? `(${bath.name} · 盐 ${bath.salt}%)` : "(先选上面一碗水)"}
          </text>
          <text x="317" y="22" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#b34a66">
            🥚 裸蛋内部（盐 {cell.inside}%）
          </text>
          <text x="210" y="110" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#c25e00">
            半透膜（只放水过，拦住大盐粒）
          </text>

          {where === "swell" && (
            <g>
              <line x1="145" y1="62" x2="270" y2="62" stroke="#4d96ff" strokeWidth="5" strokeLinecap="round" />
              <polygon points="278,62 264,53 264,71" fill="#4d96ff" />
              <text x="210" y="48" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#225dac">
                💧 水分子涌进蛋里！
              </text>
            </g>
          )}
          {where === "shrink" && (
            <g>
              <line x1="275" y1="62" x2="150" y2="62" stroke="#e07f22" strokeWidth="5" strokeLinecap="round" />
              <polygon points="142,62 156,53 156,71" fill="#e07f22" />
              <text x="210" y="48" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#b85d14">
                💧 蛋里的水被浓盐水抽走！
              </text>
            </g>
          )}
          {where === "stay" && (
            <g>
              <text x="210" y="64" textAnchor="middle" fontSize="13" fontWeight="700" fill="#2f8a3c">
                ⇄ 内外一样咸，水进出打平！
              </text>
            </g>
          )}
          {!where && (
            <text x="210" y="64" textAnchor="middle" fontSize="12" fill="#8b7a5c">
              👆 点击上面任意一只碗，观察水分子怎么穿过薄膜
            </text>
          )}
        </svg>

        <div className="play-actions" style={{ marginTop: 12 }}>
          <button type="button" className="pill-btn" onClick={() => load(cell.id)}>
            🔄 重新放蛋
          </button>
          <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
            💡 渗透口诀
          </button>
        </div>
      </div>

      {where && wonStars === 0 && (
        <NianSays text={`放进「${bath?.name}」后，裸蛋${SHIFT_DESC[where].slice(2)}啦！这关要的是「${cell.title}」，换另一碗试试！`} />
      )}

      {showHint && (
        <HintBox text="记住四个字：「水往咸处走」！哪里盐更浓，水分子就穿过薄膜去哪里帮忙冲淡它。护士打点滴只用 0.9% 生理盐水，就是为了保护红细胞不鼓破也不干瘪！" />
      )}

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={`找对啦！在「${bath?.name}」里裸蛋${SHIFT_DESC[where!].slice(2)}！`}
          dadLine={cell.win}
          onRetry={() => load(cell.id)}
          onNext={next ? () => load(next.id) : exit}
          nextLabel={next ? `下一颗：${next.title} →` : "回生物馆 →"}
        />
      )}
    </div>
  );
}

export const osmosis = {
  meta: {
    id: "osmosis",
    category: "biology" as const,
    title: "裸蛋喝水",
    emoji: "🥚",
    blurb: "白醋泡掉硬壳露出半透膜！在清水、生理盐水和浓盐水里看细胞怎样吸水与失水。",
    tag: "细胞 · 渗透作用",
    maxStars: cells.length * 3
  },
  Play: OsmosisGame
};
