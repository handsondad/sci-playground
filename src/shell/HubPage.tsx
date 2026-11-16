import { useMemo, useState, type CSSProperties } from "react";
import { categories } from "../catalog/categories.ts";
import { games, gamesIn } from "../catalog/games.ts";
import { hubChats, scienceTalks } from "../catalog/talks.ts";
import { scienceWiki } from "../catalog/wiki.ts";
import type { CategoryId } from "../catalog/types.ts";
import type { Settings } from "../kit/Chrome.tsx";
import { DuoStage, Meter, TalksSection, WikiSection } from "../kit/GameKit.tsx";
import { sumStars, useStarBook, type StarBook } from "../kit/progress.ts";
import { stopSpeaking } from "../kit/speech.ts";

const QUICK_KEYWORDS = ["齿轮", "造桥", "彩虹", "恐龙", "密码", "日食"];

/** 优先抽还没拿过星的实验，其次没拿满三星的实验，全都满星则随机抽一个。 */
function pickRandomGameId(book: StarBook): string {
  const unplayed = games.filter((g) => sumStars(book[g.meta.id]) === 0);
  if (unplayed.length > 0) {
    return unplayed[Math.floor(Math.random() * unplayed.length)].meta.id;
  }
  const unfinished = games.filter((g) => sumStars(book[g.meta.id]) < g.meta.maxStars);
  const pool = unfinished.length > 0 ? unfinished : games;
  return pool[Math.floor(Math.random() * pool.length)].meta.id;
}

