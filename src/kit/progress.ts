import { useSyncExternalStore } from "react";

export type StageStars = Partial<Record<string | number, number>>;
export type StarBook = Record<string, StageStars>;

const STORAGE_KEY = "sci:stars:v1";
let cache: StarBook | null = null;
const listeners = new Set<() => void>();

function readBook(): StarBook {
  if (cache) return cache;
  if (typeof window === "undefined") {
    cache = {};
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: StarBook = raw ? (JSON.parse(raw) as StarBook) : {};
    // 兼容旧版 slide 独立存储的星星
    if (!parsed.slide) {
      const legacyStars = window.localStorage.getItem("slide:stars");
      const legacyQuiz = window.localStorage.getItem("slide:quiz");
      const slideMap: StageStars = {};
      if (legacyStars) {
        const obj = JSON.parse(legacyStars) as Record<string, number>;
        for (const [k, v] of Object.entries(obj)) if (typeof v === "number" && v > 0) slideMap[`L${k}`] = v;
      }
      if (legacyQuiz) {
        const q = JSON.parse(legacyQuiz) as number;
        if (typeof q === "number" && q > 0) slideMap.quiz = q;
      }
      if (Object.keys(slideMap).length > 0) parsed.slide = slideMap;
    }
    cache = parsed;
    return cache;
  } catch {
    cache = {};
    return cache;
  }
}

function writeBook(next: StarBook) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  listeners.forEach((fn) => fn());
}

export function recordStars(gameId: string, stageId: string | number, count: number) {
  const stars = Math.max(0, Math.min(3, Math.round(count)));
  if (stars <= 0) return;
  const book = readBook();
  const prevGame = book[gameId] ?? {};
  const prev = prevGame[stageId] ?? 0;
  if (stars <= prev) return;
  writeBook({
    ...book,
    [gameId]: { ...prevGame, [stageId]: stars }
  });
}

export function sumStars(map: StageStars | undefined): number {
  if (!map) return 0;
  return Object.values(map).reduce<number>((acc, n) => acc + (n ?? 0), 0);
}

export function useStarBook(): StarBook {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => readBook(),
    () => ({})
  );
}

const EMPTY_STARS: StageStars = {};

export function useGameStars(gameId: string): StageStars {
  const book = useStarBook();
  return book[gameId] ?? EMPTY_STARS;
}
