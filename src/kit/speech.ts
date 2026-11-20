import { useSyncExternalStore } from "react";
import { voiceClips, voiceProfiles } from "../catalog/voice-clips.ts";
import { sha1Hex } from "./voice-key.ts";

export type Who = "nian" | "dad";
export type Line = { who: Who; text: string };
export type Pair = readonly [nian: string, dad: string];

export const nian = (text: string): Line => ({ who: "nian", text });
export const dad = (text: string): Line => ({ who: "dad", text });
export const pairLines = ([n, d]: Pair): Line[] => [nian(n), dad(d)];

const base = import.meta.env.BASE_URL;

/** 与 tools/voice/voices.mjs 的 clipHash 同一算法：sha1("音色|语速|台词") 取前 12 位。 */
function clipUrl(who: Who, rawText: string): string | null {
  const hash = sha1Hex(`${voiceProfiles[who]}|${rawText.trim()}`).slice(0, 12);
  return voiceClips[who].has(hash) ? `${base}voice/${who}/${hash}.mp3` : null;
}

export const hasClip = (who: Who, text: string) => clipUrl(who, text) !== null;

const canSynth = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** 动态拼接且尚未预生成 MP3 的句子回退到浏览器语音，优先选用同款 Yunxia / Yunxi 神经网络音色。 */
function synth(who: Who, text: string, token: number): Promise<void> {
  return new Promise((resolve) => {
    if (!canSynth() || token !== run) return resolve();
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      const list = window.speechSynthesis.getVoices();
      const preferred =
        who === "nian"
          ? list.find((v) => /Yunxia/i.test(v.name))
          : list.find((v) => /Yunxi/i.test(v.name));
      const zhVoice =
        preferred ??
        list.find((item) => /^zh[-_]CN/i.test(item.lang)) ??
        list.find((item) => /^zh/i.test(item.lang));
      if (zhVoice) utterance.voice = zhVoice;
      utterance.rate = preferred ? (who === "dad" ? 0.95 : 1) : 0.98;
      utterance.pitch = preferred ? 1 : who === "nian" ? 1.45 : 0.9;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

let audio: HTMLAudioElement | null = null;
let run = 0;
let speaking: Line | null = null;
const listeners = new Set<() => void>();

function setSpeaking(line: Line | null) {
  speaking = line;
  listeners.forEach((listener) => listener());
}

/** 有预录 MP3 的句子提前建好 Audio 开始缓冲，播放上一句时下一句就在下载了。 */
function prepare(line: Line): HTMLAudioElement | null {
  const url = clipUrl(line.who, line.text);
  if (!url) return null;
  const element = new Audio(url);
  element.preload = "auto";
  return element;
}

function play(line: Line, element: HTMLAudioElement | null, token: number): Promise<void> {
  const text = line.text.trim();
  if (!element) return synth(line.who, text, token);
  return new Promise((resolve) => {
    if (token !== run) return resolve();
    audio = element;
    audio.onended = () => resolve();
    audio.onerror = () => synth(line.who, text, token).then(resolve);
    audio.onpause = () => resolve();
    audio.play().catch(() => resolve());
  });
}

/** 小念和爸爸一句接一句地说；再调一次会打断上一段。 */
export async function say(...lines: Line[]) {
  stopSpeaking();
  const token = run;
  let upcoming = lines.length > 0 ? prepare(lines[0]) : null;
  for (let i = 0; i < lines.length; i++) {
    if (token !== run) return;
    const current = upcoming;
    upcoming = i + 1 < lines.length ? prepare(lines[i + 1]) : null;
    setSpeaking(lines[i]);
    await play(lines[i], current, token);
  }
  if (token === run) setSpeaking(null);
}

export function stopSpeaking() {
  run += 1;
  if (audio) {
    audio.pause();
    audio = null;
  }
  if (canSynth()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
  if (speaking) setSpeaking(null);
}

export function useSpeaking(): Line | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => speaking,
    () => null
  );
}

export const isSpeaking = (line: Line | null, who: Who, text: string) =>
  line?.who === who && line.text === text;
