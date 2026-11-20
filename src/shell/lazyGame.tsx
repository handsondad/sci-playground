import { Component, lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import type { GameEntry, GameProps } from "../catalog/types.ts";

type Play = ComponentType<GameProps>;

const pending = new Map<string, Promise<Play>>();
const components = new Map<string, LazyExoticComponent<Play>>();

/** 提前下载实验台代码块（悬停/聚焦卡片时调用），失败时允许下次重试。 */
export function prefetchGame(entry: GameEntry): Promise<Play> {
  const id = entry.meta.id;
  let task = pending.get(id);
  if (!task) {
    task = entry.load();
    task.catch(() => pending.delete(id));
    pending.set(id, task);
  }
  return task;
}

export function lazyGame(entry: GameEntry): LazyExoticComponent<Play> {
  const id = entry.meta.id;
  let Lazy = components.get(id);
  if (!Lazy) {
    Lazy = lazy(() => prefetchGame(entry).then((Play) => ({ default: Play })));
    components.set(id, Lazy);
  }
  return Lazy;
}

export function GameLoading() {
  return (
    <div className="page page-loading" data-loading="" role="status" aria-live="polite">
      <p className="banner">🔬 实验台正在搭建中…</p>
    </div>
  );
}

/** 实验代码块加载失败（断网或站点刚更新）时给出刷新入口，而不是整页白屏。 */
export class LoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page">
        <h1>😵 实验台没能打开</h1>
        <p className="banner is-warn">可能是网络开小差了，刷新一下再试试吧。</p>
        <div className="play-actions">
          <button type="button" className="primary-btn" onClick={() => window.location.reload()}>🔄 重新加载</button>
          <button type="button" className="pill-btn" onClick={() => { window.location.hash = "#/"; }}>← 回到科学馆</button>
        </div>
      </div>
    );
  }
}
