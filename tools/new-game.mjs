#!/usr/bin/env node
/**
 * 科学小游戏大冒险 · 新实验脚手架工具（给 AI Agent 与开发者）
 *
 * 用法：
 *   npm run game:new                                         # 查看所有可用展馆与示例
 *   npm run game:new -- <hall> <id> "<中文标题>" [emoji]      # 预览生成的模板与挂载片段（默认 dry-run）
 *   npm run game:new -- <hall> <id> "<中文标题>" [emoji] --write
 *       # 直接创建 src/games/<hall>/<id>/{logic.ts,index.tsx} 并自动注册进 src/catalog/games.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { categories } from "../src/catalog/categories.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function toExportIdent(id) {
  const camel = id.replace(/-([a-z0-9])/g, (_, ch) => ch.toUpperCase());
  return `${camel}Game`;
}

function printHelp() {
  console.log("🔬 科学小游戏脚手架 (tools/new-game.mjs)\n");
  console.log("用法：");
  console.log('  npm run game:new -- <hall> <id> "<中文标题>" [emoji] [--write]\n');
  console.log("可选的 9 大展馆 (<hall>)：");
  for (const c of categories) {
    console.log(`  • ${c.id.padEnd(13)} ${c.emoji} ${c.title} —— ${c.blurb}`);
  }
  console.log("\n示例：");
  console.log('  npm run game:new -- physics doppler "多普勒救护车" "🚑"          # 仅预览，不改磁盘');
  console.log('  npm run game:new -- physics doppler "多普勒救护车" "🚑" --write  # 写入模板并注册到 games.ts');
}

function renderLogicTemplate(title) {
  return `/**
 * 「${title}」纯科学逻辑层（不依赖 React 或 DOM，可直接被 tests/*.test.mjs 单测）
 *
 * TODO(agent): 把下面的占位线性模型替换成真实的物理 / 数学 / 化学 / 工程公式！
 */
export type StageSpec = {
  id: number;
  title: string;
  emoji: string;
  prompt: string;
  dadTip: string;
  cheer: string;
  explain: string;
  startValue: number;
  targetMin: number;
  targetMax: number;
};

export const STAGES: readonly StageSpec[] = [
  {
    id: 1,
    title: "初探规律",
    emoji: "🔍",
    prompt: "拖动滑块改变参数，观察实验台变化并让读数落入绿色目标区间。",
    dadTip: "先往左拉到底、再往右拉到底，看看画面里的量是怎么跟着变的！",
    cheer: "耶！一眼就抓住了变化方向！",
    explain: "TODO(agent): 用生活比喻写清第 1 关背后的核心科学原理。",
    startValue: 20,
    targetMin: 48,
    targetMax: 56
  },
  {
    id: 2,
    title: "反向推理",
    emoji: "🎯",
    prompt: "这次目标变高啦，试着一步算准参数位置！",
    dadTip: "观察数值翻倍时，结果是跟着翻倍还是按平方增长？",
    cheer: "太准啦！不用瞎试也能算出来！",
    explain: "TODO(agent): 补充第 2 关定量关系或临界点解释。",
    startValue: 25,
    targetMin: 72,
    targetMax: 80
  },
  {
    id: 3,
    title: "极限挑战",
    emoji: "🚀",
    prompt: "在更苛刻的误差范围内完成精密调校！",
    dadTip: "用滑块两边的 − / + 微调按钮可以一格一格精确瞄准。",
    cheer: "完美命中靶心，小小工程师出师啦！",
    explain: "TODO(agent): 联系真实世界的工程或自然现象收尾。",
    startValue: 60,
    targetMin: 30,
    targetMax: 36
  }
];

/** 计算当前实验状态（纯函数，方便单元测试直接断言）。 */
export function simulateOutput(input: number): number {
  const clamped = Math.max(0, Math.min(100, input));
  return Math.round(clamped * 10) / 10;
}

/** 判断是否达成当前关卡目标。务必保证 checkStageGoal(stage, stage.startValue) === false！ */
export function checkStageGoal(stage: StageSpec, input: number): boolean {
  const out = simulateOutput(input);
  return out >= stage.targetMin && out <= stage.targetMax;
}

