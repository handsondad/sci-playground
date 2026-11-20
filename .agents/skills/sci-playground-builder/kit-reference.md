# `src/kit/*` 共享组件与布局速查表 (`kit-reference.md`)

所有实验台统一从 `src/kit/` 导入外壳、滑块、星星存档、语音与音效，**不要自己重造顶栏、关卡条、气泡或本地存储**。

---

## 1. 游戏模块导出契约 (`src/catalog/types.ts`)

```ts
// meta.ts —— 首页 / 展厅 / 总星数直接打包它，所以只许 import type，不能导入 logic.ts
import type { GameMeta } from "../../../catalog/types.ts";

export const meta: GameMeta = {
  id: "doppler",               // URL 路由键 (#/g/doppler) 与存档键，一旦发布不可改名
  category: "physics",         // 必须是 CategoryId 之一
  title: "多普勒救护车",        // 卡片与顶栏主标题
  emoji: "🚑",
  tag: "声波 · 频率偏移",       // 卡片右上角学科微标签（建议 6～10 字）
  blurb: "迎面开来声音变尖、远去变低沉！拖动车速听懂波前挤压。", // 卡片简介（1 句话）
  maxStars: 12                 // 数字字面量 = 关卡数 × 3；tests/stars.test.mjs 会核对
};
```

```tsx
// index.tsx —— 实验台本体，进入游戏时才按需下载
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { meta } from "./meta.ts";

function MyWorkbench({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  // ...
}

export const myGame: GameModule = { meta, Play: MyWorkbench };
```

注册到 `src/catalog/games.ts`（脚手架 `--write` 会自动完成）：

```ts
import { meta as myGame } from "../games/physics/doppler/meta.ts";
// games 数组里：
{ meta: myGame, load: () => import("../games/physics/doppler/index.tsx").then((m) => m.myGame.Play) }
```

---

## 2. 顶栏与角色对话 (`src/kit/Chrome.tsx`)

- **`<TopBar emoji title onBack={exit} backLabel="<所属大馆标题>" stars={sumStars(starMap)} maxStars={...} settings={{ sound, setSound }} />`**
  - ⚠️ `backLabel` 必须与 `src/catalog/categories.ts` 中该 `category` 的 `title` 完全一致（例如 `"数学思维馆"`、`"声光电磁馆"`、`"机械动力馆"`、`"建筑结构馆"`、`"化学分子馆"`、`"生命科学馆"`、`"地球地理馆"`、`"天文宇宙馆"`、`"计算逻辑馆"`）。`npm run check` 会自动核对。
- **`<DadSays text="...">{可选富文本}</DadSays>`** / **`<NianSays text="...">`**
  - 自带角色 SVG 头像与 `🔊` 单句朗读按钮；若 `children` 为复杂 JSX，务必传纯文本 `text` 属性供朗读器使用。

---

## 3. 关卡条、计量条、提示框与胜利卡 (`src/kit/GameKit.tsx`)

- **`<StageStrip stages={stages} activeId={stage.id} stars={starMap} color="#ea580c" onSelect={loadStage} />`**
  - `stages` 元素结构：`{ id: number | string, title: string, emoji?: string }`。
- **`<Meter label="共振抑制率" pct={82} goal={75} valueText="82%" />`**
  - `pct` 范围 `0..100`；可选 `goal` 会在轨道上画一条目标刻度线。
- **`<HintBox text={stage.dadTip} />`**
  - 当玩家点击「💡 听爸爸提示」后展开显示，同时将该关 `usedHint` 置为 `true`（当关星数上限封顶 2 星）。
- **`<WinCard stars={wonStars} verdict="实验成功！" cheer={stage.cheer} explain={stage.explain} nextLabel="下一关 →" onNext={...} onAgain={...} />`**
  - 自动滚入视口并绽放庆祝粒子，展示小念欢呼与爸爸揭秘。

---

## 4. 微调滑块 (`src/kit/Slider.tsx`)

```tsx
import { Slider, degrees, fixed } from "../../../kit/Slider.tsx";

<Slider
  label="太阳仰角"
  value={sunDeg}
  min={15}
  max={80}
  step={1}
  format={degrees}          // 或 fixed(1, "m/s")
  color="#d97706"
  onChange={setSunDeg}
/>
```

两端自带大号 `−` / `+` 按钮，方便触屏儿童一根手指逐格微调。

---

## 5. 星星存档、语音与音效 (`progress.ts` / `speech.ts` / `audio.ts`)

```tsx
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";

const starMap = useGameStars("doppler"); // { 1: 3, 2: 2, ... }

// 过关时：
recordStars("doppler", stage.id, earnedStars); // 自动取历史最高星（1..3），不会倒扣
if (sound) {
  chime(true);
  say(nian(stage.cheer), dad(stage.explain));
}
```

---

## 6. 工作台标准布局类 (`src/index.css`)

```tsx
<section className="card workbench">
  <div className="workbench-canvas">
    <svg viewBox="0 0 560 320" style={{ width: "100%", height: "auto", display: "block" }}>
      {/* 深色高对比度动态科学可视化 */}
    </svg>
  </div>
  <div className="workbench-side">
    {/* 滑块、开关组、实时读数卡片、操作按钮 */}
  </div>
</section>
```

- 桌面端（宽屏）`.workbench` 自动左右分栏（左画布、右控制台）；窄屏手机（`390px`）自动折叠为上下单栏，切勿用固定像素死锁宽度（如 `width: 700px`），避免产生横向滚动条。
