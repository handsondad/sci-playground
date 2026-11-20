import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, degrees, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, say } from "../../../kit/speech.ts";
import { matchScore, sampleWave, waveLevels, type Harmonic } from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#ff7a45";

function playTimbre(harmonics: readonly Harmonic[]) {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const totalAmp = Math.max(0.5, harmonics.reduce((s, h) => s + h.amp, 0));
    for (const h of harmonics) {
      if (h.amp <= 0.02) continue;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 261.63 * h.freq; // C4 fundamental + harmonics
      const peak = (h.amp / totalAmp) * 0.22;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.75);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.78);
    }
    window.setTimeout(() => { void ctx.close(); }, 900);
  } catch {
    // Ignore WebAudio restrictions
  }
}

function toSvgPath(samples: readonly number[], width = 600, height = 210, scale = 58): string {
  const midY = height / 2;
  return samples
    .map((y, idx) => {
      const px = (idx / (samples.length - 1)) * width;
      const py = midY - y * scale;
      return `${idx === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
}

export function WavesGame({ exit, sound, setSound }: GameProps) {
  const [levelId, setLevelId] = useState(waveLevels[0].id);
  const starMap = useGameStars("waves");
  const level = waveLevels.find((l) => l.id === levelId) ?? waveLevels[0];

  const [harmonics, setHarmonics] = useState<Harmonic[]>(() =>
    level.channels.map((c) => ({ freq: c.freq, amp: c.startAmp, phase: c.startPhase }))
  );
  const [wonStars, setWonStars] = useState(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  function load(id: number) {
    const nextLevel = waveLevels.find((l) => l.id === id) ?? waveLevels[0];
    setLevelId(nextLevel.id);
    setHarmonics(nextLevel.channels.map((c) => ({ freq: c.freq, amp: c.startAmp, phase: c.startPhase })));
    setWonStars(0);
    setShowHint(false);
  }

  const targetSamples = useMemo(() => sampleWave(level.target), [level]);
  const yourSamples = useMemo(() => sampleWave(harmonics), [harmonics]);
  const pct = matchScore(yourSamples, targetSamples);
  const next = waveLevels.find((l) => l.id > level.id);

  function updateChannel(idx: number, patch: Partial<Harmonic>) {
    const nextH = harmonics.map((h, i) => (i === idx ? { ...h, ...patch } : h));
    setHarmonics(nextH);
    const nextPct = matchScore(sampleWave(nextH), targetSamples);
    if (nextPct >= level.goal) {
      const raw = nextPct >= 97 ? 3 : nextPct >= 93 ? 2 : 1;
      const earned = showHint ? Math.min(raw, 2) : Math.max(raw, 2);
      if (earned > wonStars) {
        setWonStars(earned);
        recordStars("waves", String(level.id), earned);
        if (sound) {
          chime(true);
          say(dad(level.win));
        }
      }
    }
  }

  return (
    <div className="page">
      <TopBar
        emoji="🌊"
        title="拼波实验室 · 泛音与傅里叶"
        onBack={exit}
        backLabel="声光电磁馆"
        stars={sumStars(starMap)}
        maxStars={waveLevels.length * 3}
        settings={{ sound, setSound }}
      />

      <StageStrip
        stages={waveLevels.map((l) => ({ id: l.id, title: `${l.id}. ${l.title}`, stars: starMap[String(l.id)] ?? 0 }))}
        activeId={level.id}
        accent={ACCENT}
        onSelect={load}
      />

      <DadSays text={`第 ${level.id} 关「${level.title}」：${level.story}`} />

      <div className="card">
        <Meter pct={pct} goal={level.goal} label="波形重合度" />

        <svg className="wave-plot" viewBox="0 0 600 210" style={{ marginTop: 12 }} role="img" aria-label={`波形重合度 ${pct}%`}>
          <line x1="0" y1="105" x2="600" y2="105" stroke="#e2ebf6" strokeWidth="1.5" />

          {/* Individual component waves (thin translucent) */}
          {harmonics.length > 1 &&
            harmonics.map((h, idx) => (
              <path
                key={h.freq}
                d={toSvgPath(sampleWave([h]))}
                stroke={level.channels[idx].color}
                strokeWidth="1.8"
                strokeOpacity="0.4"
              />
            ))}

          {/* Target green dashed wave */}
          <path d={toSvgPath(targetSamples)} stroke="#3bb273" strokeWidth="4" strokeDasharray="8 6" />

          {/* Combined player wave */}
          <path d={toSvgPath(yourSamples)} stroke="#ff9f43" strokeWidth="4.5" />
        </svg>

        <div className="wave-legend">
          <span><i style={{ background: "#3bb273" }} /> 目标波形（绿虚线）</span>
          <span><i style={{ background: "#ff9f43" }} /> 你拼出的合波（橙实线）</span>
          {harmonics.length > 1 && <span>细彩线：各分波零件</span>}
        </div>
      </div>

      <div className="channels">
        {level.channels.map((ch, idx) => {
          const h = harmonics[idx];
          return (
            <div key={ch.freq} className="channel" style={{ "--c": ch.color } as CSSProperties}>
              <div className="channel-head">
                <span className="channel-dot" />
                <strong>{ch.label}（频率 ×{ch.freq}）</strong>
              </div>
              <Slider
                label="高矮（振幅）"
                value={h.amp}
                min={0}
                max={1.5}
                step={0.05}
                color={ch.color}
                format={fixed(2)}
                onChange={(v) => updateChannel(idx, { amp: v })}
              />
              {!level.lockPhase && (
                <Slider
                  label="起步（相位）"
                  value={h.phase}
                  min={0}
                  max={360}
                  step={15}
                  wrap
                  color={ch.color}
                  format={degrees}
                  onChange={(v) => updateChannel(idx, { phase: v })}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="play-actions">
        <button type="button" className="primary-btn is-blue" onClick={() => playTimbre(harmonics)}>
          🎵 听听你拼出的音色
        </button>
        <button type="button" className="pill-btn" onClick={() => playTimbre(level.target)}>
          👂 听目标音色
        </button>
        <button type="button" className="pill-btn" onClick={() => load(level.id)}>
          🔄 重置滑块
        </button>
        <button type="button" className="pill-btn" aria-pressed={showHint} onClick={() => setShowHint((v) => !v)}>
          💡 拼波提示
        </button>
      </div>

      {showHint && <HintBox text={level.hint} />}

      {wonStars > 0 && (
        <WinCard
          stars={wonStars}
          verdict={`重合度 ${pct}%！成功破译这组波的配方！`}
          dadLine={level.win}
          onRetry={() => load(level.id)}
          onNext={next ? () => load(next.id) : exit}
          nextLabel={next ? `下一关：${next.title} →` : "回物理馆 →"}
        />
      )}
    </div>
  );
}

export const waves = { meta, Play: WavesGame };
