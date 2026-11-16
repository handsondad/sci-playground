import { useEffect, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import {
  evalCircuitDetails,
  GATE_META,
  gateLevels,
  TRUTH_INPUTS,
  truthTableMatches,
  type Bit,
  type GateType
} from "./logic.ts";

const ACCENT = "#14b8a6";

function wireStroke(val: Bit | null): string {
  if (val === 1) return "#4ade80";
  if (val === 0) return "#475569";
  return "#334155";
}

function GatesGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(gateLevels[0].id);
  const starMap = useGameStars("gates");
  const level = gateLevels.find((l) => l.id === levelId) ?? gateLevels[0];

  const [slots, setSlots] = useState<(GateType | null)[]>(() => level.slots.map(() => null));
  const [activeSlot, setActiveSlot] = useState(0);
  const [inA, setInA] = useState<Bit>(1);
  const [inB, setInB] = useState<Bit>(0);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wonStars, setWonStars] = useState(0);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const next = gateLevels.find((l) => l.id === id) ?? gateLevels[0];
    setLevelId(next.id);
    setSlots(next.slots.map(() => null));
    setActiveSlot(0);
    setInA(1);
    setInB(next.id === 1 ? 1 : 0);
    setTries(0);
    setShowHint(false);
    setWonStars(0);
  }

  function plugGate(gate: GateType) {
    if (wonStars > 0) return;
    const nextSlots = slots.map((prev, idx) => (idx === activeSlot ? gate : prev));
    setSlots(nextSlots);
    const nextEmpty = nextSlots.findIndex((g, idx) => idx > activeSlot && g === null);
    const anyEmpty = nextSlots.findIndex((g) => g === null);
    if (nextEmpty >= 0) setActiveSlot(nextEmpty);
    else if (anyEmpty >= 0) setActiveSlot(anyEmpty);
  }

  function clearSlots() {
    if (wonStars > 0) return;
    setSlots(level.slots.map(() => null));
    setActiveSlot(0);
  }

  const live = evalCircuitDetails(slots, inA, inB);
  const rowResults = TRUTH_INPUTS.map(([a, b], idx) => {
    const { out } = evalCircuitDetails(slots, a, b);
    const expected = level.expectedOutputs[idx];
    return { a, b, out, expected, ok: out === expected };
  });
  const matchedCount = rowResults.filter((r) => r.ok).length;
  const allMatched = truthTableMatches(slots, level.expectedOutputs);

  function verifyCircuit() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (allMatched) {
      let raw = nextTries <= 1 ? 3 : nextTries === 2 ? 2 : 1;
      if (showHint) raw = Math.min(raw, 2);
      setWonStars(raw);
      recordStars("gates", String(level.id), raw);
      if (sound) {
        chime(true);
        say(dad(level.win));
      }
    } else if (sound) {
      chime(false);
    }
  }

  const firstMismatch = rowResults.find((r) => !r.ok);
  const next = gateLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🔌"
        title="逻辑门机关 · 与或非布尔电路"
        onBack={exit}
        backLabel="计算逻辑馆"
        stars={sumStars(starMap)}
        maxStars={gateLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={gateLevels.map((l) => ({ id: l.id, title: l.title, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={level.story} />

      <div className="workbench">
        <div className="card" style={{ background: "#081220", borderColor: "#1e3a5f", color: "#e2e8f0" }}>
          <svg
            viewBox="0 0 380 264"
            style={{ width: "100%", display: "block", borderRadius: 12 }}
            role="img"
            aria-label={`${level.title}布尔电路蓝图，输入 A=${inA}，B=${inB}，输出=${live.out ?? "未接通"}`}
          >
            <rect x="0" y="0" width="380" height="264" rx="12" fill="#060d18" />
            <text x="12" y="20" fontSize="10.5" fill="#94a3b8" fontWeight="700">
              ⚡ 点左侧开关可切换测试电平（绿线=1 高电平，灰线=0 低电平）
            </text>

            {/* Topology Wires */}
            {level.topology === "single" && (
              <g fill="none" strokeLinecap="round">
                <path d="M 74 90 L 118 90 L 118 128 L 146 128" stroke={wireStroke(inA)} strokeWidth="4" />
                <path d="M 74 196 L 118 196 L 118 156 L 146 156" stroke={wireStroke(inB)} strokeWidth="4" />
                <path
                  d="M 218 142 L 306 142"
                  stroke={wireStroke(live.out)}
                  strokeWidth="4.5"
                  strokeDasharray={live.out === null ? "5 5" : undefined}
                />
              </g>
            )}

            {level.topology === "notB_then_combine" && (
              <g fill="none" strokeLinecap="round">
                <path d="M 74 90 L 182 90 L 182 128 L 202 128" stroke={wireStroke(inA)} strokeWidth="4" />
                <path d="M 74 196 L 96 196" stroke={wireStroke(inB)} strokeWidth="4" />
                <path
                  d="M 168 196 L 186 196 L 186 156 L 202 156"
                  stroke={wireStroke(live.wires[0] ?? null)}
                  strokeWidth="4"
                  strokeDasharray={live.wires[0] === null ? "5 5" : undefined}
                />
                <path
                  d="M 274 142 L 312 142"
                  stroke={wireStroke(live.out)}
                  strokeWidth="4.5"
                  strokeDasharray={live.out === null ? "5 5" : undefined}
                />
              </g>
            )}

            {level.topology === "xor_combo" && (
              <g fill="none" strokeLinecap="round">
                {/* Input A feeds Slot 0 top and Slot 1 top */}
                <path d="M 70 84 L 94 84" stroke={wireStroke(inA)} strokeWidth="3.6" />
                <path d="M 80 84 L 80 186 L 94 186" stroke={wireStroke(inA)} strokeWidth="3.6" />
                {/* Input B feeds Slot 0 bottom and Slot 1 bottom */}
                <path d="M 70 210 L 94 210" stroke={wireStroke(inB)} strokeWidth="3.6" />
                <path d="M 86 210 L 86 98 L 94 98" stroke={wireStroke(inB)} strokeWidth="3.6" />
                {/* Slot 0 -> Slot 3 */}
                <path
                  d="M 158 84 L 234 84 L 234 128 L 246 128"
                  stroke={wireStroke(live.wires[0] ?? null)}
                  strokeWidth="3.8"
                  strokeDasharray={live.wires[0] === null ? "4 4" : undefined}
                />
                {/* Slot 1 -> Slot 2 */}
                <path
                  d="M 158 198 L 176 198"
                  stroke={wireStroke(live.wires[1] ?? null)}
                  strokeWidth="3.8"
                  strokeDasharray={live.wires[1] === null ? "4 4" : undefined}
                />
                {/* Slot 2 -> Slot 3 */}
                <path
                  d="M 240 198 L 242 198 L 242 150 L 246 150"
                  stroke={wireStroke(live.wires[2] ?? null)}
                  strokeWidth="3.8"
                  strokeDasharray={live.wires[2] === null ? "4 4" : undefined}
                />
                {/* Slot 3 -> Output */}
                <path
                  d="M 310 138 L 324 138"
                  stroke={wireStroke(live.out)}
                  strokeWidth="4.2"
                  strokeDasharray={live.out === null ? "4 4" : undefined}
                />
              </g>
            )}

            {/* Input Switch A */}
            <g style={{ cursor: "pointer" }} onClick={() => setInA((v) => (v === 1 ? 0 : 1))}>
              <rect
                x="12"
                y="66"
                width="60"
                height="46"
                rx="10"
                fill={inA === 1 ? "#14532d" : "#1e293b"}
                stroke={inA === 1 ? "#4ade80" : "#64748b"}
                strokeWidth="2"
              />
              <text x="42" y="84" textAnchor="middle" fontSize="8.5" fill="#cbd5e1" fontWeight="700">
                {level.inputALabel}
              </text>
              <text x="42" y="103" textAnchor="middle" fontSize="15" fontWeight="800" fill={inA === 1 ? "#86efac" : "#94a3b8"}>
                A = {inA}
              </text>
            </g>

            {/* Input Switch B */}
            <g style={{ cursor: "pointer" }} onClick={() => setInB((v) => (v === 1 ? 0 : 1))}>
              <rect
                x="12"
                y="174"
                width="60"
                height="46"
                rx="10"
                fill={inB === 1 ? "#14532d" : "#1e293b"}
                stroke={inB === 1 ? "#4ade80" : "#64748b"}
                strokeWidth="2"
              />
              <text x="42" y="192" textAnchor="middle" fontSize="8.5" fill="#cbd5e1" fontWeight="700">
                {level.inputBLabel}
              </text>
              <text x="42" y="211" textAnchor="middle" fontSize="15" fontWeight="800" fill={inB === 1 ? "#86efac" : "#94a3b8"}>
                B = {inB}
              </text>
            </g>

            {/* Gate Slots */}
            {level.slots.map((slot, idx) => {
              const g = slots[idx];
              const meta = g ? GATE_META[g] : null;
              const selected = activeSlot === idx;
              const w = level.topology === "xor_combo" ? 64 : 72;
              const h = level.topology === "xor_combo" ? 42 : 48;
              return (
                <g
                  key={slot.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setActiveSlot(idx)}
                >
                  <rect
                    x={slot.x - w / 2}
                    y={slot.y - h / 2}
                    width={w}
                    height={h}
                    rx="11"
                    fill={meta ? "rgba(15, 23, 42, 0.96)" : "rgba(30, 41, 59, 0.65)"}
                    stroke={selected ? "#2dd4bf" : meta ? meta.color : "#64748b"}
                    strokeWidth={selected ? "3" : "2"}
                    strokeDasharray={meta ? undefined : "4 3"}
                  />
                  <text
                    x={slot.x}
                    y={slot.y - h / 2 - 5}
                    textAnchor="middle"
                    fontSize="8.5"
                    fill={selected ? "#5eead4" : "#94a3b8"}
                    fontWeight="700"
                  >
                    {slot.label}
                  </text>
                  <text
                    x={slot.x}
                    y={slot.y + 4}
                    textAnchor="middle"
                    fontSize="11.5"
                    fontWeight="800"
                    fill={meta ? meta.color : "#cbd5e1"}
                  >
                    {meta ? meta.short : "点下方插装"}
                  </text>
                </g>
              );
            })}

            {/* Output Lamp */}
            <g>
              <circle
                cx="342"
                cy={level.topology === "xor_combo" ? 138 : 142}
                r="24"
                fill={live.out === 1 ? "rgba(74, 222, 128, 0.25)" : "rgba(51, 65, 85, 0.35)"}
                stroke={live.out === 1 ? "#4ade80" : "#475569"}
                strokeWidth="2.5"
              />
              <text
                x="342"
                y={(level.topology === "xor_combo" ? 138 : 142) + 5}
                textAnchor="middle"
                fontSize="15"
                fontWeight="800"
                fill={live.out === 1 ? "#86efac" : "#94a3b8"}
              >
                {live.out === null ? "?" : live.out}
              </text>
              <text
                x="342"
                y={(level.topology === "xor_combo" ? 138 : 142) + 40}
                textAnchor="middle"
                fontSize="9"
                fill="#cbd5e1"
                fontWeight="700"
              >
                {level.outputLabel}
              </text>
            </g>
          </svg>

          {/* Gate Palette */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 700 }}>
              🧰 芯片工具箱（装入当前选中的【{level.slots[activeSlot]?.label}】）：
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${level.palette.length}, minmax(0, 1fr))`,
                gap: 8
              }}
            >
              {level.palette.map((gate) => {
                const meta = GATE_META[gate];
                const isCurrent = slots[activeSlot] === gate;
                return (
                  <button
                    key={gate}
                    type="button"
                    onClick={() => plugGate(gate)}
                    aria-pressed={isCurrent}
                    style={{
                      padding: "8px 6px",
                      borderRadius: 12,
                      border: `2px solid ${isCurrent ? meta.color : "#334155"}`,
                      background: isCurrent ? "rgba(20, 184, 166, 0.18)" : "#0f172a",
                      color: "#f8fafc",
                      textAlign: "center"
                    }}
                  >
                    <strong style={{ display: "block", fontSize: 13, color: meta.color }}>{meta.name}</strong>
                    <small style={{ fontSize: 11, color: "#cbd5e1" }}>{meta.rule}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="workbench-side">
          <div className="card">
            <div className="readout-grid">
              <div className="readout-box">
                <small>真值表匹配进度</small>
                <strong style={{ color: allMatched ? "#16a34a" : "#0d9488" }}>{matchedCount} / 4 行吻合</strong>
              </div>
              <div className="readout-box">
                <small>当前测试输入</small>
                <strong>
                  ({inA}, {inB}) → {live.out === null ? "待装芯片" : live.out}
                </strong>
              </div>
            </div>

            {/* Interactive Truth Table */}
            <div style={{ marginTop: 12 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                  textAlign: "center"
                }}
                aria-label="四行布尔真值表"
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid #ffe0cc", color: "var(--text-secondary)" }}>
                    <th style={{ padding: "5px 4px" }}>A</th>
                    <th style={{ padding: "5px 4px" }}>B</th>
                    <th style={{ padding: "5px 4px" }}>你的输出</th>
                    <th style={{ padding: "5px 4px" }}>🎯 目标</th>
                    <th style={{ padding: "5px 4px" }}>判定</th>
                  </tr>
                </thead>
                <tbody>
                  {rowResults.map((row) => {
                    const activeRowTest = row.a === inA && row.b === inB;
                    return (
                      <tr
                        key={`${row.a}-${row.b}`}
                        onClick={() => {
                          setInA(row.a);
                          setInB(row.b);
                        }}
                        style={{
                          cursor: "pointer",
                          background: activeRowTest ? "#fff7ed" : "transparent",
                          borderBottom: "1px solid #f3e8dd",
                          fontWeight: 700
                        }}
                      >
                        <td style={{ padding: "6px 4px" }}>{row.a}</td>
                        <td style={{ padding: "6px 4px" }}>{row.b}</td>
                        <td style={{ padding: "6px 4px", color: row.out === 1 ? "#16a34a" : "#64748b" }}>
                          {row.out === null ? "—" : row.out}
                        </td>
                        <td style={{ padding: "6px 4px" }}>{row.expected}</td>
                        <td style={{ padding: "6px 4px" }}>{row.out === null ? "⏳" : row.ok ? "✅" : "❌"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="play-actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary-btn" onClick={verifyCircuit}>
                🔌 通电验收真值表！
              </button>
              <button type="button" className="pill-btn" onClick={clearSlots}>
                🧹 拔下重装
              </button>
              <button type="button" className="pill-btn" onClick={() => setShowHint(true)} disabled={showHint}>
                💡 逻辑提示
              </button>
            </div>
          </div>

          {tries > 0 && wonStars === 0 && (
            <DadSays
              text={
                slots.some((g) => g === null)
                  ? "蓝图上还有空的门槽没插上芯片呢！点选门槽后再点下方芯片装进去试试。"
                  : firstMismatch
                    ? `当输入 A=${firstMismatch.a}、B=${firstMismatch.b} 时，你的电路输出了 ${firstMismatch.out}，但生活场景需要输出 ${firstMismatch.expected} 哦！点真值表这一行看看信号怎么走的！`
                    : "再检查一下每行真值表！"
              }
            />
          )}

          {showHint && <HintBox text={level.hint} />}

          {wonStars > 0 && (
            <WinCard
              stars={wonStars}
              verdict={`4 组电平全部通过，${level.outputLabel}完美运转！`}
              dadLine={level.win}
              note={`通关门芯片：${slots.join(" → ")}`}
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

export const gates: GameModule = {
  meta: {
    id: "gates",
    title: "逻辑门机关",
    category: "computing",
    emoji: "🔌",
    tag: "与或非 · 布尔电路",
    blurb: "在电路蓝图上插装与门、或门、非门与异或门，点亮真值表全部四种电平组合。",
    maxStars: 12
  },
  Play: GatesGame
};