export function HubPage({ settings }: { settings: Settings }) {
  const [query, setQuery] = useState("");
  const book = useStarBook();

  const grandMax = games.reduce((acc, g) => acc + g.meta.maxStars, 0);
  const grandEarned = games.reduce((acc, g) => acc + Math.min(g.meta.maxStars, sumStars(book[g.meta.id])), 0);
  const pct = grandMax > 0 ? Math.round((grandEarned / grandMax) * 100) : 0;

  const colorByCat = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.color])) as Record<CategoryId, string>,
    []
  );
  const catById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])) as Record<CategoryId, (typeof categories)[number]>,
    []
  );

  const trimmed = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmed) return null;
    const hit = (s: string) => s.toLowerCase().includes(trimmed);
    const matchedGames = games.filter((g) => {
      const cat = catById[g.meta.category];
      return hit(g.meta.title) || hit(g.meta.tag) || hit(g.meta.blurb) || (cat && hit(cat.title));
    });
    const matchedWiki = scienceWiki.filter(
      (w) => hit(w.title) || hit(w.scientist) || hit(w.story) || hit(w.homeLab) || hit(w.relatedGameTitle)
    );
    const matchedTalks = scienceTalks.filter(
      (t) => hit(t.title) || hit(t.wrap) || t.turns.some((turn) => hit(turn.nian) || hit(turn.dad))
    );
    return {
      games: matchedGames,
      wiki: matchedWiki,
      talks: matchedTalks,
      total: matchedGames.length + matchedWiki.length + matchedTalks.length
    };
  }, [trimmed, catById]);

  function openGame(id: string) {
    stopSpeaking();
    window.location.hash = `#/g/${id}`;
  }

  function openHall(id: CategoryId) {
    stopSpeaking();
    window.location.hash = `#/c/${id}`;
  }

  return (
    <div className="page home">
      <header className="home-title">
        <h1><span aria-hidden="true">🔬</span> 科学小游戏大冒险</h1>
        <p>小念和爸爸的动手科学馆 · 推开九扇大门，亲手玩懂世界运转的秘密</p>
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

      <section className="hub-finder" aria-label="快速寻找实验或随便玩一个">
        <div className="hub-finder-bar">
          <label className="hub-search">
            <span className="hub-search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜一搜实验、现象或科学家：如 齿轮、彩虹、造桥、孟德尔、密码……"
              aria-label="搜索科学实验、大师故事或问答"
            />
            {query && (
              <button
                type="button"
                className="hub-search-clear"
                onClick={() => setQuery("")}
                aria-label="清空搜索"
              >
                ✕
              </button>
            )}
          </label>
          <button
            type="button"
            className="primary-btn hub-random-btn"
            onClick={() => openGame(pickRandomGameId(book))}
          >
            🎲 随便玩一个
          </button>
        </div>

        {searchResults && (
          <div className="hub-search-results" aria-live="polite">
            <div className="hub-results-head">
              <strong>
                {searchResults.total > 0
                  ? `找到 ${searchResults.games.length} 个实验、${searchResults.wiki.length} 段故事、${searchResults.talks.length} 个问答`
                  : "没搜到这个词呢，试试下面这几个热门词？"}
              </strong>
              <div className="hub-quick-tags">
                {QUICK_KEYWORDS.map((kw) => (
                  <button key={kw} type="button" className="pill-btn hub-kw-chip" onClick={() => setQuery(kw)}>
                    {kw}
                  </button>
                ))}
              </div>
            </div>

            {searchResults.games.length > 0 && (
              <div className="modes hub-results-grid">
                {searchResults.games.map((game) => {
                  const earned = Math.min(game.meta.maxStars, sumStars(book[game.meta.id]));
                  const hall = catById[game.meta.category];
                  return (
                    <button
                      key={game.meta.id}
                      type="button"
                      className="mode-card"
                      style={{ "--bubble": hall?.color ?? "#ff9f43" } as CSSProperties}
                      onClick={() => openGame(game.meta.id)}
                    >
                      <span className="mode-emoji" aria-hidden="true">{game.meta.emoji}</span>
                      <strong>
                        {game.meta.title}
                        <span className="mode-tag">{hall?.emoji} {hall?.title}</span>
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
            )}

            {searchResults.wiki.length > 0 && (
              <WikiSection
                items={searchResults.wiki}
                colorsByCategory={colorByCat}
                title="📚 匹配的大师故事与居家小实验"
                subtitle=""
              />
            )}

            {searchResults.talks.length > 0 && (
              <TalksSection talks={searchResults.talks} title="💬 匹配的小念问爸爸" />
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="hub-halls-title">
        <div className="section-head">
          <h2 id="hub-halls-title" className="section-title">九大科学工程展厅</h2>
          <span className="section-sub">
            共 {games.length} 个动手实验 · {scienceWiki.length} 段大师百宝箱 · {scienceTalks.length} 组父子问答，全在各馆门后
          </span>
        </div>
        <div className="modes">
          {categories.map((category) => {
            const list = gamesIn(category.id);
            const hallWikiCount = scienceWiki.filter((w) => w.category === category.id).length;
            const hallTalkCount = scienceTalks.filter((t) => t.category === category.id).length;
            const hallMax = list.reduce((acc, g) => acc + g.meta.maxStars, 0);
            const hallEarned = list.reduce((acc, g) => acc + Math.min(g.meta.maxStars, sumStars(book[g.meta.id])), 0);
            return (
              <button
                key={category.id}
                type="button"
                className="mode-card hall-card"
                style={{ "--bubble": category.color } as CSSProperties}
                onClick={() => openHall(category.id)}
              >
                <span className="mode-emoji" aria-hidden="true">{category.emoji}</span>
                <strong>
                  {category.title}
                  <span className="mode-tag">{list.length} 个实验</span>
                </strong>
                <small>{category.blurb}</small>
                <span className="hall-preview" aria-hidden="true">
                  {list.map((g) => (
                    <span key={g.meta.id} className="hall-chip">{g.meta.emoji} {g.meta.title}</span>
                  ))}
                </span>
                <span className="mode-count">
                  <span>📚 {hallWikiCount} 故事 · 💬 {hallTalkCount} 问答</span>
                  <span>⭐ {hallEarned} / {hallMax} →</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <p className="home-credit">
        选一座展厅推门进去，就能玩遍馆内实验、读科学史真事、听小念和爸爸一问一答
      </p>
    </div>
  );
}
