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
