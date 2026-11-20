import { useEffect, type CSSProperties } from "react";
import { categoryChats, scienceTalks } from "../catalog/talks.ts";
import { scienceWiki } from "../catalog/wiki.ts";
import type { Category, GameEntry } from "../catalog/types.ts";
import { Chat, TopBar, type Settings } from "../kit/Chrome.tsx";
import { TalksSection, WikiSection } from "../kit/GameKit.tsx";
import { sumStars, useStarBook } from "../kit/progress.ts";
import { pairLines, say } from "../kit/speech.ts";
import { prefetchGame } from "./lazyGame.tsx";

export function CategoryPage({ category, games, settings }: {
  category: Category;
  games: readonly GameEntry[];
  settings: Settings;
}) {
  const book = useStarBook();
  const hallMax = games.reduce((acc, g) => acc + g.meta.maxStars, 0);
  const hallEarned = games.reduce((acc, g) => acc + Math.min(g.meta.maxStars, sumStars(book[g.meta.id])), 0);
  const intro = categoryChats[category.id];
  const hallTalks = scienceTalks.filter((t) => t.category === category.id);

  useEffect(() => {
    if (settings.sound && intro) say(...pairLines(intro));
  }, [category.id]);

  return (
    <div className="page home">
      <TopBar
        emoji={category.emoji}
        title={category.title}
        onBack={() => { window.location.hash = "#/"; }}
        backLabel="科学馆首页"
        stars={hallEarned}
        maxStars={hallMax}
        settings={settings}
      />

      {intro && <Chat lines={pairLines(intro)} playLabel="听小念和爸爸导览" />}

      <nav className="hall-anchors" aria-label="展厅分区跳转">
        <button
          type="button"
          className="pill-btn"
          onClick={() => document.getElementById("hall-games")?.scrollIntoView({ behavior: "smooth" })}
        >
          🎮 动手实验 ({games.length})
        </button>
        <button
          type="button"
          className="pill-btn"
          onClick={() => document.getElementById("hall-wiki")?.scrollIntoView({ behavior: "smooth" })}
        >
          📚 大师与居家实验 ({scienceWiki.filter((w) => w.category === category.id).length})
        </button>
        <button
          type="button"
          className="pill-btn"
          onClick={() => document.getElementById("hall-talks")?.scrollIntoView({ behavior: "smooth" })}
        >
          💬 小念问爸爸 ({hallTalks.length})
        </button>
      </nav>

      <h2 id="hall-games" className="section-title">玩一玩 · 本馆实验 ({games.length})</h2>
      <div className={`modes${games.length === 4 ? " is-four" : games.length === 5 ? " is-five" : ""}`}>
        {games.map((game) => {
          const earned = Math.min(game.meta.maxStars, sumStars(book[game.meta.id]));
          return (
            <button
              key={game.meta.id}
              type="button"
              className="mode-card"
              style={{ "--bubble": category.color } as CSSProperties}
              onClick={() => { window.location.hash = `#/g/${game.meta.id}`; }}
              onPointerEnter={() => { void prefetchGame(game).catch(() => {}); }}
              onFocus={() => { void prefetchGame(game).catch(() => {}); }}
            >
              <span className="mode-emoji" aria-hidden="true">{game.meta.emoji}</span>
              <strong>
                {game.meta.title}
                <span className="mode-tag">{game.meta.tag}</span>
              </strong>
              <small>{game.meta.blurb}</small>
              <span className="mode-count">
                <span>⭐ {earned} / {game.meta.maxStars}</span>
                <span>进入实验 →</span>
              </span>
            </button>
          );
        })}
      </div>

      {games.length === 0 && <p className="banner">这扇门还没有游戏。在 catalog/games.ts 里登记一个，它就会出现在这里。</p>}

      <div id="hall-wiki">
        <WikiSection
          items={scienceWiki.filter((w) => w.category === category.id)}
          colorsByCategory={{ [category.id]: category.color }}
          title={`📚 大师故事与家庭小实验 · ${category.title}`}
          subtitle="听爸爸讲科学发现背后的趣事，在家用身边材料就能复现"
        />
      </div>

      <div id="hall-talks">
        <TalksSection talks={hallTalks} title={`小念问爸爸 · ${category.title}`} />
      </div>
    </div>
  );
}
