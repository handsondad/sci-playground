import { useSyncExternalStore } from "react";

export type Who = "nian" | "dad";
export type Line = { who: Who; text: string };
export type Pair = readonly [nian: string, dad: string];

export const nian = (text: string): Line => ({ who: "nian", text });
export const dad = (text: string): Line => ({ who: "dad", text });
export const pairLines = ([n, d]: Pair): Line[] => [nian(n), dad(d)];

const canSynth = () => typeof window !== "undefined" && "speechSynthesis" in window;

function synth(who: Who, text: string, token: number): Promise<void> {
  return new Promise((resolve) => {
    if (!canSynth() || token !== run) return resolve();
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find((item) => /^zh[-_]CN/i.test(item.lang)) ?? voices.find((item) => /^zh/i.test(item.lang));
      if (zhVoice) utterance.voice = zhVoice;
      utterance.rate = 0.98;
      utterance.pitch = who === "nian" ? 1.45 : 0.9;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

let run = 0;
let speaking: Line | null = null;
const listeners = new Set<() => void>();

function setSpeaking(line: Line | null) {
  speaking = line;
  listeners.forEach((listener) => listener());
}

/** 小念和爸爸一句接一句地说；再调一次会打断上一段。 */
export async function say(...lines: Line[]) {
  stopSpeaking();
  const token = run;
  for (const line of lines) {
    if (token !== run) return;
    setSpeaking(line);
    await synth(line.who, line.text, token);
  }
  if (token === run) setSpeaking(null);
}

export function stopSpeaking() {
  run += 1;
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
