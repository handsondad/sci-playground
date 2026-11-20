#!/usr/bin/env node
/**
 * 科学小游戏大冒险 · 仓库规则与目录一致性检查器
 *
 * 用法：
 *   npm run check              # 检查全部硬性规矩并输出展馆总览
 *   node tools/check-rules.mjs --quiet
 *
 * 也被 tests/collection.test.mjs 直接复用，保证本地与 CI 同一套准绳。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { categories } from "../src/catalog/categories.ts";
import { games } from "../src/catalog/games.ts";
import { categoryChats, hubChats, scienceTalks } from "../src/catalog/talks.ts";
import { scienceWiki } from "../src/catalog/wiki.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "src");
const GAMES_DIR = path.join(SRC_DIR, "games");
const TESTS_DIR = path.join(ROOT, "tests");

const FORBIDDEN_SCOLDING = /笨蛋|蠢货|废物|真笨|白痴/;

function walkFiles(dir, predicate = () => true) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

export function checkAllRules() {
  const errors = [];
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // 0. 检查 AI 协作文档与双路径 Skill 镜像同步（兼容 .agents/skills 与 skills/）
  for (const doc of ["AGENTS.md", "CLAUDE.md"]) {
    if (!fs.existsSync(path.join(ROOT, doc))) {
      errors.push(`[协作文档] 缺少根目录 ${doc}`);
    }
  }
  for (const skillDoc of ["SKILL.md", "kit-reference.md"]) {
    const a = path.join(ROOT, ".agents", "skills", "sci-playground-builder", skillDoc);
    const b = path.join(ROOT, "skills", "sci-playground-builder", skillDoc);
    if (!fs.existsSync(a) || !fs.existsSync(b)) {
      errors.push(`[Skill缺失] 请同时保留 .agents/skills/sci-playground-builder/${skillDoc} 与 skills/sci-playground-builder/${skillDoc}`);
    } else if (fs.readFileSync(a, "utf8") !== fs.readFileSync(b, "utf8")) {
      errors.push(`[Skill不同步] .agents/skills/sci-playground-builder/${skillDoc} 与 skills/sci-playground-builder/${skillDoc} 内容不一致`);
    }
  }

  // 1. 检查 src/ 下所有相对导入必须带显式后缀 (.ts / .tsx / .css / .json)，且目标文件存在
  const srcFiles = walkFiles(SRC_DIR, (f) => /\.(ts|tsx)$/.test(f));
  const importRe = /(?:from\s+|import\s*\(\s*)["'](\.[^"']+)["']/g;
  for (const file of srcFiles) {
    const content = fs.readFileSync(file, "utf8");
    for (const match of content.matchAll(importRe)) {
      const spec = match[1];
      if (!/\.(ts|tsx|css|json)$/.test(spec)) {
        errors.push(`[导入后缀] ${rel(file)} 中的相对导入 "${spec}" 必须显式写明 .ts / .tsx 后缀（Node 24 原生 TS 测试要求）`);
        continue;
      }
      const resolved = path.resolve(path.dirname(file), spec);
      if (!fs.existsSync(resolved)) {
        errors.push(`[导入缺失] ${rel(file)} 导入了不存在的文件 "${spec}"`);
      }
    }
  }

  // 2. 检查所有 logic.ts 保持纯函数（不引 React、不引 .tsx、不碰 DOM）
  const logicFiles = walkFiles(GAMES_DIR, (f) => /[/\\]logic\.ts$|[/\\](?:logic|lib)[/\\].+\.ts$/.test(f));
  for (const file of logicFiles) {
    const content = fs.readFileSync(file, "utf8");
    if (/from\s+["']react(-dom)?["']|\.tsx["']/.test(content)) {
      errors.push(`[纯逻辑层] ${rel(file)} 不能依赖 React 或 .tsx 组件，请保持纯函数以便 Node 直接单测`);
    }
    if (/\b(document|window\.localStorage)\b/.test(content)) {
      errors.push(`[纯逻辑层] ${rel(file)} 不能直接访问浏览器 DOM / localStorage，请放到 index.tsx 或 src/kit/ 中`);
    }
  }

  // 3. 检查 tests/*.test.mjs 不得导入 .tsx，并收集已覆盖的游戏目录
  const testFiles = walkFiles(TESTS_DIR, (f) => /\.test\.mjs$/.test(f));
  const testedGameDirs = new Set();
  for (const file of testFiles) {
    const content = fs.readFileSync(file, "utf8");
    for (const match of content.matchAll(importRe)) {
      const spec = match[1];
      if (spec.endsWith(".tsx")) {
        errors.push(`[测试边界] ${rel(file)} 导入了 JSX 文件 "${spec}"；Node 24 原生只剥离 .ts 类型，请只测 logic.ts 或 catalog/*.ts`);
      }
      const resolved = rel(path.resolve(path.dirname(file), spec));
      const m = resolved.match(/^src\/games\/([^/]+\/[^/]+)\//);
      if (m) testedGameDirs.add(m[1]);
    }
  }

  // 4. 解析 src/catalog/games.ts 注册表并核对磁盘上的所有游戏目录
  //    注册表只静态引入轻量 meta.ts，组件经 load: () => import(".../index.tsx") 懒加载
  const gamesCatalogPath = path.join(SRC_DIR, "catalog", "games.ts");
  const gamesCatalogText = fs.readFileSync(gamesCatalogPath, "utf8");
  const resolveCatalog = (spec) => path.resolve(path.dirname(gamesCatalogPath), spec);
  const metaImports = new Map(); // varName -> meta.ts
  for (const m of gamesCatalogText.matchAll(/import\s+\{\s*meta\s+as\s+([A-Za-z0-9_]+)\s*\}\s+from\s+["'](\.[^"']+)["']/g)) {
    metaImports.set(m[1], resolveCatalog(m[2]));
  }
  const arrayBody =
    gamesCatalogText.match(/export const games\s*:\s*(?:readonly\s+)?GameEntry\[\]\s*=\s*\[([\s\S]*?)\n\];/)?.[1] ?? "";
  const listed = [
    ...arrayBody.matchAll(
      /\{\s*meta:\s*([A-Za-z0-9_]+),\s*load:\s*\(\)\s*=>\s*import\(\s*["'](\.[^"']+)["']\s*\)\.then\(\(m\)\s*=>\s*m\.([A-Za-z0-9_]+)\.Play\)\s*\}/g
    )
  ].map((m) => ({ varName: m[1], entryFile: resolveCatalog(m[2]), exportName: m[3] }));
  if (listed.length !== games.length) {
    errors.push(`[注册格式] games.ts 里有 ${games.length} 个条目，但只解析出 ${listed.length} 个标准写法 { meta: x, load: () => import("…/index.tsx").then((m) => m.x.Play) }`);
  }

  const registeredDirs = new Set();
  const gameIds = new Set();
  const gamesByHall = new Map(categories.map((c) => [c.id, []]));
  let totalStars = 0;

  for (const [i, { varName, entryFile, exportName }] of listed.entries()) {
    const metaFile = metaImports.get(varName);
    const gameDir = path.dirname(entryFile);
    const dirKey = rel(gameDir).replace(/^src\/games\//, "");
    registeredDirs.add(dirKey);

    if (!metaFile || path.dirname(metaFile) !== gameDir || path.basename(metaFile) !== "meta.ts") {
      errors.push(`[注册格式] games.ts 中 ${varName} 的 meta 必须来自同目录的 ${rel(path.join(gameDir, "meta.ts"))}`);
      continue;
    }
    if (!fs.existsSync(entryFile)) continue; // 已由导入缺失规则报告
    const metaText = fs.readFileSync(metaFile, "utf8");
    if (/^\s*import\s+(?!type\b)/m.test(metaText)) {
      errors.push(`[轻量元数据] ${rel(metaFile)} 只能 import type；maxStars 请写成数字字面量，别把 logic.ts 拖进首屏包`);
    }
    const entryText = fs.readFileSync(entryFile, "utf8");
    if (!new RegExp(`export const ${exportName}\\b`).test(entryText)) {
      errors.push(`[注册格式] ${rel(entryFile)} 没有导出 games.ts 懒加载用到的 ${exportName}`);
    }
    if (!/import\s+\{\s*meta\s*\}\s+from\s+["']\.\/meta\.ts["']/.test(entryText)) {
      errors.push(`[注册格式] ${rel(entryFile)} 应 import { meta } from "./meta.ts"，保证元数据只有一份`);
    }

    const meta = games[i]?.meta;
    if (!meta || !meta.id || !metaText.includes(`id: "${meta.id}"`)) {
      errors.push(`[游戏元数据] ${rel(metaFile)} 缺少可解析的 meta.id，或与 games.ts 条目顺序不一致`);
      continue;
    }
    if (gameIds.has(meta.id)) {
      errors.push(`[重复ID] 游戏 meta.id "${meta.id}" 重复注册`);
    }
    gameIds.add(meta.id);

    const hall = categoryMap.get(meta.category);
    if (!hall) {
      errors.push(`[无效展馆] 游戏 "${meta.id}" (${rel(entryFile)}) 的 category "${meta.category}" 不在 categories.ts 中`);
      continue;
    }

    for (const field of ["title", "emoji", "tag", "blurb"]) {
      if (!meta[field]) {
        errors.push(`[游戏元数据] 游戏 "${meta.id}" (${rel(entryFile)}) 缺少 meta.${field}`);
      }
    }
    if (!(meta.maxStars > 0)) {
      errors.push(`[星星上限] 游戏 "${meta.id}" 的 maxStars 必须大于 0`);
    }

    // 检查 TopBar 的 backLabel 是否与所属大馆标题一致
    const tsxFiles = walkFiles(gameDir, (f) => f.endsWith(".tsx"));
    const combinedTsx = tsxFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
    if (!combinedTsx.includes(`backLabel="${hall.title}"`)) {
      errors.push(`[返回文案] 游戏 "${meta.id}" (${rel(entryFile)}) 归属「${hall.title}」(${hall.id})，TopBar 的 backLabel 必须设为 "${hall.title}"`);
    }
    if (FORBIDDEN_SCOLDING.test(combinedTsx)) {
      errors.push(`[儿童语气] 游戏 "${meta.id}" 出现了生硬贬损词，请改用鼓励式科学提示`);
    }

    // 检查是否有 logic.ts（或 slide 的 lib/）与单元测试覆盖
    const hasLogic =
      fs.existsSync(path.join(gameDir, "logic.ts")) ||
      fs.existsSync(path.join(gameDir, "logic")) ||
      fs.existsSync(path.join(gameDir, "lib"));
    if (!hasLogic) {
      errors.push(`[缺少逻辑层] 游戏 "${meta.id}" (${rel(gameDir)}) 缺少 logic.ts`);
    }
    if (!testedGameDirs.has(dirKey)) {
      errors.push(`[缺少单测] 游戏 "${meta.id}" (${rel(gameDir)}) 的 logic.ts 尚未被 tests/*.test.mjs 导入测试`);
    }

    gamesByHall.get(hall.id).push(meta);
    totalStars += meta.maxStars;
  }

  // 检查磁盘上是否有未注册进 games.ts 的孤立游戏目录
  for (const catDir of fs.readdirSync(GAMES_DIR, { withFileTypes: true })) {
    if (!catDir.isDirectory()) continue;
    for (const gDir of fs.readdirSync(path.join(GAMES_DIR, catDir.name), { withFileTypes: true })) {
      if (!gDir.isDirectory()) continue;
      const dirKey = `${catDir.name}/${gDir.name}`;
      if (!registeredDirs.has(dirKey)) {
        errors.push(`[漏注册] 目录 src/games/${dirKey} 未在 src/catalog/games.ts 中导出到 games 数组`);
      }
    }
  }

  // 5. 检查各大馆容量、门类对话、问答、百宝箱完整性
  if (hubChats.length < 3) {
    errors.push(`[首页对话] hubChats 至少保留 3 组开场对话`);
  }

  const seenTalkTitles = new Set();
  for (const talk of scienceTalks) {
    if (!categoryMap.has(talk.category)) {
      errors.push(`[问答分类]「${talk.title}」的 category "${talk.category}" 无效`);
    }
    if (seenTalkTitles.has(talk.title)) {
      errors.push(`[重复问答] 科学问答标题重复：「${talk.title}」`);
    }
    seenTalkTitles.add(talk.title);
    if (!talk.turns || talk.turns.length < 2) {
      errors.push(`[问答轮数]「${talk.title}」至少需要 2 轮小念与爸爸的对话`);
    }
    for (const turn of talk.turns ?? []) {
      if (!turn.nian?.trim() || !turn.dad?.trim()) {
        errors.push(`[问答空行]「${talk.title}」存在空白的小念或爸爸台词`);
      }
      if (FORBIDDEN_SCOLDING.test(`${turn.nian}${turn.dad}${talk.wrap}`)) {
        errors.push(`[问答语气]「${talk.title}」含有不适合儿童的贬损词`);
      }
    }
    if (!talk.wrap?.trim()) {
      errors.push(`[问答总结]「${talk.title}」缺少小念的一句话收获 wrap`);
    }
  }

  const seenWikiIds = new Set();
  for (const card of scienceWiki) {
    if (seenWikiIds.has(card.id)) {
      errors.push(`[重复百科卡] scienceWiki id "${card.id}" 重复`);
    }
    seenWikiIds.add(card.id);
    if (!categoryMap.has(card.category)) {
      errors.push(`[百科分类] 百科卡 "${card.id}" 的 category "${card.category}" 无效`);
    }
    if (!card.homeLab?.trim().startsWith("🏠")) {
      errors.push(`[居家实验] 百科卡 "${card.id}" 的 homeLab 建议以 "🏠 居家小实验：" 开头`);
    }
    if (!gameIds.has(card.relatedGameId)) {
      errors.push(`[断链百科卡] 百科卡 "${card.id}" 的 relatedGameId "${card.relatedGameId}" 未指向已注册游戏`);
    }
  }

  for (const hall of categories) {
    const hallGames = gamesByHall.get(hall.id) ?? [];
    if (hallGames.length < 4) {
      errors.push(`[展馆容量]「${hall.title}」(${hall.id}) 当前只有 ${hallGames.length} 款游戏，至少需要 4 款`);
    }
    const chats = categoryChats[hall.id];
    if (!chats || chats.length < 1) {
      errors.push(`[展馆对话]「${hall.title}」(${hall.id}) 在 categoryChats 中缺少门类对话`);
    }
    const hallTalks = scienceTalks.filter((t) => t.category === hall.id);
    if (hallTalks.length < 3) {
      errors.push(`[展馆问答]「${hall.title}」(${hall.id}) 在 scienceTalks 中只有 ${hallTalks.length} 条问答，至少需要 3 条`);
    }
    const hallWiki = scienceWiki.filter((w) => w.category === hall.id);
    if (hallWiki.length < 3) {
      errors.push(`[展馆百科]「${hall.title}」(${hall.id}) 在 scienceWiki 中只有 ${hallWiki.length} 张卡片，至少需要 3 张`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    stats: {
      halls: categories.length,
      games: listed.length,
      totalStars,
      talks: scienceTalks.length,
      wiki: scienceWiki.length,
      byHall: categories.map((c) => ({
        id: c.id,
        emoji: c.emoji,
        title: c.title,
        games: (gamesByHall.get(c.id) ?? []).length,
        talks: scienceTalks.filter((t) => t.category === c.id).length,
        wiki: scienceWiki.filter((w) => w.category === c.id).length
      }))
    }
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const quiet = process.argv.includes("--quiet");
  const result = checkAllRules();
  if (!result.ok) {
    console.error(`\n❌ 发现 ${result.errors.length} 处规则问题：\n`);
    for (const err of result.errors) console.error(`  • ${err}`);
    process.exit(1);
  }
  if (!quiet) {
    const { stats } = result;
    console.log(
      `✅ 规则检查全部通过：${stats.halls} 大展馆 · ${stats.games} 款实验 · ${stats.totalStars} 颗星 · ${stats.talks} 组问答 · ${stats.wiki} 张大师卡\n`
    );
    for (const h of stats.byHall) {
      console.log(
        `  ${h.emoji} ${h.title} (${h.id.padEnd(12)})  🎮 ${String(h.games).padStart(2)} 款  💬 ${h.talks} 问  📚 ${h.wiki} 卡`
      );
    }
  }
}
