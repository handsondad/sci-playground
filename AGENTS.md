# AGENTS.md：给接手这个仓库的代码助手

## 这是什么

**科学小游戏大冒险（`sci-playground`）** 是一座给 6–12 岁孩子和家长共玩的互动 STEAM 科学工程博物馆（线上地址：`https://handsondad.github.io/sci-playground/`）。全站由 7 岁好奇男孩 **小念** 和温和爱动手的 **爸爸** 串联引导，按 **9 大学科展馆** 收录可动手调参的互动实验台、「小念问爸爸」语音问答与「科学百宝箱」大师故事 + 居家小实验。

技术栈刻意克制：**React 18 + TypeScript (strict) + Vite 5**，Hash 路由（`#/`、`#/c/<hall>`、`#/g/<id>`），纯静态前端零后端，本机 `localStorage` 记录星星进度，Node 24 原生测试运行器单测。

> **动手扩充新实验、新展馆、大师故事或父子问答之前，请先完整阅读项目 Skill：**
> - `.agents/skills/sci-playground-builder/SKILL.md`（镜像于 `skills/sci-playground-builder/SKILL.md`）
> - `.agents/skills/sci-playground-builder/kit-reference.md`（共享 UI 组件与样式速查表）

---

## 命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动本地 Vite 开发服 |
| `npm run game:new` | 查看 9 大展馆 ID 与新实验脚手架用法 |
| `npm run game:new -- <hall> <id> "<中文标题>" "[emoji]" --write` | 生成 `logic.ts` + `meta.ts` + `index.tsx` 模板并自动注册到 `src/catalog/games.ts` |
| `npm run typecheck` | `tsc --noEmit` 全量严格类型检查 |
| `npm run check` | 运行仓库规则守卫（导入后缀、纯逻辑层、目录注册、`backLabel`、问答与百科完整性）并输出展馆统计 |
| `npm run voice` | 增量采集全馆台词并用 `edge-tts` + `ffmpeg` 生成「小念（`zh-CN-YunxiaNeural`）& 爸爸（`zh-CN-YunxiNeural`）」标准语音 MP3 与清单 |
| `npm test` | Node 24 原生单测（覆盖全部实验纯逻辑、语音清单完整性 + `check-rules` 一致性守卫） |
| `npm run build` | 类型检查 + Vite 生产打包到 `dist/` |
| `npm run smoke` | 无头 Edge/Chrome 全量巡检首页、9 大展馆与全部实验（桌面 `1280×900` + 手机 `390×844` 零报错、零横向溢出、零 SVG 文字重叠） |
| `npm run smoke -- <id>...` | 秒级定向巡检刚新增或修改的实验（例如 `npm run smoke -- bridge gears`） |
| `npm run shots -- <id>...` | 定向巡检并导出桌面与手机 PNG 截图到 `tmp-shots/` 供视觉复核 |

**交付前四步必跑门禁**：

```bash
npm run voice                          # 若新增或修改了任何小念/爸爸台词、问答或百科卡片，必须重跑生成同款神经网络配音！
npm run typecheck
npm run check
npm test
npm run smoke -- <新增或改动的gameId>   # 若改动公共壳层/样式则跑全量 npm run smoke
```

---

## 地图

### 路由

| Hash 路由 | 页面组件 | 说明 |
| --- | --- | --- |
| `#/` | `src/shell/HubPage.tsx` | 科学馆大厅：父子开场舞台、快速寻宝栏（搜索 + 🎲 随便玩一个）、9 大展馆门厅卡片 |
| `#/c/<hall>` | `src/shell/CategoryPage.tsx` | 分馆展厅：本馆父子导览、分区直达锚点、本馆实验台、本馆专属百宝箱与问答 |
| `#/g/<id>` | `src/games/.../<id>/index.tsx` | 具体互动实验台（多关卡挑战、SVG 动态画布、滑块/按钮控制、三星结算） |

### 九大展馆边界（选对归属！）

| `CategoryId` | 展馆名 | 收录边界 |
| --- | --- | --- |
| `math` | ➗ 数学思维馆 | 图论、递归、概率统计、数论筛法、拓扑染色、斐波那契与几何规律 |
| `physics` | 💡 声光电磁馆 | 机械波/声学、几何光学、RGB 色光混合、流体浮力、单摆周期、串并联电路与电磁 |
| `mechanics` | ⚙️ 机械动力馆 | 最速降线、杠杆力矩、抛体运动、齿轮传动比与惰轮、滑轮组等简单机械与运动学 |
| `architecture` | 🏛️ 建筑结构馆 | 桁架三角刚性、石拱推力、无胶悬挑重心、抗震阻尼（TMD/隔震）、太阳高度角被动遮阳 |
| `chemistry` | 🧪 化学分子馆 | 酸碱指示剂、质量守恒配平、液体密度分层、产气限量反应、金属焰色光谱、三态分子相变 |
| `biology` | 🌿 生命科学馆 | DNA 碱基配对、食物链能量金字塔、半透膜渗透、孟德尔遗传棋盘、自然选择演化 |
| `earth` | 🌍 地球地理馆 | 等高线地形剖面、板块构造边界、迎风坡地形雨与焚风、地层叠覆化石、海陆热力环流 |
| `astro` | 🪐 天文宇宙馆 | 月相几何、地轴倾角与四季、开普勒定律、宇宙速度与轨道、日食月食与白道倾角 |
| `computing` | 💻 计算逻辑馆 | 二进制位权与点阵、布尔逻辑门、古典密码与频率分析、信息论三分查找、图最短路径算法 |

