import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { checkFlameAnswer, findIon, flameLevels, METAL_IONS, type IonId } from "./logic.ts";

const ACCENT = "#a66cff";

function FlameGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(flameLevels[0].id);
  const starMap = useGameStars("flame");
  const level = flameLevels.find((l) => l.id === levelId) ?? flameLevels[0];

  const [burning, setBurning] = useState<"base" | "mystery" | IonId>(level.mode === "mystery" ? "mystery" : "base");
  const [picked, setPicked] = useState<IonId[]>([]);
  const [tries, setTries] = useState(0);
  const [launched, setLaunched] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = flameLevels.find((l) => l.id === id) ?? flameLevels[0];
    setLevelId(next.id);
    setBurning(next.mode === "mystery" ? "mystery" : "base");
    setPicked([]);
    setTries(0);
    setLaunched(false);
    setShowHint(false);
    setWonStars(0);
  }

  const activeIon =
    burning === "base"
      ? null
      : burning === "mystery"
        ? findIon(level.targetIons[0])
        : findIon(burning);

  function togglePick(id: IonId) {
    setBurning(id);
    setLaunched(false);
    if (level.targetIons.length === 1) {
      setPicked([id]);
    } else {
      if (picked.includes(id)) {
        setPicked(picked.filter((x) => x !== id));
      } else {
        setPicked([...picked.slice(-(level.targetIons.length - 1)), id]);
      }
    }
  }

  function submitAnswer() {
    const nextTries = tries + 1;
    setTries(nextTries);
    const ok = checkFlameAnswer(picked, level.targetIons);
    if (ok) {
      if (level.mode === "firework") setLaunched(true);
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("flame", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const next = flameLevels.find((l) => l.id > level.id);
  const specX = activeIon ? 30 + ((activeIon.wavelengthNm - 380) / (700 - 380)) * 320 : null;

  return (
    <div className="page">
      <TopBar
        emoji="🎆"
        title="焰色烟花秀 · 金属焰色反应"
        onBack={exit}
        backLabel="化学馆"
        stars={sumStars(starMap)}
        maxStars={flameLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={flameLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#0f172a", borderColor: "#334155" }}>
          <svg
            viewBox="0 0 380 276"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label="本生灯焰色实验台"
          >
            <defs>
              <linearGradient id="spectrumGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="22%" stopColor="#3b82f6" />
                <stop offset="44%" stopColor="#10b981" />
                <stop offset="64%" stopColor="#eab308" />
                <stop offset="82%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="380" height="276" rx="12" fill="#090d18" />

            {/* Firework celebration burst on level 4 */}
            {launched && (
              <g>
                {Array.from({ length: 12 }, (_, i) => {
                  const rad = (i * 30 * Math.PI) / 180;
                  const ionA = findIon(level.targetIons[0]);
                  const ionB = findIon(level.targetIons[1] ?? level.targetIons[0]);
                  return (
                    <g key={i}>
                      <line
                        x1="190"
                        y1="96"
                        x2={190 + Math.cos(rad) * 74}
                        y2={96 + Math.sin(rad) * 74}
                        stroke={ionA.outerHex}
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <circle
                        cx={190 + Math.cos(rad) * 76}
                        cy={96 + Math.sin(rad) * 76}
                        r="4.5"
                        fill={ionA.innerHex}
                      />
                      <circle
                        cx={190 + Math.cos(rad + 0.26) * 42}
                        cy={96 + Math.sin(rad + 0.26) * 42}
                        r="4"
                        fill={ionB.outerHex}
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* Outer glow */}
            <circle
              cx="190"
              cy="118"
              r="58"
              fill={activeIon ? activeIon.outerHex : "#38bdf8"}
              opacity="0.22"
            />

            {/* Outer Flame */}
            <path
              d="M 190 42 C 224 88, 228 138, 190 162 C 152 138, 156 88, 190 42 Z"
              fill={activeIon ? activeIon.outerHex : "rgba(56, 189, 248, 0.55)"}
            />
            {/* Inner Flame Cone */}
            <path
              d="M 190 86 C 206 114, 208 142, 190 158 C 172 142, 174 114, 190 86 Z"
              fill={activeIon ? activeIon.innerHex : "#bae6fd"}
            />

            {/* Platinum Wire Rod dipping into flame */}
            {burning !== "base" && (
              <g>
                <line x1="295" y1="92" x2="194" y2="124" stroke="#cbd5e1" strokeWidth="2.5" />
                <circle cx="192" cy="125" r="4" fill="#f8fafc" />
                <rect x="292" y="84" width="54" height="12" rx="5" fill="#64748b" transform="rotate(-17 295 92)" />
              </g>
            )}

            {/* Bunsen Burner Chimney & Base */}
            <rect x="179" y="160" width="22" height="52" rx="3" fill="#94a3b8" />
            <rect x="152" y="210" width="76" height="12" rx="6" fill="#475569" />

            {/* Flame label */}
            <text x="16" y="28" fill="#e2e8f0" fontSize="12" fontWeight="800">
              {burning === "base"
                ? "🔥 本生灯纯底火（淡蓝）"
                : burning === "mystery"
                  ? `❓ 正在灼烧：未知盲样（${activeIon?.wavelengthNm} nm）`
                  : `🧪 正在试烧：${activeIon?.salt}（${activeIon?.colorName}）`}
            </text>

            {/* Spectroscope Wavelength Bar */}
            <g transform="translate(0, 234)">
              <rect x="30" y="6" width="320" height="10" rx="5" fill="url(#spectrumGrad)" opacity="0.85" />
              <text x="30" y="30" fill="#94a3b8" fontSize="10">400nm 紫</text>
              <text x="172" y="30" fill="#94a3b8" fontSize="10">550nm 绿</text>
              <text x="314" y="30" fill="#94a3b8" fontSize="10">700nm 红</text>
              {specX !== null && activeIon && (
                <g>
                  <line x1={specX} y1="1" x2={specX} y2="21" stroke="#ffffff" strokeWidth="3" />
                  <text x={Math.max(52, Math.min(328, specX))} y="-2" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">
                    {activeIon.wavelengthNm}nm
                  </text>
                </g>
              )}
            </g>
          </svg>
        </div>

        <div className="workbench-side">
          <div className="card">
            {level.mode === "mystery" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  className="pill-btn"
                  style={{
                    borderColor: burning === "mystery" ? ACCENT : undefined,
                    background: burning === "mystery" ? "#f3e8ff" : "#fff",
                    fontWeight: 800
                  }}
                  onClick={() => setBurning("mystery")}
                >
                  ❓ 烧未知盲样
                </button>
                <button
                  type="button"
                  className="pill-btn"
                  onClick={() => setBurning("base")}
                >
                  🔥 清空铂丝看底火
                </button>
              </div>
            )}

            <p style={{ margin: "0 0 8px", fontWeight: 800, fontSize: "0.95rem" }}>
              {level.mode === "mystery"
                ? "🧪 点金属盐试烧，并选出与盲样一致的离子："
                : "🎆 任选 2 瓶金属盐装入双色烟花筒："}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {METAL_IONS.map((ion) => {
                const isPicked = picked.includes(ion.id);
                return (
                  <button
                    key={ion.id}
                    type="button"
                    className="pill-btn"
                    style={{
                      borderColor: isPicked ? ion.outerHex : "#e2e8f0",
                      borderWidth: isPicked ? 3 : 2,
                      background: isPicked ? `color-mix(in srgb, ${ion.outerHex} 14%, #fff)` : "#fff",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2
                    }}
                    onClick={() => togglePick(ion.id)}
                  >
                    <strong style={{ fontSize: "0.92rem", color: "#1e293b" }}>
                      {ion.symbol} · {ion.name} {isPicked ? "✓" : ""}
                    </strong>
                    <small style={{ color: "#64748b", fontSize: "0.76rem" }}>{ion.salt}</small>
                  </button>
                );
              })}
            </div>

            {burning !== "base" && burning !== "mystery" && activeIon && (
              <p style={{ margin: "10px 0 0", fontSize: "0.83rem", color: "#475569", background: "#f8fafc", padding: "8px 10px", borderRadius: 10 }}>
                💡 <b>{activeIon.name}</b>：{activeIon.lifeUse}
              </p>
            )}

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="primary-btn"
                disabled={picked.length !== level.targetIons.length}
                onClick={submitAnswer}
              >
                {level.mode === "mystery" ? "✅ 提交鉴定结果" : "🚀 点火发射双色烟花！"}
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 光谱提示
              </button>
            </div>
          </div>

          {tries > 0 && wonStars === 0 && (
            <DadSays text="颜色好像还差一点点！再点『烧未知盲样』记住它的焰色和波长刻度，跟试剂架上一一比对吧。" />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={level.mode === "mystery" ? `精准锁定 ${findIon(level.targetIons[0]).name}！` : "双色烟花惊艳绽放！"}
              dadLine={level.win}
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

export const flame: GameModule = {
  meta: {
    id: "flame",
    title: "焰色烟花秀",
    category: "chemistry",
    emoji: "🎆",
    tag: "金属焰色反应",
    blurb: "用铂丝蘸取锂、钠、钾、钙、钡、铜盐送入本生灯，看电子跃迁烧出漫天绚丽烟花。",
    maxStars: flameLevels.length * 3
  },
  Play: FlameGame
};
