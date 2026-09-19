"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GuardedLink } from "@/features/personal-center/components/guarded-link";
import { PersonalIcon } from "@/features/personal-center/components/personal-icon";
import styles from "./trip-library.module.css";
import {
  newTripHref,
  tripLibraryTabs,
  tripSortOptions,
  type TripLibraryTab,
  type TripSortKey,
} from "./trip-library-model";
import {
  getTripTiming,
  tripTimingLabels,
  ALL_TRIPS_PAGE_SIZE,
} from "./trip-timing";
import { useTripToday } from "./use-trip-today";
import { useTripLibrary } from "./persistence/use-trip-library";
import {
  belongsToTab,
  visibleTrips,
  selectLiveHero,
  libraryStateLabels,
  wizardPhaseLabels,
  tripDateLabel,
  type TripSummary,
} from "./persistence/live-trip-model";

function TripFacts({ trip }: { trip: TripSummary }) {
  return (
    <>
      <p className={styles.tripDate}>
        <PersonalIcon name="calendar" />
        {tripDateLabel(trip)}
      </p>
      <p className={styles.tripDate}>
        <PersonalIcon name="people" />
        {trip.participantCount} 人同行
      </p>
      <p className={styles.tripDate}>
        规划阶段：{wizardPhaseLabels[trip.wizardPhase]}
      </p>
      <p className={styles.tripDate}>
        最后编辑：
        <time dateTime={trip.updatedAt}>{trip.updatedAt.slice(0, 10)}</time>
      </p>
    </>
  );
}
function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <section className={styles.emptyState} aria-live="polite">
      <span aria-hidden="true">旅</span>
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
    </section>
  );
}