### 目录结构

- `src/catalog/`：全站注册中心
  - `types.ts`：`CategoryId`、`Category`、`GameMeta`、`GameProps`、`GameModule`、`GameEntry`
  - `categories.ts`：9 大展馆定义（名称、emoji、导语、主题色）
  - `games.ts`：全部实验注册表（首页、分馆、总星数统计的唯一数据源）。每项为 `{ meta, load }`：`meta` 直接静态导入各游戏轻量的 `meta.ts`，`load` 用 `import()` 按需加载实验台代码块（进入游戏或悬停卡片时才下载）
  - `talks.ts`：大厅对话 `hubChats`、分馆对话 `categoryChats`、折叠问答 `scienceTalks`
  - `wiki.ts`：「科学百宝箱」大师故事与居家小实验 `scienceWiki`
- `src/kit/`：统一复用的绘本互动组件库（**严禁在单个游戏里重写外壳**）
  - `Chrome.tsx`：`TopBar`、`DadSays`、`NianSays`、`Says`、`Chat`、`SpeakButton`、`starRow`
  - `GameKit.tsx`：`StageStrip`、`Meter`、`HintBox`、`WinCard`、`DuoStage`、`TalksSection`、`WikiSection`
  - `Slider.tsx`：带 `− / +` 逐格微调按钮的无障碍 `Slider` 及 `fixed` / `degrees` 格式化器
  - `progress.ts`：`recordStars`、`useGameStars`、`useStarBook`、`sumStars`（`localStorage` 持久化）
  - `speech.ts`：`say`、`stopSpeaking`、`nian`、`dad`、`hasClip`（优先播放 `public/voice/` 预生成的小念 `YunxiaNeural` & 爸爸 `YunxiNeural` MP3，动态数字句自动回退 Web Speech；前端只打包 `src/catalog/voice-clips.ts` 的短哈希集合，由 `voice-key.ts` 在浏览器内算 SHA-1 定位音频，播放当前句时预加载下一句）
  - `audio.ts`：`chime(true | false)` WebAudio 轻音效
- `src/games/<folder>/<id>/`：每个实验独立目录，标准三文件结构 `logic.ts`（纯算法/物理公式）+ `meta.ts`（卡片元数据，只许 `import type`，`maxStars` 写数字字面量）+ `index.tsx`（React + SVG 实验台，`import { meta } from "./meta.ts"`）
- `src/index.css`：设计令牌与全局响应式布局（`.workbench` 桌面双栏、窄屏自动单栏）
- `tools/`：AI 与开发者共用的脚手架（`new-game.mjs`）、规则守卫（`check-rules.mjs`）和无头浏览器巡检（`smoke.mjs`）
- `tests/`：Node 24 原生单元测试（`collection.test.mjs`、`slide.test.mjs`、`voice.test.mjs`，以及校验每个 `meta.ts` 星星上限与关卡数一致的 `stars.test.mjs`）

---

## 标准扩充流程

### A. 新增一款互动科学实验

1. **脚手架起手**：运行 `npm run game:new -- <hall> <id> "<中文标题>" "<emoji>" --write`，自动生成 `src/games/<hall>/<id>/{logic.ts,meta.ts,index.tsx}` 并挂载到 `src/catalog/games.ts`。
2. **编写纯科学模型（`logic.ts`）**：
   - 设计 **3～4 个递进关卡**（第 1 关直观感知 → 第 2 关定量/反向规律 → 第 3/4 关组合或极限挑战）。
   - 用真实物理/数学/化学/工程规律计算状态，**严禁硬编码假数据**。
   - 确保每一关的初始参数**未提前达成目标**（即 `checkGoal(level, level.startState) === false`）。
3. **搭建互动实验台（`index.tsx`）**：
   - 标准骨架：`TopBar`（`backLabel` 必须严格等于所属展馆的 `category.title`）→ `StageStrip` → `DadSays` 关卡引导 → `<section className="card workbench">`（左侧深色高对比 SVG 动态画布 + 右侧 `Slider` / 按钮 / `Meter` / `HintBox`）→ 过关弹出 `WinCard`。
   - 看过提示（`HintBox`）当关最高封顶 **2 星**；未看提示一次调准拿 **3 星**，通过 `recordStars(id, stageId, stars)` 记星（只升不降）。
