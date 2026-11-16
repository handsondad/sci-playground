import { useEffect, useState } from "react";

/** 物理时间轴。太长的比赛会加快，避免干等。 */
export function useClock(token: number, duration: number) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || duration <= 0) {
      setT(Math.max(duration, 0));
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const speed = duration > 4.2 ? duration / 4.2 : 1;
    const loop = (now: number) => {
      const elapsed = ((now - t0) / 1000) * speed;
      setT(Math.min(duration, elapsed));
      if (elapsed < duration) raf = requestAnimationFrame(loop);
    };
    setT(0);
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [token, duration]);
  return t;
}
