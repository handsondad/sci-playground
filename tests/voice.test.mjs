import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { collectVoiceLines } from "../tools/voice/collect.mjs";
import { voices } from "../tools/voice/voices.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("voice config matches the unified 小念 & 爸爸 neural voice standard", () => {
  assert.deepEqual(voices.nian, { voice: "zh-CN-YunxiaNeural", rate: "+0%" });
  assert.deepEqual(voices.dad, { voice: "zh-CN-YunxiNeural", rate: "-5%" });
});

test("every static spoken line in the museum has a pre-generated MP3 clip", async () => {
  const manifestPath = path.join(ROOT, "src/catalog/voice-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const lines = await collectVoiceLines();
  assert.ok(lines.length >= 1000, `expected >= 1000 spoken lines, got ${lines.length}`);

  const missing = [];
  for (const { who, text } of lines) {
    const entry = manifest.clips[`${who}|${text}`];
    if (!entry) {
      missing.push(`${who}: ${text.slice(0, 30)}`);
      continue;
    }
    const mp3 = path.join(ROOT, "public/voice", `${entry.file}.mp3`);
    if (!fs.existsSync(mp3) || fs.statSync(mp3).size < 200) {
      missing.push(`missing-mp3(${entry.file}): ${text.slice(0, 30)}`);
    }
  }
  assert.equal(
    missing.length,
    0,
    `Missing ${missing.length} voice clips (run 'npm run voice'):\n${missing.slice(0, 10).join("\n")}`
  );
});