4. **补齐单测与联动内容**：
   - 在 `tests/collection.test.mjs` 中导入该游戏的 `logic.ts`，断言核心公式单调性/守恒律，以及每关初始状态未提前过关且目标可达成（`npm run check` 会强制检查单测覆盖）。
   - 在 `tests/stars.test.mjs` 的 `derive` 表登记 `meta.ts` 里 `maxStars` 的推导（通常是 `(m) => m.STAGES.length * 3`），增删关卡时测试会提醒同步改字面量。
   - 如适合，可在 `src/catalog/wiki.ts` 补一张 `relatedGameId: "<id>"` 的大师故事卡，或在 `src/catalog/talks.ts` 补一条问答。
5. **跑通四步门禁**：`npm run typecheck && npm run check && npm test && npm run smoke -- <id>`。

### B. 新增一个学科展馆（第 10+ 馆）

1. 在 `src/catalog/types.ts` 的 `CategoryId` 联合类型中加入新 ID。
2. 在 `src/catalog/categories.ts` 增加展馆元数据（`id`、`title`、`emoji`、`blurb`、`color`）。
3. 在 `src/catalog/talks.ts` 补齐 `categoryChats[<newId>]`（至少 2 组开场对话）及至少 **3 条** 归属该馆的 `scienceTalks`。
4. 在 `src/catalog/wiki.ts` 补齐至少 **3 张** 归属该馆的 `scienceWiki` 卡片（`homeLab` 以 `🏠 居家小实验：` 开头，`relatedGameId` 指向真实游戏）。
5. 为该馆创建并注册至少 **4～5 款** 互动实验，每款实验会自动拆成独立的懒加载代码块，无需改 `vite.config.ts`（`manualChunks` 只单独拆出 `vendor`）。
6. 运行 `npm run check && npm test && npm run build && npm run smoke`。

---

## 硬性规矩

1. **科学准确性不可妥协**：公式、单位、因果方向必须真实可靠（例如：大齿轮转速慢但扭矩大、迎风坡湿绝热递减率小于背风坡干绝热递减率产生焚风、单摆小角度周期与摆锤质量无关）。为了儿童体验做数值简化时，定性方向与物理守恒律绝不能反。
2. **纯逻辑与视图严格分离**：`logic.ts` 绝不能 `import` React、`.tsx` 或访问 `document` / `localStorage`，保证 Node 24 原生测试毫秒级直跑。
3. **小念 × 爸爸角色人格统一**：
   - **小念**（7 岁）：好奇、敢猜、会拿日常生活打比方，过关欢呼自然鲜活。
   - **爸爸**：温和启发、给观察线索而不是直接报答案数字；孩子没调准时给鼓励式科学提示，**严禁出现「笨蛋 / 真笨 / 蠢 / 废物」等贬损词**（`npm run check` 自动拦截）。
4. **存档与路由兼容**：`src/kit/progress.ts` 中的 `STORAGE_KEY = "sci:stars:v1"` 及已发布游戏的 `meta.id` 一律不得改名，防止老玩家丢失星星。
5. **移动端与视觉零事故**：桌面（`1280×900`）与手机（`390×844`）均不得出现横向滚动条，SVG 内所有可见 `<text>` 包围盒不得互相重叠。
6. **`README.md` 面向人类读者**：`README.md` 只给家长、孩子和访客看，保持温暖简洁；工程规范、脚手架命令与 AI 协作约定一律写在本文件或 Skill 中。

---

## 已知的坑

- **相对导入必须写全 `.ts` / `.tsx` 后缀**：Node 24 原生 TypeScript 类型剥离器不支持省略后缀，所有 `src/` 内的相对导入都必须写成 `./logic.ts`、`../../../kit/Chrome.tsx`；同时 `tests/*.test.mjs` 只能导入 `.ts` 或 `.mjs`，绝不能导入 `.tsx`。
- **SVG 文字重叠**：动态移动的标注（如齿轮齿数/转速、山峰海拔与凝结高度、电路电流标注）极易在窄屏或特定参数下撞在一起。务必错开垂直 `y` 坐标（间隔 `>= 18px`）或用 `textAnchor="start" | "end"` 朝两侧外推，并用 `npm run smoke -- <id>` 自动扫描包围盒确认。
- **SVG 色光相加混合**：模拟舞台 RGB 彩灯叠加时，不要把 `mixBlendMode: "screen"` 写在包裹组 `<g>` 上（会产生隔离组导致变灰），应直接写在各自的 `<circle>` / `<path>` 上。
- **历史目录路径与展馆归属**：早期 `lever`、`slide`、`toss` 磁盘路径仍在 `src/games/physics/` 下，但它们的 `meta.category` 已归入 `"mechanics"`（机械动力馆）。判断归属永远以 `meta.category` 为准，`TopBar` 的 `backLabel` 必须与 `meta.category` 对应的展馆标题完全一致。
- **语音队列不要裸调浏览器 API**：朗读统一走 `src/kit/speech.ts` 的 `say(...)` 和 `stopSpeaking()`，且在游戏内自动发声前先判断 `if (sound)`（用户点气泡上的 `🔊` 单句按钮除外）。