/** 计星规则：没看提示且 3 次以内调准得 3 星；看过提示封顶 2 星；过关保底 1 星。 */
export function calcStageStars(attempts: number, usedHint: boolean): 1 | 2 | 3 {
  const raw: 1 | 2 | 3 = attempts <= 1 ? 3 : attempts <= 3 ? 2 : 1;
  return usedHint ? (Math.min(raw, 2) as 1 | 2) : raw;
}
`;
}

function renderIndexTemplate({ id, category, hallTitle, hallColor, title, emoji, exportIdent }) {
  return `import { useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { chime } from "../../../kit/audio.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { dad, nian, say } from "../../../kit/speech.ts";
import { STAGES, calcStageStars, checkStageGoal, simulateOutput } from "./logic.ts";

function Workbench({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  const starMap = useGameStars("${id}");
  const [stageIdx, setStageIdx] = useState(0);
  const stage = STAGES[stageIdx];

  const [value, setValue] = useState<number>(stage.startValue);
  const [attempts, setAttempts] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [wonStars, setWonStars] = useState<number | null>(null);

  const output = simulateOutput(value);
  const inZone = checkStageGoal(stage, value);
  const targetMid = (stage.targetMin + stage.targetMax) / 2;
  const closeness = Math.max(0, 100 - Math.abs(output - targetMid) * 2);

  function selectStage(idNum: number) {
    const idx = STAGES.findIndex((s) => s.id === idNum);
    if (idx < 0) return;
    const next = STAGES[idx];
    setStageIdx(idx);
    setValue(next.startValue);
    setAttempts(0);
    setUsedHint(false);
    setWonStars(null);
  }

  function handleVerify() {
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (checkStageGoal(stage, value)) {
      const earned = calcStageStars(nextAttempts, usedHint);
      recordStars("${id}", stage.id, earned);
      setWonStars(earned);
      if (settings.sound) {
        chime(true);
        say(nian(stage.cheer), dad(stage.explain));
      }
    } else if (settings.sound) {
      chime(false);
      say(dad(stage.dadTip));
    }
  }

  return (
    <>
      <TopBar
        emoji="${emoji}"
        title="${title}"
        onBack={exit}
        backLabel="${hallTitle}"
        stars={sumStars(starMap)}
        maxStars={STAGES.length * 3}
        settings={settings}
      />

      <StageStrip
        stages={STAGES}
        activeId={stage.id}
        stars={starMap}
        color="${hallColor}"
        onSelect={selectStage}
      />

      <DadSays text={stage.prompt} />

      <section className="card workbench">
        <div className="workbench-canvas">
          {/* 注意：SVG <text> 标签之间保持至少 18px 垂直间距或错开左右锚点，避免移动端重叠 */}
          <svg
            viewBox="0 0 560 320"
            role="img"
            aria-label="${title}互动实验台"
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, background: "#0f172a" }}
          >
            <rect
              x={60 + stage.targetMin * 4.4}
              y={128}
              width={Math.max(8, (stage.targetMax - stage.targetMin) * 4.4)}
              height={64}
              rx={10}
              fill="rgba(46, 213, 115, 0.22)"
              stroke="#2ed573"
              strokeDasharray="6 4"
            />
            <text x={280} y={42} textAnchor="middle" fill="#e2e8f0" fontSize="16" fontWeight="700">
              目标区间：{stage.targetMin} ~ {stage.targetMax}
            </text>
            <line x1={60} y1={160} x2={500} y2={160} stroke="#334155" strokeWidth={8} strokeLinecap="round" />
            <circle
              cx={60 + output * 4.4}
              cy={160}
              r={18}
              fill={inZone ? "#2ed573" : "${hallColor}"}
              stroke="#ffffff"
              strokeWidth={3}
            />
            <text x={280} y={272} textAnchor="middle" fill="#94a3b8" fontSize="14">
              当前读数：{output.toFixed(1)}
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          <Slider
            label="实验参数"
            value={value}
            min={0}
            max={100}
            step={1}
            format={fixed(0, "")}
            color="${hallColor}"
            onChange={(v) => {
              setValue(v);
              setWonStars(null);
            }}
          />

          <Meter label="接近目标" pct={closeness} valueText={\`\${output.toFixed(1)}\`} />

          <div className="action-row" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" className="primary-btn" onClick={handleVerify}>
              ✅ 验证实验
            </button>
            <button
              type="button"
              className="pill-btn"
              onClick={() => {
                setUsedHint(true);
                if (settings.sound) say(dad(stage.dadTip));
              }}
            >
              💡 听爸爸提示
            </button>
          </div>

          {usedHint && <HintBox text={stage.dadTip} />}
        </div>
      </section>

      {wonStars !== null && (
        <WinCard
          stars={wonStars}
          cheer={stage.cheer}
          explain={stage.explain}
          nextLabel={stageIdx < STAGES.length - 1 ? \`下一关 · \${STAGES[stageIdx + 1].title} →\` : undefined}
          onNext={stageIdx < STAGES.length - 1 ? () => selectStage(STAGES[stageIdx + 1].id) : undefined}
          onAgain={() => selectStage(stage.id)}
        />
      )}
    </>
  );
}

export const ${exportIdent}: GameModule = {
  meta: {
    id: "${id}",
    title: "${title}",
    emoji: "${emoji}",
    category: "${category}",
    tag: "TODO标签 · 核心概念",
    blurb: "TODO(agent): 用一句话告诉小朋友这个实验玩什么、能发现什么奥秘。",
    maxStars: STAGES.length * 3
  },
  Play: Workbench
};
`;
}

const rawArgs = process.argv.slice(2);
const writeMode = rawArgs.includes("--write");
const positional = rawArgs.filter((a) => !a.startsWith("--"));

if (positional.length < 3 || rawArgs.includes("--help") || rawArgs.includes("-h")) {
  printHelp();
  process.exit(positional.length === 0 || rawArgs.includes("--help") || rawArgs.includes("-h") ? 0 : 1);
}

const [category, id, title, emojiArg] = positional;
const hall = categories.find((c) => c.id === category);
if (!hall) {
  console.error(`❌ 未知展馆 "${category}"。可选值：${categories.map((c) => c.id).join(", ")}`);
  process.exit(1);
}
if (!/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error(`❌ 游戏 id "${id}" 格式不合法，请使用小写字母/数字/短横线（如 doppler、solar-sail）。`);
  process.exit(1);
}

const emoji = emojiArg || hall.emoji;
const exportIdent = toExportIdent(id);
const gameDir = path.join(ROOT, "src", "games", category, id);
const logicFile = path.join(gameDir, "logic.ts");
const indexFile = path.join(gameDir, "index.tsx");
const catalogFile = path.join(ROOT, "src", "catalog", "games.ts");
const catalogText = fs.readFileSync(catalogFile, "utf8");

if (fs.existsSync(gameDir) || catalogText.includes(`id: "${id}"`) || catalogText.includes(`/${id}/index.tsx`)) {
  console.error(`❌ 游戏 "${id}" 已存在于目录或 src/catalog/games.ts 中，请换一个新的 id。`);
  process.exit(1);
}

const logicCode = renderLogicTemplate(title);
const indexCode = renderIndexTemplate({
  id,
  category,
  hallTitle: hall.title,
  hallColor: hall.color,
  title,
  emoji,
  exportIdent
});

const importLine = `import { ${exportIdent} } from "../games/${category}/${id}/index.tsx";`;

if (!writeMode) {
  console.log(`🔍 [预览模式] 将在「${hall.emoji} ${hall.title}」下创建新实验：${emoji} ${title} (id: ${id})`);
  console.log(`   加 --write 参数可直接落盘并自动注册到 src/catalog/games.ts：\n`);
  console.log(`   npm run game:new -- ${category} ${id} "${title}" "${emoji}" --write\n`);
  console.log(`📁 目标文件：`);
  console.log(`   • src/games/${category}/${id}/logic.ts`);
  console.log(`   • src/games/${category}/${id}/index.tsx`);
  console.log(`   • src/catalog/games.ts  (+ ${importLine})\n`);
} else {
  fs.mkdirSync(gameDir, { recursive: true });
  fs.writeFileSync(logicFile, logicCode, "utf8");
  fs.writeFileSync(indexFile, indexCode, "utf8");

  // 自动插入 import 与 games 数组项
  let nextCatalog = catalogText;
  const lastImportIdx = nextCatalog.lastIndexOf("import ");
  const lineEndIdx = nextCatalog.indexOf("\n", lastImportIdx);
  nextCatalog = `${nextCatalog.slice(0, lineEndIdx + 1)}${importLine}\n${nextCatalog.slice(lineEndIdx + 1)}`;
  nextCatalog = nextCatalog.replace(/\n\];/, `,\n  ${exportIdent}\n];`);
  fs.writeFileSync(catalogFile, nextCatalog, "utf8");

  console.log(`✅ 已创建并注册「${emoji} ${title}」(${category}/${id})！\n`);
}

console.log("🧪 请同步在 tests/collection.test.mjs 中加入单测断言：");
console.log(`------------------------------------------------------------`);
console.log(`import * as ${id.replace(/-/g, "_")}Logic from "../src/games/${category}/${id}/logic.ts";`);
console.log(`test("${id}: 初始状态未提前过关且目标区间可达成", () => {`);
console.log(`  for (const s of ${id.replace(/-/g, "_")}Logic.STAGES) {`);
console.log(`    assert.equal(${id.replace(/-/g, "_")}Logic.checkStageGoal(s, s.startValue), false);`);
console.log(`    assert.equal(${id.replace(/-/g, "_")}Logic.checkStageGoal(s, (s.targetMin + s.targetMax) / 2), true);`);
console.log(`  }`);
console.log(`});`);
console.log(`------------------------------------------------------------\n`);
console.log("🚀 完成后依次运行以下 4 条验收门禁：");
console.log(`  1. npm run typecheck`);
console.log(`  2. npm run check`);
console.log(`  3. npm test`);
console.log(`  4. npm run smoke -- ${id}`);