export function TripLibraryPage() {
  const { items, busy, error, feedback, load, remove, copy } = useTripLibrary();
  const today = useTripToday();
  const [activeTab, setActiveTab] = useState<TripLibraryTab>("all");
  const [query, setQuery] = useState(""),
    [destination, setDestination] = useState("all"),
    [sort, setSort] = useState<TripSortKey>("departureAsc"),
    [requestedPage, setRequestedPage] = useState(1);
  const [target, setTarget] = useState<{
    id: string;
    mode: "detail" | "delete";
  } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null),
    returnFocus = useRef<HTMLElement | null>(null),
    refreshRef = useRef<HTMLButtonElement>(null);
  const selected = items?.find((trip) => trip.id === target?.id);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selected && !dialog.open) dialog.showModal();
    if (!selected && dialog.open) dialog.close();
  }, [selected]);
  const destinations = useMemo(
    () =>
      [...new Set(items?.flatMap((trip) => trip.destinations) ?? [])].sort(),
    [items],
  );
  const visible = useMemo(
    () => visibleTrips(items ?? [], activeTab, today, query, destination, sort),
    [items, activeTab, today, query, destination, sort],
  );
  const hero =
    activeTab === "all" || activeTab === "upcoming"
      ? selectLiveHero(visible, today)
      : null;
  const timing = hero
    ? getTripTiming(hero.departure ?? "", hero.returning ?? "", today)
    : null;
  const cards = visible.filter((trip) => trip.id !== hero?.id);
  const pageCount = Math.max(1, Math.ceil(cards.length / ALL_TRIPS_PAGE_SIZE)),
    page = Math.min(pageCount, requestedPage);
  const pageItems = cards.slice(
    (page - 1) * ALL_TRIPS_PAGE_SIZE,
    page * ALL_TRIPS_PAGE_SIZE,
  );
  function changeTab(tab: TripLibraryTab) {
    setActiveTab(tab);
    setRequestedPage(1);
  }
  function open(trip: TripSummary, mode: "detail" | "delete") {
    returnFocus.current = document.activeElement as HTMLElement;
    setTarget({ id: trip.id, mode });
  }
  function close() {
    if (busy) return;
    setTarget(null);
    window.requestAnimationFrame(() => {
      const previous = returnFocus.current;
      if (previous?.isConnected) previous.focus();
      else refreshRef.current?.focus();
    });
  }
  function refresh() {
    if (busy) return;
    setTarget(null);
    setRequestedPage(1);
    void load();
  }
  async function confirmDelete() {
    if (selected && (await remove(selected))) close();
  }
  async function copyHistory(trip: TripSummary) {
    if (await copy(trip)) {
      setTarget(null);
      changeTab("drafts");
      window.requestAnimationFrame(() =>
        document.getElementById("trip-tab-drafts")?.focus(),
      );
    }
  }
  function actions(trip: TripSummary) {
    return (
      <div className={styles.cardActions}>
        <button
          type="button"
          disabled={busy}
          onClick={() => open(trip, "detail")}
        >
          查看摘要
        </button>
        {trip.libraryState === "draft" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => open(trip, "delete")}
          >
            删除草稿
          </button>
        ) : null}
        {trip.libraryState === "history" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void copyHistory(trip)}
          >
            复制为新草稿
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <div
      className={styles.page}
      data-trip-library-page
      data-live-trip-library
      data-active-tab={activeTab}
      aria-busy={busy}
    >
      <header className={styles.pageHeader}>
        <div>
          <i
            className={styles.titleFlower}
            data-title-flower
            aria-hidden="true"
          >
            ✿
          </i>
          <p className={styles.eyebrow}>TRIP LIBRARY</p>
          <h1 data-primary-page-title>我的旅行</h1>
          <p>查看已保存的行程、草稿与历史</p>
        </div>
        <GuardedLink className={styles.newTripButton} href={newTripHref}>
          <PersonalIcon name="plus" />
          新建旅程
        </GuardedLink>
      </header>
      <nav className={styles.tabs} aria-label="旅行资料库分类">
        <div role="tablist" aria-label="旅行资料库分类">
          {tripLibraryTabs.map((tab, index) => (
            <button
              key={tab.key}
              id={`trip-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls="trip-library-panel"
              tabIndex={activeTab === tab.key ? 0 : -1}
              onClick={() => changeTab(tab.key)}
              onKeyDown={(event) => {
                const next =
                  event.key === "ArrowRight"
                    ? (index + 1) % tripLibraryTabs.length
                    : event.key === "ArrowLeft"
                      ? (index + tripLibraryTabs.length - 1) %
                        tripLibraryTabs.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? tripLibraryTabs.length - 1
                          : null;
                if (next !== null) {
                  event.preventDefault();
                  const key = tripLibraryTabs[next].key;
                  changeTab(key);
                  document.getElementById("trip-tab-" + key)?.focus();
                }
              }}
            >
              {tab.label}
              <span>
                {tab.key === "favorites" || !items
                  ? "—"
                  : items.filter((trip) => belongsToTab(trip, tab.key, today))
                      .length}
              </span>
            </button>
          ))}
        </div>
      </nav>
      <section className={styles.toolbar} aria-label="搜索、筛选与排序">
        <label className={styles.searchField}>
          <span className={styles.srOnly}>搜索行程名称或目的地</span>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            placeholder="搜索行程名称或目的地"
            onChange={(event) => {
              setQuery(event.target.value);
              setRequestedPage(1);
            }}
          />
        </label>
        <label>
          <span className={styles.srOnly}>目的地筛选</span>
          <select
            value={destination}
            onChange={(event) => {
              setDestination(event.target.value);
              setRequestedPage(1);
            }}
          >
            <option value="all">全部目的地</option>
            {destinations.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={styles.srOnly}>排序方式</span>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as TripSortKey);
              setRequestedPage(1);
            }}
          >
            {tripSortOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>
      <div className={styles.liveStatus}>
        <button
          ref={refreshRef}
          type="button"
          disabled={busy}
          onClick={refresh}
        >
          重新读取列表
        </button>
        {busy ? (
          <p role="status">{items ? "正在处理…" : "正在读取旅行资料…"}</p>
        ) : null}
      </div>
      {feedback ? (
        <p className={styles.feedback} role="status">
          {feedback}
        </p>
      ) : null}
      {error && !selected ? <p role="alert">{error}</p> : null}
      <section
        id="trip-library-panel"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby={`trip-tab-${activeTab}`}
        tabIndex={0}
      >
        {items && activeTab === "favorites" ? (
          <EmptyState
            title="收藏资料暂未提供"
            body="这里暂时无法读取收藏，不显示示例收藏或虚构数量。"
          />
        ) : null}
        {items && activeTab !== "favorites" && visible.length === 0 ? (
          <EmptyState
            title={
              query || destination !== "all"
                ? "没有匹配的旅行"
                : activeTab === "drafts"
                  ? "没有未完成的草稿"
                  : activeTab === "history"
                    ? "还没有历史行程"
                    : activeTab === "upcoming"
                      ? "近期没有即将出发的行程"
                      : "还没有旅行"
            }
            body="可调整分类或筛选条件，或重新读取列表。"
          />
        ) : null}
        {items && hero && timing ? (
          <section
            className={styles.nextTripHero}
            aria-labelledby="next-trip-heading"
            data-trip-hero={hero.id}
            data-trip-status={timing}
            data-record-id={hero.id}
          >
            <div
              className={`${styles.heroImage} ${styles.liveCover}`}
              role="img"
              aria-label="封面未提供"
            >
              <PersonalIcon name="calendar" />
            </div>
            <div className={styles.heroBody}>
              <p>
                {tripTimingLabels[timing]} ·{" "}
                {libraryStateLabels[hero.libraryState]}
              </p>
              <h2 id="next-trip-heading">{hero.title ?? "未命名旅行"}</h2>
              <p>{hero.destinations.join(" · ") || "目的地未设置"}</p>
              <TripFacts trip={hero} />
              {actions(hero)}
            </div>
          </section>
        ) : null}
        {items && pageItems.length > 0 ? (
          <div className={styles.cardGrid}>
            {pageItems.map((trip) => (
              <article
                key={trip.id}
                className={styles.tripCard}
                data-record-id={trip.id}
                data-testid={`trip-card-${trip.id}`}
              >
                <div
                  className={`${styles.cardImage} ${styles.liveCover}`}
                  role="img"
                  aria-label="封面未提供"
                >
                  <PersonalIcon name="calendar" />
                  <span className={styles.statusChip}>
                    {libraryStateLabels[trip.libraryState]}
                  </span>
                </div>
                <div className={styles.tripCardBody}>
                  <div className={styles.cardTitleLine}>
                    <div>
                      <p>{trip.destinations.join(" · ") || "目的地未设置"}</p>
                      <h3>{trip.title ?? "未命名旅行"}</h3>
                    </div>
                  </div>
                  <TripFacts trip={trip} />
                  {actions(trip)}
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {items && visible.length > 0 ? (
          <nav className={styles.pagination} aria-label="旅行列表分页">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setRequestedPage(page - 1)}
            >
              上一页
            </button>
            <span>
              第 {page} / {pageCount} 页 · 共 {visible.length} 条行程
            </span>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setRequestedPage(page + 1)}
            >
              下一页
            </button>
          </nav>
        ) : null}
      </section>
      <p className={styles.liveBoundary}>
        预订、收藏和封面资料暂未提供；本页不显示相应统计。价格与预订操作暂不可用。继续编辑行程的入口暂不可用。
      </p>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="trip-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        {selected ? (
          <>
            <div className={styles.dialogHeading}>
              <h2 id="trip-dialog-title">
                {target?.mode === "delete" ? "删除这份草稿？" : "行程摘要"}
              </h2>
              <button
                type="button"
                disabled={busy}
                aria-label="关闭"
                onClick={close}
              >
                <PersonalIcon name="close" />
              </button>
            </div>
            <h3>{selected.title ?? "未命名旅行"}</h3>
            <p>
              {libraryStateLabels[selected.libraryState]} ·{" "}
              {selected.destinations.join(" · ") || "目的地未设置"}
            </p>
            <TripFacts trip={selected} />
            {target?.mode === "delete" ? (
              <p>只删除此草稿，不会取消酒店、门票、餐厅或交通合作方的预订。</p>
            ) : (
              <p>方案状态：{selected.planStatus ?? "未提供"}</p>
            )}
            {error ? (
              <div role="alert">
                <p>{error}</p>
                <button type="button" disabled={busy} onClick={refresh}>
                  重新读取列表
                </button>
              </div>
            ) : null}
            <div className={styles.dialogActions}>
              <button type="button" disabled={busy} onClick={close}>
                取消
              </button>
              {target?.mode === "delete" ? (
                <button
                  type="button"
                  disabled={busy}
                  className={styles.confirmDanger}
                  onClick={() => void confirmDelete()}
                >
                  删除草稿
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
