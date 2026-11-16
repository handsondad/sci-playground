import { useSyncExternalStore } from "react";
import manifest from "../catalog/voice-manifest.json";

export type Who = "nian" | "dad";
export type Line = { who: Who; text: string };
export type Pair = readonly [nian: string, dad: string];

export const nian = (text: string): Line => ({ who: "nian", text });
export const dad = (text: string): Line => ({ who: "dad", text });
export const pairLines = ([n, d]: Pair): Line[] => [nian(n), dad(d)];

const clips = (manifest as { clips: Record<string, { file: string; seconds: number }> }).clips;
const base = import.meta.env.BASE_URL;

export const hasClip = (who: Who, text: string) => Boolean(clips[`${who}|${text.trim()}`]);

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

function play(who: Who, rawText: string, token: number): Promise<void> {
  const text = rawText.trim();
  const clip = clips[`${who}|${text}`];
  if (!clip) return synth(who, text, token);
  return new Promise((resolve) => {
    if (token !== run) return resolve();
    audio = new Audio(`${base}voice/${clip.file}.mp3`);
    audio.onended = () => resolve();
    audio.onerror = () => synth(who, text, token).then(resolve);
    audio.onpause = () => resolve();
    audio.play().catch(() => resolve());
  });
}

/** 小念和爸爸一句接一句地说；再调一次会打断上一段。 */
export async function say(...lines: Line[]) {
  stopSpeaking();
  const token = run;
  for (const line of lines) {
    if (token !== run) return;
    setSpeaking(line);
    await play(line.who, line.text, token);
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
