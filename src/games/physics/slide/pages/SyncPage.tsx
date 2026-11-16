import { useMemo, useState } from "react";
import { Says, TopBar, type Settings } from "../../../../kit/Chrome.tsx";
import { TrackCanvas } from "../components/TrackCanvas.tsx";
import { syncCurve, syncEnd, syncStart } from "../data/demos.ts";
import { useClock } from "../../../../kit/useClock.ts";
import { G, boundsAround, poseAt, slideMotion } from "../lib/slide.ts";

const colors = ["#ff6b6b", "#e0a800", "#4d96ff", "#3aaa5a"];

export function SyncPage({ settings, onBack }: { settings: Settings; onBack: () => void }) {
  const points = useMemo(() => syncCurve(), []);
  const motions = useMemo(() => {
    const n = points.length - 1;
    return [0, 0.22, 0.48, 0.72].map((u) => slideMotion(points, { from: Math.round(n * u) }));
  }, [points]);
  const [nonce, setNonce] = useState(1);
  const duration = Math.max(...motions.map((m) => m.time));
  const clock = useClock(nonce, duration);
  const arrived = motions.every((m) => clock >= m.time - 0.02);
  const expect = Math.PI * Math.sqrt(1 / G);

  return (
    <div className="page">
      <TopBar emoji="⏱️" title="一起到达" onBack={onBack} settings={settings} />
      <Says who="dad">四个小球从不同的高度同时松手。沿着摆线，它们会一起到达最低点。</Says>
      <TrackCanvas
        label="四个小球沿着摆线滑向谷底"
        bounds={boundsAround([points], 0.45, 0.4)}
        flag={syncEnd}
        dock={syncStart}
        tracks={[{ points, color: "#ef7d3c", wood: true, width: 10 }]}
        beads={motions.map((motion, i) => {
          const p = poseAt(motion, clock);
          return { x: p.x, y: p.y, color: colors[i] };
        })}
      />
      <ol className="legend">
        {motions.map((motion, i) => (
          <li key={colors[i]}>
            <i style={{ background: colors[i] }} />
            小球 {i + 1}
            <b>{clock >= motion.time ? `${motion.time.toFixed(2)} 秒` : "滑行中"}</b>
          </li>
        ))}
      </ol>
      {arrived && <p className="banner">一起到了！都是大约 {expect.toFixed(2)} 秒。换个高度出发，时间也不变。</p>}
      <button type="button" className="primary" onClick={() => setNonce((n) => n + 1)}>再放一次</button>
      <p className="note">惠更斯用这个性质做钟摆：只要走摆线，摆得高一点、低一点，一个来回的时间都一样。</p>
    </div>
  );
}
