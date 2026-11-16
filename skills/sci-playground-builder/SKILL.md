---
name: sci-playground-builder
description: 为「科学小游戏大冒险」(sci-playground) 设计、实现与验收新的 STEAM 互动科学实验、新学科展馆、「小念问爸爸」语音问答与「科学百宝箱」大师故事卡。凡在本仓库扩充游戏、分类、百科或优化互动实验体验时调用。
---

# 科学小游戏大冒险 · 内容与实验扩充指南 (`sci-playground-builder`)

本技能用于指导 AI Agent 以统一的博物馆品质扩充 `sci-playground`。动手写代码前先读完本指南；需要查阅 `src/kit/*` 组件签名与布局样式时，查看同目录下的 `kit-reference.md`。

---

## 1. 选题标准：什么样的实验才够格进馆？

借鉴 **PhET Interactive Simulations**、**旧金山探索馆 (Exploratorium Science Snacks)**、**Mathigon Polypad** 与 **CS Unplugged** 的黄金准则，每个新实验必须同时满足三点：

1. **真动手，而非换皮选择题**：孩子必须能拖滑块、拨开关、摆零件、连线路或改形状，画布（SVG）必须**实时物理响应**参数变化，而不是只点 ABCD 四个选项。
2. **反直觉或「哇时刻」（Aha Moment）**：优先选有认知冲突的经典现象——例如「直线最近但摆线滑得最快」「小齿轮带大齿轮转得慢却力气翻倍」「爸爸妈妈双眼皮也能生出单眼皮宝宝」「分三堆称重比对半分更快」。
3. **3～4 关阶梯递进**：
   - **第 1 关（直觉初探）**：单变量探索，门槛低，让孩子立刻看懂「我拉这个，那个会怎么变」。
   - **第 2 关（定量/反向规律）**：引入具体目标值、守恒关系或相反场景（如串联切并联、迎风坡看背风坡）。
   - **第 3～4 关（综合工程挑战）**：多约束耦合（如造桥既要稳又要省预算、摩天楼同时调刚度与阻尼球频率、密码破译结合频率分析）。

---

## 2. 角色口吻：小念 × 爸爸

全站所有台词（关卡引导 `DadSays`、过关欢呼 `WinCard.cheer`、原理解密 `WinCard.explain`、`talks.ts`、`wiki.ts`）必须贴合人物设定且使用「小念和爸爸」系列统一的 `edge-tts` 神经网络音色（小念 `zh-CN-YunxiaNeural +0%`，爸爸 `zh-CN-YunxiNeural -5%`，由 `npm run voice` 自动增量合成到 `public/voice/`）：

- **小念（7 岁男孩）**：眼睛亮、爱追问、喜欢拿滑梯/自行车/厨房/积木打比方。句子短促有活力（单句建议 15～45 字）。
- **爸爸**：温和、平视孩子、重实验证据。
  - **引导时（`prompt` / `dadTip`）**：给观察方向（「盯住右边大齿轮上的红点，数数小齿轮转三圈它转了几圈？」），**绝不直接泄底报过关数字**。
  - **揭秘时（`explain`）**：先肯定刚才亲手调出来的现象，再用一句形象比喻点破科学本质，最后连回现实世界（如赵州桥、高铁、空间站、向日葵）。
  - **红线**：严禁说教腔、严禁出现贬损词（`笨蛋`、`蠢`、`真笨`、`废物`），严禁堆砌未解释的大学术语。

---

## 3. 五步标准开发流

### 第 1 步：确认展馆归属并运行脚手架

先用 `npm run check` 查看当前 9 大展馆（`math`、`physics`、`mechanics`、`architecture`、`chemistry`、`biology`、`earth`、`astro`、`computing`）的现有游戏，避免撞题；随后用脚手架生成骨架：

```bash
npm run game:new -- <hall> <id> "<中文标题>" "<emoji>" --write
```

### 第 2 步：实现纯函数科学内核（`src/games/<hall>/<id>/logic.ts`）

