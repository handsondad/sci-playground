import { useState } from "react";
import type { GameProps } from "../../../catalog/types.ts";
import { recordStars } from "../../../kit/progress.ts";
import { usePersisted } from "../../../kit/usePersisted.ts";
import { levels } from "./data/levels.ts";
import { HomePage } from "./pages/HomePage.tsx";
import { LevelHome, LevelPlay } from "./pages/LevelPage.tsx";
import { QuizPage } from "./pages/QuizPage.tsx";
import { RacePage } from "./pages/RacePage.tsx";
import { RollPage } from "./pages/RollPage.tsx";
import { SyncPage } from "./pages/SyncPage.tsx";

type Stars = Partial<Record<number, number>>;

type Route =
  | { page: "home" | "roll" | "race" | "sync" | "levels" | "quiz" }
  | { page: "level"; id: number };

function parseRoute(path: string): Route {
  const [page, param] = path.split("/");
  const id = Number(param);
  if (page === "levels" && levels.some((level) => level.id === id)) return { page: "level", id };
  if (page === "roll" || page === "race" || page === "sync" || page === "levels" || page === "quiz") return { page };
  return { page: "home" };
}

export function SlideGame({ path, go, exit, sound, setSound }: GameProps) {
  const [stars, setStars] = usePersisted<Stars>("slide:stars", {});
  const [quiz, setQuiz] = usePersisted("slide:quiz", 0);
  const [round, setRound] = useState(0);
  const settings = { sound, setSound };
  const route = parseRoute(path);

  if (route.page === "roll") return <RollPage settings={settings} onBack={() => go("")} onRace={() => go("race")} />;
  if (route.page === "race") return <RacePage settings={settings} onBack={() => go("")} />;
  if (route.page === "sync") return <SyncPage settings={settings} onBack={() => go("")} />;
  if (route.page === "levels") return <LevelHome stars={stars} settings={settings} onBack={() => go("")} onPlay={(id) => go(`levels/${id}`)} />;
  if (route.page === "level") {
    const level = levels.find((item) => item.id === route.id)!;
    return (
      <LevelPlay
        key={`${level.id}-${round}`}
        level={level}
        settings={settings}
        onBack={() => go("levels")}
        onAgain={() => setRound(round + 1)}
        onNext={(id) => go(`levels/${id}`)}
        onFinish={(id, count) => {
          setStars((prev) => ({ ...prev, [id]: Math.max(prev[id] ?? 0, count) }));
          recordStars("slide", `L${id}`, count);
        }}
      />
    );
  }
  if (route.page === "quiz") {
    return (
      <QuizPage
        settings={settings}
        onBack={() => go("")}
        onFinish={(count) => {
          setQuiz((prev) => Math.max(prev, count));
          recordStars("slide", "quiz", count);
        }}
      />
    );
  }
  return <HomePage stars={stars} quiz={quiz} settings={settings} onGo={go} onExit={exit} />;
}
