import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, NianSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import { isChronological, strataLevels, swapAt, type StratumItem } from "./logic.ts";

const ACCENT = "#0ea5e9";

const LEFT_CANYON_REFS = [
  { id: "ammonite", label: "菊石页岩", emoji: "🐚", color: "#0284c7" },
  { id: "wood", label: "硅化木层", emoji: "🪵", color: "#64748b" },
  { id: "stego", label: "剑龙砂岩", emoji: "🦕", color: "#ea580c" },
  { id: "saber", label: "剑齿虎层", emoji: "🐯", color: "#ca8a04" }
];

function StrataGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(strataLevels[0].id);
  const starMap = useGameStars("strata");
  const level = strataLevels.find((l) => l.id === levelId) ?? strataLevels[0];

  // `order` is always stored from earliest/bottom (index 0) to latest/top (last index)
  const [order, setOrder] = useState<string[]>([...level.startOrder]);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) {
      say(dad(`第${level.id}关，${level.title}。${level.story}`), nian(level.nianLine));
    }
  }, [level.id]);

  function load(id: number) {
    const next = strataLevels.find((l) => l.id === id) ?? strataLevels[0];
    setLevelId(next.id);
    setOrder([...next.startOrder]);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  const itemById = (id: string): StratumItem =>
    level.items.find((it) => it.id === id) ?? level.items[0];

  const matchedCount = order.reduce(
    (acc, id, idx) => acc + (id === level.expected[idx] ? 1 : 0),
    0
  );
  const allRight = isChronological(order, level.expected);

  function verifyStrata() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (allRight) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("strata", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
      say(
        dad(
          `目前有 ${matchedCount} 个位置对上了（共 ${level.expected.length} 个），记住越古老的越在底下、被切穿的岩层比岩脉更老哦！`
        )
      );
    }
  }

  const next = strataLevels.find((l) => l.id > level.id);

  // Render list from TOP (latest, index = length - 1) down to BOTTOM (earliest, index = 0)
  // so it visually matches the rock column from top to bottom!
  const topDownIndices = order.map((_, idx) => order.length - 1 - idx);

  return (
    <div className="page">
      <TopBar
        emoji="🦕"
        title="地层寻化石 · 叠覆律与沧海桑田"
        onBack={exit}
        backLabel="地球地理馆"
        stars={sumStars(starMap)}
        maxStars={strataLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={strataLevels.map((l) => ({
          id: l.id,
          title: l.title,
          stars: starMap[String(l.id)] ?? 0
        }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />
      <NianSays text={level.nianLine} />

      <div className="workbench">
        <div className="card" style={{ background: "#1c1917", borderColor: "#57534e" }}>
          <svg
            viewBox="0 0 400 296"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`地质崖壁剖面图：${level.title}`}
          >
            <rect x="0" y="0" width="400" height="296" rx="12" fill="#0f172a" />

            {/* Mode 1 & 2: Stacked Cliff Outcrop Column */}
            {(level.mode === "stack" || level.mode === "paleoenv") && (
              <g>
                <text x="16" y="24" fontSize="10.5" fontWeight="700" fill="#e2e8f0">
                  ⛏️ 地质钻探柱状剖面（顶层最新 ↑ · 底层最老 ↓）
                </text>
                {/* Grass & Peak top */}
                <polygon
                  points="56,52 110,34 185,48 265,36 344,52"
                  fill={level.mode === "paleoenv" ? "#e2e8f0" : "#22c55e"}
                />
                {topDownIndices.map((arrIdx, visualRow) => {
                  const item = itemById(order[arrIdx]);
                  const layerH = Math.floor(212 / order.length);
                  const y = 52 + visualRow * layerH;
                  const rightSlot = order[arrIdx] === level.expected[arrIdx];
                  return (
                    <g key={item.id}>
                      <rect
                        x="56"
                        y={y}
                        width="288"
                        height={layerH - 3}
                        rx="6"
                        fill={item.color}
                        stroke={tries > 0 && rightSlot ? "#4ade80" : "rgba(255,255,255,0.28)"}
                        strokeWidth="2"
                      />
                      <line
                        x1="68"
                        y1={y + layerH / 2}
                        x2="332"
                        y2={y + layerH / 2}
                        stroke="rgba(255,255,255,0.18)"
                        strokeDasharray="6 4"
                      />
                      <text x="74" y={y + layerH / 2 + 5} fontSize="18">
                        {item.fossilEmoji}
                      </text>
                      <text
                        x="104"
                        y={y + layerH / 2 - 2}
                        fontSize="11"
                        fontWeight="800"
                        fill="#ffffff"
                      >
                        {item.name}
                      </text>
                      <text x="104" y={y + layerH / 2 + 13} fontSize="9" fill="#f1f5f9">
                        {item.era} · {item.envTag}
                      </text>
                      <text
                        x="300"
                        y={y + layerH / 2 + 4}
                        fontSize="9.5"
                        fontWeight="800"
                        fill="#fef08a"
                      >
                        #{arrIdx + 1}
                      </text>
                    </g>
                  );
                })}
                <text x="132" y="284" fontSize="9.5" fill="#94a3b8">
                  ⬇️ 越往深处基岩越古老（第 1 层最早沉积）
                </text>
              </g>
            )}

            {/* Mode 3: Cross-cutting Magma Dike Outcrop */}
            {level.mode === "crosscut" && (
              <g>
                <text x="14" y="22" fontSize="10.5" fontWeight="700" fill="#fde68a">
                  🔍 露头现场证据：注意看暗红火山岩脉切穿了哪几层！
                </text>

                {/* Bottom 3 horizontal strata pierced by dike */}
                <rect x="34" y="206" width="332" height="50" rx="4" fill="#38bdf8" />
                <text x="48" y="236" fontSize="11" fontWeight="800" fill="#fff">
                  🦐 三叶虫灰岩（5亿年）
                </text>

                <rect x="34" y="154" width="332" height="50" rx="4" fill="#475569" />
                <text x="48" y="184" fontSize="11" fontWeight="800" fill="#fff">
                  🌿 蕨类黑煤层（3亿年）
                </text>

                <rect x="34" y="102" width="332" height="50" rx="4" fill="#f97316" />
                <text x="48" y="132" fontSize="11" fontWeight="800" fill="#fff">
                  🦖 恐龙红砂岩（7000万年）
                </text>

                {/* Cross-cutting Volcanic Basalt Dike piercing bottom 3 layers, stopping at y=102! */}
                <polygon
                  points="232,262 268,262 298,102 264,102"
                  fill="#dc2626"
                  stroke="#fef08a"
                  strokeWidth="2"
                />
                <text
                  x="252"
                  y="192"
                  fontSize="10"
                  fontWeight="800"
                  fill="#fef08a"
                  transform="rotate(-72 268 192)"
                >
                  🌋 火山岩脉侵入
                </text>

                {/* Unconformity wavy erosion line at y=102 */}
                <line
                  x1="34"
                  y1="101"
                  x2="366"
                  y2="101"
                  stroke="#f8fafc"
                  strokeWidth="2.4"
                  strokeDasharray="5 3"
                />

                {/* Top uncut Mammoth gravel layer sealing the dike */}
                <rect x="34" y="46" width="332" height="53" rx="4" fill="#eab308" />
                <text x="48" y="77" fontSize="11" fontWeight="800" fill="#1e293b">
                  🦣 猛犸象冰期砾石层（平铺盖住岩脉顶口，未被切穿！）
                </text>

                <text x="48" y="282" fontSize="9.5" fill="#cbd5e1">
                  提示：先有前三层 → 才有岩脉刺穿它们 → 最后铺上顶层猛犸象砾石！
                </text>
              </g>
            )}

            {/* Mode 4: Cross-Canyon Biostratigraphic Correlation */}
            {level.mode === "correlate" && (
              <g>
                <text x="14" y="22" fontSize="10.5" fontWeight="700" fill="#bae6fd">
                  🏞️ 大峡谷两岸岩层标准化石连线对比
                </text>

                {/* Canyon river at bottom center */}
                <polygon points="156,52 244,52 222,268 178,268" fill="#082f49" />
                <ellipse cx="200" cy="264" rx="24" ry="8" fill="#0ea5e9" />
                <text x="182" y="284" fontSize="9" fill="#7dd3fc" fontWeight="700">
                  🌊 峡谷河道
                </text>

                {/* Left Bank fixed reference strata (bottom index 0 -> top index 3) */}
                {LEFT_CANYON_REFS.map((ref, idx) => {
                  const visualRow = 3 - idx;
                  const y = 56 + visualRow * 50;
                  const rightItem = itemById(order[idx]);
                  const rightY = 66 + visualRow * 50;
                  const matched = rightItem.id === ref.id;
                  return (
                    <g key={ref.id}>
                      {/* Left cliff block */}
                      <rect x="18" y={y} width="142" height="44" rx="5" fill={ref.color} />
                      <text x="26" y={y + 27} fontSize="10.5" fontWeight="800" fill="#fff">
                        {ref.emoji} 左岸：{ref.label}
                      </text>

                      {/* Right cliff block (tilted slightly lower +10px for realism) */}
                      <rect
                        x="240"
                        y={rightY}
                        width="142"
                        height="44"
                        rx="5"
                        fill={rightItem.color}
                      />
                      <text x="248" y={rightY + 27} fontSize="10" fontWeight="800" fill="#fff">
                        {rightItem.fossilEmoji} {rightItem.name.replace("右岸 · ", "")}
                      </text>

                      {/* Correlation line across canyon */}
                      <line
                        x1="160"
                        y1={y + 22}
                        x2="240"
                        y2={rightY + 22}
                        stroke={matched ? "#4ade80" : "#fbbf24"}
                        strokeWidth={matched ? 2.8 : 1.8}
                        strokeDasharray={matched ? "none" : "4 3"}
                      />
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>排列任务</small>
                <strong style={{ fontSize: "0.92rem", color: "#0369a1" }}>
                  {level.orderPrompt}
                </strong>
              </div>
              <div className="readout-box">
                <small>已对准层位</small>
                <strong style={{ color: allRight ? "#16a34a" : "#d97706" }}>
                  {matchedCount} / {level.expected.length}
                </strong>
              </div>
            </div>

            {/* Interactive Up/Down Stack Sorter (Top = Latest/Uppermost, Bottom = Earliest/Oldest) */}
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {topDownIndices.map((arrIdx) => {
                const item = itemById(order[arrIdx]);
                const isTop = arrIdx === order.length - 1;
                const isBottom = arrIdx === 0;
                const slotTag = isTop
                  ? `第 ${arrIdx + 1} 位（顶层/最晚）`
                  : isBottom
                    ? "第 1 位（底层/最早）"
                    : `第 ${arrIdx + 1} 位`;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 14,
                      background: "#f8fafc",
                      border: `2px solid ${item.color}`
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <small style={{ display: "block", fontSize: "0.74rem", color: "#64748b" }}>
                        {slotTag}
                      </small>
                      <strong style={{ fontSize: "0.96rem" }}>
                        {item.fossilEmoji} {item.name}
                      </strong>
                    </div>

                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="pill-btn"
                        style={{ padding: "4px 10px" }}
                        disabled={isTop}
                        aria-label={`${item.name}往新一层上移`}
                        onClick={() => setOrder((prev) => swapAt(prev, arrIdx, arrIdx + 1))}
                      >
                        ⬆️
                      </button>
                      <button
                        type="button"
                        className="pill-btn"
                        style={{ padding: "4px 10px" }}
                        disabled={isBottom}
                        aria-label={`${item.name}往老一层下移`}
                        onClick={() => setOrder((prev) => swapAt(prev, arrIdx, arrIdx - 1))}
                      >
                        ⬇️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn is-blue" onClick={verifyStrata}>
                🦕 鉴定地质年代！
              </button>
              <button
                type="button"
                className="pill-btn"
                onClick={() => setShowHint(true)}
                disabled={showHint}
              >
                💡 地层法则
              </button>
            </div>
          </div>

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict="地层与古生物时序完全吻合！"
              dadLine={level.win}
              note="地质三大法宝：叠覆律（下老上新）、切割律（切穿者更新）、化石层序律（同种标准化石同时代）！"
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

export const strata: GameModule = {
  meta: {
    id: "strata",
    title: "地层寻化石",
    category: "earth",
    emoji: "🦕",
    tag: "叠覆律 · 沧海桑田",
    blurb: "从三叶虫、树蕨煤层、霸王龙到火山侵入岩脉，破译岩石崖壁里的地球亿万年日记。",
    maxStars: strataLevels.length * 3
  },
  Play: StrataGame
};
