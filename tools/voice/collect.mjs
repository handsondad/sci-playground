// 自动收集全馆所有需要小念和爸爸配音的台词：
//   1. src/catalog/talks.ts（大厅对话、9 馆开场对话、30 组问答）
//   2. src/catalog/wiki.ts（27 张大师百宝箱朗读词）
//   3. src/games/** 下全部游戏的关卡开场白、提示、过关揭秘与固定气泡台词
// 新游戏只要按规范写 logic.ts 与 index.tsx，`npm run voice` 会自动发现并生成配音。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { categoryChats, hubChats, scienceTalks } from "../../src/catalog/talks.ts";
import { scienceWiki } from "../../src/catalog/wiki.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GAMES_DIR = path.join(ROOT, "src", "games");

function walkFiles(dir, pred) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, pred));
    else if (pred(full)) out.push(full);
  }
  return out;
}

export async function collectVoiceLines() {
  const map = new Map();
  const add = (who, rawText) => {
    if (typeof rawText !== "string") return;
    const text = rawText.trim();
    if (!text) return;
    map.set(`${who}|${text}`, { who, text });
  };

  // 1. 首页与分馆对话 + 小念问爸爸
  for (const [n, d] of [...hubChats, ...Object.values(categoryChats)]) {
    add("nian", n);
    add("dad", d);
  }
  for (const talk of scienceTalks) {
    for (const turn of talk.turns) {
      add("nian", turn.nian);
      add("dad", turn.dad);
    }
    add("nian", talk.wrap);
  }

  // 2. 科学百宝箱 SpeakButton 朗读串（与 WikiSection 完全一致）
  for (const item of scienceWiki) {
    add("dad", `${item.scientist}的故事：${item.title}。${item.story} ${item.homeLab}`);
  }

  // 3. WinCard 默认欢呼词
  add("nian", "太棒啦，做出来啦！");

  // 4. 扫描所有游戏的 logic.ts / data/*.ts 与 .tsx 组件
  const gameDirs = [];
  for (const catEntry of fs.readdirSync(GAMES_DIR, { withFileTypes: true })) {
    if (!catEntry.isDirectory()) continue;
    for (const gEntry of fs.readdirSync(path.join(GAMES_DIR, catEntry.name), { withFileTypes: true })) {
      if (gEntry.isDirectory()) gameDirs.push(path.join(GAMES_DIR, catEntry.name, gEntry.name));
    }
  }

  for (const gameDir of gameDirs) {
    const tsxFiles = walkFiles(gameDir, (f) => f.endsWith(".tsx"));
    const combinedTsx = tsxFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

    // 4a. 提取 .tsx 中的纯静态文本字面量
    for (const m of combinedTsx.matchAll(/\bdad\(\s*(["'])((?:\\.|(?!\1)[^\\\r\n])+)\1\s*\)/g)) add("dad", m[2]);
    for (const m of combinedTsx.matchAll(/\bnian\(\s*(["'])((?:\\.|(?!\1)[^\\\r\n])+)\1\s*\)/g)) add("nian", m[2]);
    for (const m of combinedTsx.matchAll(/<(?:DadSays|HintBox)\b[^>]*?\btext=\{(["'])((?:\\.|(?!\1)[^\\\r\n])+)\1\}/g)) add("dad", m[2]);
    for (const m of combinedTsx.matchAll(/<(?:DadSays|HintBox)\b[^>]*?\btext=(["'])((?:\\.|(?!\1)[^\\\r\n])+)\1/g)) add("dad", m[2]);
    for (const m of combinedTsx.matchAll(/<NianSays\b[^>]*?\btext=\{(["'])((?:\\.|(?!\1)[^\\\r\n])+)\1\}/g)) add("nian", m[2]);
    for (const m of combinedTsx.matchAll(/<NianSays\b[^>]*?\btext=(["'])((?:\\.|(?!\1)[^\\\r\n])+)\1/g)) add("nian", m[2]);
    for (const m of combinedTsx.matchAll(/<DadSays>([^<{]+)<\/DadSays>/g)) add("dad", m[1]);
    for (const m of combinedTsx.matchAll(/<NianSays>([^<{]+)<\/NianSays>/g)) add("nian", m[1]);
    for (const m of combinedTsx.matchAll(/<Says\s+who=(["'])(dad|nian)\1>([^<{]+)<\/Says>/g)) add(m[2], m[3]);
    for (const m of combinedTsx.matchAll(/\bcheer=(["'])((?:\\.|(?!\1)[^\\\r\n])+)\1/g)) add("nian", m[2]);
    for (const m of combinedTsx.matchAll(/\b(?:explain|dadLine)=(["'])((?:\\.|(?!\1)[^\\\r\n])+)\1/g)) add("dad", m[2]);

    // 4b. 导入该游戏的纯 TS 数据模块，还原关卡开场白、故事、提示、揭秘与欢呼
    const dataFiles = walkFiles(gameDir, (f) => f.endsWith("logic.ts") || /[/\\]data[/\\].+\.ts$/.test(f));
    for (const df of dataFiles) {
      const mod = await import(pathToFileURL(df).href);
      for (const val of Object.values(mod)) {
        if (!Array.isArray(val) || val.length === 0 || typeof val[0] !== "object" || val[0] === null) continue;
        val.forEach((item, idx) => {
          if (typeof item.story === "string") add("dad", item.story);
          if (typeof item.prompt === "string") {
            add(df.includes(`${path.sep}slide${path.sep}`) && df.endsWith("quiz.ts") ? "nian" : "dad", item.prompt);
          }
          if (typeof item.hint === "string") add("dad", item.hint);
          if (typeof item.dadTip === "string") add("dad", item.dadTip);
          if (typeof item.win === "string") add("dad", item.win);
          if (typeof item.explain === "string") add("dad", item.explain);
          if (typeof item.why === "string") add("dad", item.why);
          if (typeof item.cheer === "string") add("nian", item.cheer);
          if (typeof item.nianLine === "string") add("nian", item.nianLine);

          const id = item.id ?? idx + 1;
          const title = item.title ?? item.name ?? "";
          const story = item.story ?? item.hint ?? "";

          if (title && story) {
            if (combinedTsx.includes("关，") && combinedTsx.includes(".story}")) {
              add("dad", `第${id}关，${title}。${story}`);
            }
            if (combinedTsx.includes("关，") && combinedTsx.includes(".hint}")) {
              add("dad", `第${id}关，${title}。${item.hint ?? story}`);
            }
            if (combinedTsx.includes(`第 \${`) && combinedTsx.includes(`关「`)) {
              add("dad", `第 ${id} 关「${title}」：${story}`);
            }
            if (combinedTsx.includes("杯，")) add("dad", `第${id}杯，${title}。${story}`);
            if (combinedTsx.includes(`杯「`)) add("dad", `第 ${id} 杯「${title}」：${story}`);
            if (combinedTsx.includes("条生态链，")) add("dad", `第${id}条生态链，${title}。${story}`);
            if (combinedTsx.includes("条基因链，")) {
              add("dad", `第${id}条基因链，${title}。${story}`);
              add("dad", `第 ${id} 条「${title}」：${story} 记住钥匙扣规则——红 A 对蓝 T，绿 C 对橙 G！`);
            }
            if (combinedTsx.includes("颗裸蛋，")) add("dad", `第${id}颗裸蛋，${title}。${story}`);
            if (combinedTsx.includes("只气球，")) add("dad", `第${id}只气球，${title}。${story}`);
            if (combinedTsx.includes("投，")) add("dad", `第${id}投，${title}。${story}`);
          }
          if (title && combinedTsx.includes("调前面的分子个数")) {
            add("dad", `第${id}题，${title}。调前面的分子个数，让箭头两边的每种原子一样多！`);
          }
          if (item.name && item.why && combinedTsx.includes("请把月球转到")) {
            add("dad", `第${idx + 1}关，请把月球转到「${item.name}」的位置！`);
            add("dad", `${item.name}！${item.why}`);
            add("dad", `任务：金色的太阳光从最右边平行照过来！拖动轨道上的月亮（或滑块），让地球上的人看到「${item.name}」，再点锁定验证！`);
          }
          if (title && item.why && combinedTsx.includes("把歪着身子的地球公转到")) {
            add("dad", `第${id}关，把歪着身子的地球公转到「${title}」的位置！`);
            add("dad", `${title}！${item.why}`);
            add("dad", `第 ${id} 关：注意地轴顶端的红点（北极）永远指向右上方的北极星！拖动地球绕太阳公转，找到「${title}」！`);
            add("dad", `${item.why} 很多人误以为夏天是因为地球离太阳更近，其实地球轨道非常接近正圆（北半球 1 月反而离太阳最近），真正决定冷暖的是太阳直射角！`);
          }
          if (df.includes(`${path.sep}slide${path.sep}`) && df.endsWith("levels.ts") && typeof item.hint === "string") {
            add("dad", `${item.hint} 绿色虚线是这些圆点能搭出的最快形状。（看过提示本关最多记两颗星）`);
            add("dad", `${item.hint} 绿色虚线是这些圆点能搭出的最快形状，红色虚线是被石头挡住的理想摆线。（看过提示本关最多记两颗星）`);
          }
        });
      }
    }
  }

  for (const [n, m] of [[3, 7], [4, 15], [5, 31]]) {
    add("dad", `${n}层汉诺塔！把所有圆盘搬到最右边的 C 柱，最少需要 ${m} 步。`);
    add("dad", `太神啦！正好 ${m} 步，一步都没多走！`);
    add("dad", `成功搬完 ${n} 层宝塔！`);
  }
  add("dad", "全对。你已经会用眼睛看出哪条滑梯更快了。");
  add("dad", "差一点的那几题，再看一次小球怎么加速。");
  add("dad", "一气呵成！每条边都只走了一次！");
  add("dad", "一笔画通啦！掌握单数点秘诀还能拿满三星！");
  add("dad", "命中啦！再试试另一个互补角度（一平一陡），拿满三颗星！");

  return [...map.values()];
}
