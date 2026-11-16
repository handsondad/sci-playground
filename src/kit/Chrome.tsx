import type { ReactNode } from "react";
import { Avatar } from "./Avatar.tsx";
import { isSpeaking, say, stopSpeaking, useSpeaking, type Line, type Who } from "./speech.ts";

export type Settings = { sound: boolean; setSound: (on: boolean) => void };

export const starRow = (count: number, of = 3) => "⭐".repeat(Math.max(0, count)) + "☆".repeat(Math.max(0, of - Math.max(0, count)));

export function SpeakButton({ who, text, label }: { who: Who; text: string; label?: string }) {
  const speaking = isSpeaking(useSpeaking(), who, text);
  const name = who === "nian" ? "小念" : "爸爸";
  return (
    <button
      type="button"
      className={`speak-btn${speaking ? " is-speaking" : ""}`}
      aria-label={label ?? `听${name}读：${text}`}
      onClick={() => say({ who, text })}
    >
      🔊
    </button>
  );
}

export function TopBar({ emoji, title, onBack, backLabel = "回到科学馆", stars, maxStars, settings }: {
  emoji: string;
  title: string;
  onBack: () => void;
  backLabel?: string;
  stars?: number;
  maxStars?: number;
  settings: Settings;
}) {
  const { sound, setSound } = settings;
  return (
    <header className="topbar">
      <button type="button" className="pill-btn" onClick={onBack}>← {backLabel}</button>
      <h1><span aria-hidden="true">{emoji}</span> {title}</h1>
      <div className="topbar-tools">
        {typeof stars === "number" && typeof maxStars === "number" && maxStars > 0 && (
          <span className="star-chip" aria-label={`已拿 ${stars} 颗星，共 ${maxStars} 颗星`}>
            ⭐ {stars} / {maxStars}
          </span>
        )}
        <button
          type="button"
          className="pill-btn sound-btn"
          aria-pressed={sound}
          aria-label={sound ? "音效与自动朗读：开" : "音效与自动朗读：关"}
          title={sound ? "小念和爸爸会自动说话，带过关音效" : "静音模式（点气泡上的 🔊 仍可单句听）"}
          onClick={() => {
            if (sound) stopSpeaking();
            setSound(!sound);
          }}
        >
          {sound ? "🔊 声音" : "🔇 静音"}
        </button>
      </div>
    </header>
  );
}

function plainTextOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainTextOf).join("");
  return "";
}

export function Says({ who, text, children }: { who: Who; text?: string; children?: ReactNode }) {
  const body = children ?? text;
  const spoken = text ?? plainTextOf(children);
  const speaking = spoken ? isSpeaking(useSpeaking(), who, spoken) : false;
  const name = who === "nian" ? "小念" : "爸爸";
  return (
    <div className={`says is-${who}${speaking ? " is-speaking" : ""}`}>
      <span className="says-avatar"><Avatar who={who} /></span>
      <div className="says-bubble">
        <b>
          {name}说 {spoken && <SpeakButton who={who} text={spoken} label={`听${name}说`} />}
        </b>
        <p>{body}</p>
      </div>
    </div>
  );
}

export function DadSays({ text, children }: { text?: string; children?: ReactNode }) {
  return <Says who="dad" text={text}>{children}</Says>;
}

export function NianSays({ text, children }: { text?: string; children?: ReactNode }) {
  return <Says who="nian" text={text}>{children}</Says>;
}

/** 小念和爸爸一句接一句聊；传 playLabel 时显示「从头听一遍」按钮。 */
export function Chat({ lines, playLabel }: { lines: readonly Line[]; playLabel?: string }) {
  const speaking = useSpeaking();
  const playing = lines.some((line) => isSpeaking(speaking, line.who, line.text));
  return (
    <div className="chat">
      {playLabel && (
        <button
          type="button"
          className={`pill-btn chat-play${playing ? " is-speaking" : ""}`}
          onClick={() => say(...lines)}
        >
          {playing ? "🔊" : "▶"} {playLabel}
        </button>
      )}
      {lines.map((line, i) => <Says key={i} who={line.who}>{line.text}</Says>)}
    </div>
  );
}
