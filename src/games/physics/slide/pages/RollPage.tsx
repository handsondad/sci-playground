import { useEffect, useState } from "react";
import { Says, TopBar, type Settings } from "../../../../kit/Chrome.tsx";
import { TrackCanvas } from "../components/TrackCanvas.tsx";
import { rollEnd, rollStart } from "../data/demos.ts";
import { cycloid, rollerFrame } from "../lib/slide.ts";

export function RollPage({ settings, onBack, onRace }: { settings: Settings; onBack: () => void; onRace: () => void }) {
  const full = rollerFrame(rollStart, rollEnd, 1);
  const [u, setU] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setU((value) => {
        const next = value + dt / 5;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const frame = rollerFrame(rollStart, rollEnd, reduce && u === 0 && !playing ? 1 : u);
  const trail = cycloid(rollStart, rollEnd, 160).filter((p) => p.x <= frame.dot.x + 0.02);
  const bounds = {
    minX: rollStart.x - full.r - 0.3,
    maxX: Math.max(rollEnd.x, full.center.x + full.r) + 0.35,
    minY: full.center.y - full.r - 0.35,
    maxY: rollStart.y + 0.55
  };

  return (
    <div className="page">
      <TopBar emoji="🎡" title="天花板上的圆" onBack={onBack} settings={settings} />
      <Says who="dad">圆贴着天花板往右滚，边缘这个红点画出的曲线叫摆线。小球沿着它滑，比沿着直线还快。</Says>
      <TrackCanvas
        label="圆贴着天花板滚动，红点画出摆线"
        bounds={bounds}
        ceiling={rollStart.y}
        tracks={[{ points: trail.length > 1 ? trail : [rollStart, frame.dot], color: "#ef7d3c", wood: true, width: 10 }]}
        roller={{ center: frame.center, r: frame.r, dot: frame.dot, ceilingY: frame.ceilingY }}
        flag={rollEnd}
        dock={rollStart}
      />
      <label className="scrub">
        <span>滚到哪了</span>
        <input type="range" min={0} max={1000} value={Math.round(u * 1000)} aria-valuetext={`${Math.round(u * 100)}%`}
          onChange={(e) => { setPlaying(false); setU(Number(e.target.value) / 1000); }} />
      </label>
      <div className="row">
        <button type="button" className="primary" onClick={() => { setU(0); setPlaying(true); }}>再滚一次</button>
        <button type="button" className="pill" onClick={onRace}>拿去和直线比一比 →</button>
      </div>
      <p className="note">拼波大冒险里，圆是套在一起转的。这里的圆不悬在空中，它贴着一条直线滚。</p>
    </div>
  );
}
