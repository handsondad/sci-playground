let tones: AudioContext | null = null;

export function chime(right: boolean) {
  try {
    tones ??= new AudioContext();
    const now = tones.currentTime;
    const notes = right ? [523, 659, 784] : [196];
    notes.forEach((frequency, i) => {
      const osc = tones!.createOscillator();
      const gain = tones!.createGain();
      osc.type = right ? "triangle" : "sine";
      osc.frequency.value = frequency;
      const start = now + i * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain).connect(tones!.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    // 没有 WebAudio 就安静地过去
  }
}
