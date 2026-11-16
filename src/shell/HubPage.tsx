import { useState, type CSSProperties } from "react";
import { categories } from "../catalog/categories.ts";
import { games, gamesIn } from "../catalog/games.ts";
import { hubChats, scienceTalks } from "../catalog/talks.ts";
import { scienceWiki } from "../catalog/wiki.ts";
import type { CategoryId } from "../catalog/types.ts";
import type { Settings } from "../kit/Chrome.tsx";
import { DuoStage, Meter, TalksSection, WikiSection } from "../kit/GameKit.tsx";
import { sumStars, useStarBook } from "../kit/progress.ts";
import { stopSpeaking } from "../kit/speech.ts";

export function HubPage({ settings }: { settings: Settings }) {
  const [filter, setFilter] = useState<"all" | CategoryId>("all");
  const book = useStarBook();

  const grandMax = games.reduce((acc, g) => acc + g.meta.maxStars, 0);
  const grandEarned = games.reduce((acc, g) => acc + Math.min(g.meta.maxStars, sumStars(book[g.meta.id])), 0);
  const pct = grandMax > 0 ? Math.round((grandEarned / grandMax) * 100) : 0;

  const shownGames = filter === "all" ? games : gamesIn(filter);
  const colorByCat = Object.fromEntries(categories.map((c) => [c.id, c.color])) as Record<CategoryId, string>;

  return (
    <div className="page home">
      <header className="home-title">
        <h1><span aria-hidden="true">🔬</span> 科学小游戏大冒险</h1>
        <p>小念和爸爸的动手科学馆：五扇好奇的门，把数学、物理、化学、生物和星空玩明白</p>
      </header>

      <div className="hub-progress">
        <div className="hub-progress-info">
          <span aria-hidden="true">🏆</span>
          <span>科学探索勋章</span>
          <strong>⭐ {grandEarned} / {grandMax}</strong>
        </div>
        <Meter pct={pct} label="点亮进度" valueText={`${pct}%`} />
        <button
          type="button"
          className="pill-btn sound-btn"
          aria-pressed={settings.sound}
          onClick={() => {
            if (settings.sound) stopSpeaking();
            settings.setSound(!settings.sound);
          }}
        >
          {settings.sound ? "🔊 声音：开" : "🔇 声音：关"}
        </button>
      </div>

      <DuoStage chats={hubChats} />

      <section aria-labelledby="hub-halls-title">
        <div className="section-head">
          <h2 id="hub-halls-title" className="section-title">五大科学展厅</h2>
          <span className="section-sub">推开一扇门，听小念和爸爸聊这门学科的奇妙脾气</span>
        </div>
        <div className="modes is-five">
          {categories.map((category) => {
            const list = gamesIn(category.id);
            const hallMax = list.reduce((acc, g) => acc + g.meta.maxStars, 0);
            const hallEarned = list.reduce((acc, g) => acc + Math.min(g.meta.maxStars, sumStars(book[g.meta.id])), 0);
            return (
              <button
                key={category.id}
                type="button"
                className="mode-card"
                style={{ "--bubble": category.color } as CSSProperties}
                onClick={() => { window.location.hash = `#/c/${category.id}`; }}
              >
                <span className="mode-emoji" aria-hidden="true">{category.emoji}</span>
                <strong>
                  {category.title}
                  <span className="mode-tag">{list.length} 个实验</span>
                </strong>
                <small>{category.blurb}</small>
                <span className="mode-count">
                  <span>{list.map((g) => g.meta.emoji).join(" ")}</span>
                  <span>⭐ {hallEarned} / {hallMax} →</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="hub-games-title">
        <div className="section-head">
          <h2 id="hub-games-title" className="section-title">全部动手实验台</h2>
          <span className="section-sub">共 {games.length} 个小游戏 · 点开就能直接玩</span>
        </div>

        <div className="filter-tabs" role="tablist" aria-label="按展厅筛选">
          <button
            type="button"
            role="tab"
            aria-selected={filter === "all"}
            className={`filter-tab${filter === "all" ? " is-active" : ""}`}
            style={{ "--c": "#ff9f43" } as CSSProperties}
            onClick={() => setFilter("all")}
          >
            ✨ 全部 ({games.length})
          </button>
          {categories.map((cat) => {
            const count = gamesIn(cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={filter === cat.id}
                className={`filter-tab${filter === cat.id ? " is-active" : ""}`}
                style={{ "--c": cat.color } as CSSProperties}
                onClick={() => setFilter(cat.id)}
              >
                <span aria-hidden="true">{cat.emoji}</span> {cat.title} ({count})
              </button>
            );
          })}
        </div>

        <div className="modes">
          {shownGames.map((game) => {
            const earned = Math.min(game.meta.maxStars, sumStars(book[game.meta.id]));
            const accent = colorByCat[game.meta.category] ?? "#ff9f43";
            return (
              <button
                key={game.meta.id}
                type="button"
                className="mode-card"
                style={{ "--bubble": accent } as CSSProperties}
                onClick={() => { window.location.hash = `#/g/${game.meta.id}`; }}
              >
                <span className="mode-emoji" aria-hidden="true">{game.meta.emoji}</span>
                <strong>
                  {game.meta.title}
                  <span className="mode-tag">{game.meta.tag}</span>
                </strong>
                <small>{game.meta.blurb}</small>
                <span className="mode-count">
                  <span>{earned > 0 ? `⭐ ${earned} / ${game.meta.maxStars}` : `可拿 ${game.meta.maxStars} 颗星`}</span>
                  <span>去动手 →</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <WikiSection
        items={filter === "all" ? scienceWiki : scienceWiki.filter((w) => w.category === filter)}
        colorsByCategory={colorByCat}
      />

      <TalksSection talks={filter === "all" ? scienceTalks : scienceTalks.filter((t) => t.category === filter)} />

      <p className="home-credit">
        小念和爸爸的互动科学馆 · 每个实验都能亲手调参数、听语音讲解、收集三星勋章
      </p>
    </div>
  );
}
