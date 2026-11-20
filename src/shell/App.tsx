import { Suspense, useEffect, useState } from "react";
import { categories } from "../catalog/categories.ts";
import { games, gamesIn } from "../catalog/games.ts";
import { stopSpeaking } from "../kit/speech.ts";
import { usePersisted } from "../kit/usePersisted.ts";
import { CategoryPage } from "./CategoryPage.tsx";
import { HubPage } from "./HubPage.tsx";
import { GameLoading, LoadBoundary, lazyGame } from "./lazyGame.tsx";

type Route =
  | { kind: "hub" }
  | { kind: "category"; id: string }
  | { kind: "game"; id: string; path: string };

function readHash(): Route {
  const parts = window.location.hash.replace(/^#/, "").split("/").filter(Boolean);
  if (parts[0] === "c") return { kind: "category", id: parts[1] ?? "" };
  if (parts[0] === "g") return { kind: "game", id: parts[1] ?? "", path: parts.slice(2).join("/") };
  return { kind: "hub" };
}

export default function App() {
  const [route, setRoute] = useState<Route>(readHash);
  const [sound, setSound] = usePersisted("sci:sound", true);

  useEffect(() => {
    const onHash = () => {
      stopSpeaking();
      setRoute(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const settings = { sound, setSound };

  if (route.kind === "game") {
    const game = games.find((item) => item.meta.id === route.id);
    if (!game) {
      return (
        <div className="page">
          <button type="button" className="pill-btn" onClick={() => { window.location.hash = "#/"; }}>← 回到科学馆</button>
          <p className="banner">没有找到这个实验，回科学馆挑一个吧！</p>
        </div>
      );
    }
    const Play = lazyGame(game);
    return (
      <LoadBoundary key={game.meta.id}>
        <Suspense fallback={<GameLoading />}>
          <Play
            path={route.path}
            go={(sub) => { window.location.hash = sub ? `#/g/${game.meta.id}/${sub}` : `#/g/${game.meta.id}`; }}
            exit={() => { window.location.hash = `#/c/${game.meta.category}`; }}
            sound={sound}
            setSound={setSound}
          />
        </Suspense>
      </LoadBoundary>
    );
  }

  if (route.kind === "category") {
    const category = categories.find((item) => item.id === route.id);
    if (category) {
      return <CategoryPage category={category} games={gamesIn(category.id)} settings={settings} />;
    }
  }

  return <HubPage settings={settings} />;
}
