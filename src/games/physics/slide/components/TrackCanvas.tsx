import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { Bounds, Gate, Pt, Rock } from "../lib/slide.ts";

export type DrawnTrack = {
  points: readonly Pt[];
  color: string;
  width?: number;
  dash?: boolean;
  wood?: boolean;
};

export type DrawnBead = { x: number; y: number; color: string };

type Camera = {
  scale: number;
  to: (p: Pt) => { x: number; y: number };
  from: (x: number, y: number) => Pt;
};

function cameraOf(w: number, h: number, b: Bounds): Camera {
  const padX = 32;
  const padY = 26;
  const scale = Math.min((w - padX * 2) / (b.maxX - b.minX), (h - padY * 2) / (b.maxY - b.minY));
  const viewW = (b.maxX - b.minX) * scale;
  const viewH = (b.maxY - b.minY) * scale;
  const left = (w - viewW) / 2;
  const top = (h - viewH) / 2;
  return {
    scale,
    to: (p) => ({ x: left + (p.x - b.minX) * scale, y: top + (b.maxY - p.y) * scale }),
    from: (x, y) => ({ x: (x - left) / scale + b.minX, y: b.maxY - (y - top) / scale })
  };
}

function trace(ctx: CanvasRenderingContext2D, cam: Camera, points: readonly Pt[]) {
  points.forEach((p, i) => {
    const s = cam.to(p);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
}

export function TrackCanvas({ bounds, tracks, beads = [], handles, rocks = [], gates = [], roller, flag, dock, ceiling, onHandle, limits, label }: {
  bounds: Bounds;
  tracks: readonly DrawnTrack[];
  beads?: readonly DrawnBead[];
  handles?: readonly Pt[];
  rocks?: readonly Rock[];
  gates?: readonly Gate[];
  roller?: { center: Pt; r: number; dot: Pt; ceilingY: number } | null;
  flag?: Pt;
  dock?: Pt;
  ceiling?: number;
  onHandle?: (index: number, y: number) => void;
  limits?: { min: number; max: number };
  label: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<number | null>(null);
  const scene = useRef({ bounds, tracks, beads, handles, rocks, gates, roller, flag, dock, ceiling });
  scene.current = { bounds, tracks, beads, handles, rocks, gates, roller, flag, dock, ceiling };

  useEffect(() => {
    const box = wrap.current;
    const el = canvas.current;
    if (!box || !el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const draw = () => {
      const { bounds, tracks, beads, handles, rocks, gates, roller, flag, dock, ceiling } = scene.current;
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (w < 2 || h < 2) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const nextW = Math.round(w * dpr);
      const nextH = Math.round(h * dpr);
      if (el.width !== nextW || el.height !== nextH) {
        el.width = nextW;
        el.height = nextH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cam = cameraOf(w, h, bounds);

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#cfe8ff");
      sky.addColorStop(0.55, "#fff6ea");
      sky.addColorStop(1, "#e7f6d8");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      [[w * 0.18, h * 0.16, 46], [w * 0.72, h * 0.12, 34], [w * 0.48, h * 0.08, 22]].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#ffd56a";
      ctx.beginPath();
      ctx.arc(w - 54, 42, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#b7e39a";
      ctx.fillRect(0, h - 18, w, 18);
      ctx.fillStyle = "#8bcf6a";
      ctx.fillRect(0, h - 18, w, 5);

      if (ceiling != null) {
        const left = cam.to({ x: bounds.minX, y: ceiling });
        const right = cam.to({ x: bounds.maxX, y: ceiling });
        ctx.strokeStyle = "#9eb6d4";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(left.x, left.y);
        ctx.lineTo(right.x, right.y);
        ctx.stroke();
      }

      for (const gate of gates) {
        const gap0 = cam.to({ x: gate.x, y: gate.y0 });
        const gap1 = cam.to({ x: gate.x, y: gate.y1 });
        const post = Math.max(8, cam.scale * 0.1);
        ctx.fillStyle = "#c47a3a";
        ctx.fillRect(gap0.x - post / 2, gap0.y, post, h - 18 - gap0.y);
        ctx.fillRect(gap1.x - post / 2, 0, post, gap1.y);
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(gap0.x, gap0.y);
        ctx.lineTo(gap1.x, gap1.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (const track of tracks) {
        if (track.points.length < 2) continue;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.setLineDash(track.dash ? [9, 8] : []);
        if (track.wood) {
          ctx.beginPath();
          trace(ctx, cam, track.points);
          ctx.strokeStyle = "rgba(140, 90, 40, 0.28)";
          ctx.lineWidth = (track.width ?? 12) + 8;
          ctx.stroke();
          ctx.beginPath();
          trace(ctx, cam, track.points);
          ctx.strokeStyle = "#e08a3c";
          ctx.lineWidth = track.width ?? 12;
          ctx.stroke();
          ctx.beginPath();
          trace(ctx, cam, track.points);
          ctx.strokeStyle = "rgba(255, 236, 200, 0.85)";
          ctx.lineWidth = 3;
          ctx.stroke();
        } else {
          ctx.beginPath();
          trace(ctx, cam, track.points);
          ctx.strokeStyle = track.color;
          ctx.lineWidth = track.width ?? 4;
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      for (const rock of rocks) {
        const s = cam.to(rock);
        const r = rock.r * cam.scale;
        ctx.fillStyle = "#8d97a5";
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#5e6874";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x - r * 0.25, s.y - r * 0.3, r * 0.35, Math.PI, Math.PI * 1.7);
        ctx.stroke();
      }

      const mark = (p: Pt, kind: "dock" | "flag") => {
        const s = cam.to(p);
        if (kind === "dock") {
          ctx.fillStyle = "#c47a3a";
          ctx.fillRect(s.x - 16, s.y - 4, 22, 8);
        } else {
          ctx.strokeStyle = "#6b4b2a";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x, s.y - 34);
          ctx.stroke();
          ctx.fillStyle = "#ff6b6b";
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - 34);
          ctx.lineTo(s.x + 18, s.y - 26);
          ctx.lineTo(s.x, s.y - 18);
          ctx.fill();
        }
      };
      if (dock) mark(dock, "dock");
      if (flag) mark(flag, "flag");

      if (roller) {
        const c = cam.to(roller.center);
        const r = roller.r * cam.scale;
        ctx.fillStyle = "rgba(77, 150, 255, 0.12)";
        ctx.strokeStyle = "#4d96ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const dot = cam.to(roller.dot);
        ctx.strokeStyle = "#ff6b6b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(dot.x, dot.y);
        ctx.stroke();
        ctx.fillStyle = "#4d96ff";
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff6b6b";
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const bead of beads) {
        const s = cam.to(bead);
        const r = Math.max(9, Math.min(15, cam.scale * 0.11));
        ctx.fillStyle = "rgba(80, 60, 30, 0.15)";
        ctx.beginPath();
        ctx.ellipse(s.x + 2, s.y + r * 0.8, r * 0.7, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bead.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.arc(s.x - r * 0.28, s.y - r * 0.32, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }

      handles?.forEach((handle, index) => {
        const s = cam.to(handle);
        ctx.strokeStyle = "rgba(224, 138, 60, 0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(s.x, 8);
        ctx.lineTo(s.x, h - 22);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#ef7d3c";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ef7d3c";
        ctx.font = "700 14px Comic Neue, Microsoft YaHei, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(index + 1), s.x, s.y + 1);
      });
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const watch = new ResizeObserver(draw);
    watch.observe(box);
    return () => {
      cancelAnimationFrame(raf);
      watch.disconnect();
    };
  }, []);

  function pointer(e: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function hit(x: number, y: number) {
    if (!handles || !canvas.current || !wrap.current) return -1;
    const cam = cameraOf(wrap.current.clientWidth, wrap.current.clientHeight, bounds);
    let best = -1;
    let dist = 28;
    handles.forEach((handle, index) => {
      const s = cam.to(handle);
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < dist) {
        dist = d;
        best = index;
      }
    });
    return best;
  }

  function move(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (drag.current == null || !onHandle || !limits || !wrap.current) return;
    const p = pointer(e);
    const cam = cameraOf(wrap.current.clientWidth, wrap.current.clientHeight, bounds);
    const y = Math.min(limits.max, Math.max(limits.min, cam.from(p.x, p.y).y));
    onHandle(drag.current, y);
  }

  return (
    <div className="stage-wrap" ref={wrap}>
      <canvas
        ref={canvas}
        aria-label={label}
        onPointerDown={(e) => {
          const index = hit(pointer(e).x, pointer(e).y);
          if (index < 0) return;
          drag.current = index;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={move}
        onPointerUp={(e) => {
          move(e);
          drag.current = null;
        }}
      />
    </div>
  );
}
