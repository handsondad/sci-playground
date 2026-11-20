// 小念和爸爸的统一配音设置（与 fourier-puzzle-game、bodyverse、measure-quest 完全一致）。
// 改了这里或改了台词后，运行 `npm run voice` 增量补齐音频。
import { createHash } from "node:crypto";

export const voices = {
  nian: { voice: "zh-CN-YunxiaNeural", rate: "+0%" },
  dad: { voice: "zh-CN-YunxiNeural", rate: "-5%" }
};

/** 同一个角色读同一句话，指纹固定不变；文字或音色一改，旧音频自动淘汰更新。 */
export function clipHash(who, text) {
  const { voice, rate } = voices[who];
  return createHash("sha1").update(`${voice}|${rate}|${text}`).digest("hex").slice(0, 12);
}

/** 生成前端精简指纹表 src/catalog/voice-clips.ts：只含音色配置与已录好的指纹，不含台词原文。 */
export function renderClipIndex(clips) {
  const byWho = Object.fromEntries(Object.keys(voices).map((who) => [who, []]));
  for (const { file } of Object.values(clips)) {
    const [who, hash] = file.split("/");
    byWho[who].push(hash);
  }
  const profiles = Object.entries(voices)
    .map(([who, { voice, rate }]) => `  ${who}: ${JSON.stringify(`${voice}|${rate}`)}`)
    .join(",\n");
  const sets = Object.entries(byWho)
    .map(([who, hashes]) => `  ${who}: new Set<string>([\n${hashes.sort().map((h) => `    "${h}"`).join(",\n")}\n  ])`)
    .join(",\n");
  return `// 由 \`npm run voice\` 根据 voice-manifest.json 自动生成，请勿手改。
// 前端用 sha1("音色|语速|台词") 的前 12 位现算文件名（见 src/kit/voice-key.ts），这里只记录哪些指纹已录好 MP3。
export const voiceProfiles = {
${profiles}
} as const;

export const voiceClips: Record<keyof typeof voiceProfiles, ReadonlySet<string>> = {
${sets}
};
`;
}