- 只写纯 TypeScript 数据结构与计算函数，**不引 React、不碰 DOM**。
- 导出关卡数组（如 `levels` 或 `STAGES`）与核心求解/判赢函数，确保：
  - 公式方向、比例、边界值符合真实科学规律；
  - **每关初始状态 `checkGoal(level, level.startState)` 必须为 `false`**（防止一进关不操作就直接判赢）；
  - 每关至少存在一组可由滑块步长精确落入的通关解。

### 第 3 步：打造深色高对比 SVG 实验台（`src/games/<hall>/<id>/index.tsx`）

遵循全馆统一的视觉与交互契约（详见 `kit-reference.md`）：

1. **顶部栏 `TopBar`**：`backLabel` **必须严格等于所属展馆中文名**（如 `"建筑结构馆"`、`"地球地理馆"`），`stars={sumStars(starMap)}`、`maxStars={levels.length * 3}`。
2. **关卡条 `StageStrip`**：传入 `color`（使用本展馆主题色）与 `stars={starMap}`，支持随时切关并重置当关尝试状态。
3. **双栏工作台 `<section className="card workbench">`**：
   - 左栏 `.workbench-canvas`：深色实验室底板（如 `#0f172a` / `#131c2e`）上的响应式 `<svg viewBox="0 0 560 320">`，用鲜明色彩、虚线目标带、箭头矢量、粒子或平滑动画直观呈现物理量。
   - **SVG 排版铁律**：所有可见 `<text>` 标签之间保持至少 `18px` 垂直间距，或通过 `textAnchor="start" | "end"` 朝两侧外推，绝不能在窄屏（`390px`）或滑块极值处发生字压字！
   - 右栏 `.workbench-side`：放置 `Slider`（自带 `− / +` 微调按钮）、切换胶囊按钮、`Meter` 实时读数、验证按钮与「💡 听爸爸提示」按钮（点击后展示 `HintBox`）。
4. **计星与语音反馈**：
   - 未点提示且 1～2 次内调准 → `3` 星；未点提示多次调准 → `2` 星；点过提示封顶 `2` 星；保底 `1` 星。
   - 过关调用 `recordStars("<id>", level.id, earned)`，若 `sound` 开启则 `chime(true)` 并 `say(nian(level.cheer), dad(level.explain))`。
   - 渲染 `WinCard`，提供「下一关」与「再玩一次」。

### 第 4 步：补齐单元测试与配套科普内容

1. **必加单元测试**：在 `tests/collection.test.mjs` 导入新游戏的 `logic.ts`，至少断言：
   - 核心科学公式的关键不变量（如守恒律、单调性、特殊角/临界点）；
   - 遍历全部关卡：初始状态未过关，标准解可过关。
2. **按需扩充问答与百宝箱**：
   - `src/catalog/wiki.ts`：新增卡片时，`id` 唯一、`homeLab` 以 `"🏠 居家小实验："` 开头（用家里常见的杯子、硬币、手电筒、吸管等安全材料即可复现），`relatedGameId` 指向真实已注册游戏 ID。
   - `src/catalog/talks.ts`：新增问答时，标题以好奇提问结尾，至少 2 轮 `nian` / `dad` 对话 + 1 句 `wrap` 总结。

### 第 5 步：执行自动化门禁与无头浏览器巡检

每次交付前**必须**跑通以下全部命令且零报错：

```bash
npm run voice          # 自动增量补齐新增台词的小念 & 爸爸神经网络 MP3 配音与 voice-manifest.json
npm run typecheck
npm run check
npm test
npm run smoke -- <id>
```

若需要人工或视觉模型抽查画面排版，可运行 `npm run shots -- <id>`，然后直接查看 `tmp-shots/<id>-desktop.png` 与 `tmp-shots/<id>-mobile.png`（检查完记得清理临时文件或保持在 `.gitignore` 忽略的 `tmp-shots/` 内）。
