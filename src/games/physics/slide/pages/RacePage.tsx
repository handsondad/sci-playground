import { useMemo, useState } from "react";
import { Says, TopBar, type Settings } from "../../../../kit/Chrome.tsx";
import { TrackCanvas } from "../components/TrackCanvas.tsx";
import { raceTracks } from "../data/demos.ts";
import { useClock } from "../../../../kit/useClock.ts";
import { boundsAround, poseAt, slideMotion } from "../lib/slide.ts";

const lanes = [
  { key: "straight", name: "直线", color: "#9aa0a6" },
  { key: "curve", name: "拱桥", color: "#4d96ff" },
  { key: "cycloid", name: "摆线", color: "#ff6b6b" }
] as const;

export function RacePage({ settings, onBack }: { settings: Settings; onBack: () => void }) {
  const tracks = useMemo(() => raceTracks(), []);
  const motions = useMemo(() => ({
    straight: slideMotion(tracks.straight),
    curve: slideMotion(tracks.curve),
    cycloid: slideMotion(tracks.cycloid)
  }), [tracks]);
  const [nonce, setNonce] = useState(1);
  const duration = Math.max(motions.straight.time, motions.curve.time, motions.cycloid.time);
  const clock = useClock(nonce, duration);
  const bounds = boundsAround([tracks.straight, tracks.curve, tracks.cycloid], 0.4, 0.35);
  const order = [...lanes].sort((a, b) => motions[a.key].time - motions[b.key].time);

  return (
    <div className="page">
      <TopBar emoji="🏁" title="三条一起滑" onBack={onBack} settings={settings} />
      <Says who="nian">直线最近，拱桥也好看。可是我赌红色的摆线先到！</Says>
      <TrackCanvas
        label="直线、拱桥和摆线同时出发"
        bounds={bounds}
        flag={tracks.straight[tracks.straight.length - 1]}
        dock={tracks.straight[0]}
        tracks={lanes.map((lane) => ({
          points: tracks[lane.key],
          color: lane.color,
          width: lane.key === "cycloid" ? 7 : 4,
          wood: lane.key === "cycloid"
        }))}
        beads={lanes.map((lane) => {
          const p = poseAt(motions[lane.key], clock);
          const done = clock >= motions[lane.key].time;
          return { x: p.x, y: p.y + (done ? Math.sin(clock * 8) * 0.03 : 0), color: lane.color };
        })}
      />
      <ol className="legend">
        {order.map((lane, index) => (
          <li key={lane.key}>
            <i style={{ background: lane.color }} />
            {lane.name}
            <b>{motions[lane.key].time.toFixed(2)} 秒</b>
            {clock >= motions[lane.key].time && <span>{index === 0 ? "先到" : `第 ${index + 1}`}</span>}
          </li>
        ))}
      </ol>
      <button type="button" className="primary" onClick={() => setNonce((n) => n + 1)}>再比一次</button>
      <p className="note">摆线开头最陡，速度一下子就起来了。拱桥匀匀地弯，直线把陡坡摊到了整段路上。</p>
    </div>
  );
}
