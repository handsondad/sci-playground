#!/usr/bin/env node
// 用 edge-tts 给全馆台词生成小念（zh-CN-YunxiaNeural）和爸爸（zh-CN-YunxiNeural）的统一配音，
// 写到 public/voice/<nian|dad>/<指纹>.mp3，完整清单记在 src/catalog/voice-manifest.json（仅工具与测试使用），
// 同时生成前端用的精简指纹表 src/catalog/voice-clips.ts（浏览器现算 SHA-1 指纹判断有无预录音频）。
// 只生成新增或改过的句子，支持随时中断续跑：
//   npm run voice
//   node tools/voice/generate.mjs --dry-run
// 依赖：python -m pip install edge-tts，以及 PATH 中的 ffmpeg / ffprobe。
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collectVoiceLines } from "./collect.mjs";
import { clipHash, renderClipIndex, voices } from "./voices.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = join(root, "src", "catalog", "voice-manifest.json");
const clipIndexPath = join(root, "src", "catalog", "voice-clips.ts");
const voiceDir = join(root, "public", "voice");
const parallel = 8;
const dryRun = process.argv.includes("--dry-run");

/** 保留原始文本作为 manifest 键与哈希输入，仅在喂给 edge-tts 时剔除纯装饰 emoji，避免读出“房子/灯泡”。 */
function cleanForTts(text) {
  return text.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, " ").replace(/\s+/g, " ").trim();
}

function run(command, args) {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", (chunk) => { err += chunk; });
    child.on("error", fail);
    child.on("close", (code) =>
      code === 0 ? done(out) : fail(new Error(`${command} 退出码 ${code}: ${err.slice(-400)}`))
    );
  });
}

const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : { voices, clips: {} };

function save() {
  const sorted = Object.fromEntries(
    Object.entries(manifest.clips).sort(([a], [b]) => a.localeCompare(b))
  );
  writeAtomic(manifestPath, `${JSON.stringify({ voices, clips: sorted }, null, 1)}\n`);
  writeAtomic(clipIndexPath, renderClipIndex(manifest.clips));
}

function writeAtomic(path, content) {
  writeFileSync(`${path}.tmp`, content);
  for (let attempt = 1; ; attempt += 1) {
    try {
      renameSync(`${path}.tmp`, path);
      return;
    } catch (error) {
      if (attempt >= 20 || !["EPERM", "EBUSY", "EACCES"].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
}

const lines = await collectVoiceLines();
const wanted = new Map(
  lines.map(({ who, text }) => [`${who}|${text}`, { who, text, file: `${who}/${clipHash(who, text)}` }])
);

if (dryRun) {
  const nianCount = lines.filter((l) => l.who === "nian").length;
  const dadCount = lines.filter((l) => l.who === "dad").length;
  console.log(`🎙️ 共收集到 ${lines.length} 句不重复配音（小念 ${nianCount} 句，爸爸 ${dadCount} 句）`);
  process.exit(0);
}

for (const [key, clip] of Object.entries(manifest.clips)) {
  if (wanted.get(key)?.file === clip.file) continue;
  delete manifest.clips[key];
  rmSync(join(voiceDir, `${clip.file}.mp3`), { force: true });
}

const todo = [...wanted].filter(
  ([key, clip]) => !manifest.clips[key] || !existsSync(join(voiceDir, `${clip.file}.mp3`))
);
console.log(`🎙️ 需要配音 ${todo.length} 句（全馆共 ${wanted.size} 句）`);

const scratch = join(tmpdir(), "sci-playground-voice");
mkdirSync(scratch, { recursive: true });

async function make(key, { who, text, file }) {
  const { voice, rate } = voices[who];
  const raw = join(scratch, `${file.replace("/", "_")}.raw.mp3`);
  const out = join(voiceDir, `${file}.mp3`);
  mkdirSync(dirname(out), { recursive: true });

  const spoken = cleanForTts(text) || text;
  for (let attempt = 1; ; attempt += 1) {
    try {
      await run("python", [
        "-m",
        "edge_tts",
        "--voice",
        voice,
        `--rate=${rate}`,
        "--text",
        spoken,
        "--write-media",
        raw
      ]);
      break;
    } catch (error) {
      if (attempt >= 4) throw error;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }

  await run("ffmpeg", ["-y", "-v", "error", "-i", raw, "-ac", "1", "-ar", "24000", "-b:a", "32k", out]);
  rmSync(raw, { force: true });
  const seconds = Number(
    (await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out])).trim()
  );
  manifest.clips[key] = { file, seconds: Math.round(seconds * 100) / 100 };
}

let done = 0;
let failed = 0;
const queue = [...todo];

await Promise.all(
  Array.from({ length: parallel }, async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const [key, clip] = item;
      try {
        await make(key, clip);
        done += 1;
        if (done % 25 === 0 || done === todo.length) {
          save();
          console.log(`  进度 ${done}/${todo.length}`);
        }
      } catch (error) {
        failed += 1;
        console.error(`✖ ${key}: ${error.message}`);
      }
    }
  })
);
save();
console.log(failed ? `⚠️ 完成 ${done} 句，失败 ${failed} 句（再跑一次 npm run voice 会只补失败项）` : `✅ 配音全部完成：新增 ${done} 句，总计 ${wanted.size} 句`);
process.exitCode = failed ? 1 : 0;
