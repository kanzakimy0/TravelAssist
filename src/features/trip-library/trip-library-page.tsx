"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

import { GuardedLink } from "@/features/personal-center/components/guarded-link";
import { PersonalIcon } from "@/features/personal-center/components/personal-icon";

import { createTripLibraryFixture } from "./trip-library-data";
import styles from "./trip-library.module.css";
import {
  cloneHistoryTripToDraft,
  deleteDraft,
  deriveDestinationOptions,
  favoriteCategoryFilters,
  filterDrafts,
  filterFavorites,
  filterHistory,
  filterTrips,
  groupHistoryByYear,
  newTripHref,
  plannerBridgeHref,
  removeFavorite,
  selectNextTrip,
  shouldShowNextTripHero,
  sortDrafts,
  sortTrips,
  toggleHistoryFavorite,
  tripLibraryEmptyCopy,
  tripLibraryTabs,
  tripSortOptions,
  type DraftTripViewModel,
  type FavoriteFilter,
  type FavoriteViewModel,
  type HistoryTripViewModel,
  type TripCardViewModel,
  type TripLibraryTab,
  type TripSortKey,
} from "./trip-library-model";

const categoryLabels: Record<FavoriteViewModel["category"], string> = {
  trip: "行程",
  attraction: "景点",
  accommodation: "住宿",
  dining: "餐饮",
  activity: "活动",
};

function ReservationSummary({
  trip,
  compact = false,
}: {
  trip: TripCardViewModel;
  compact?: boolean;
}) {
  return (
    <div className={compact ? styles.compactReservation : styles.reservation}>
      <div className={styles.completionLine}>
        <span>预订完成度</span>
        <strong>{trip.reservation.completion}%</strong>
      </div>
      <progress
        value={trip.reservation.completion}
        max="100"
        aria-label={`${trip.name}预订完成度 ${trip.reservation.completion}%`}
      />
      <ul className={styles.categorySummary} aria-label="预订分类摘要">
        {trip.reservation.categories.map((item) => (
          <li key={item.label}>
            <span>{item.label}</span>
            <strong>
              {item.completed}/{item.total}
            </strong>
          </li>
        ))}
      </ul>
      <p data-tone={trip.reservation.attentionTone}>
        {trip.reservation.attentionLabel}
      </p>
    </div>
  );
}

function TripCard({
  trip,
  statusLabel,
  onDetail,
}: {
  trip: TripCardViewModel;
  statusLabel: string;
  onDetail: (trip: TripCardViewModel) => void;
}) {
  return (
    <article className={styles.tripCard} data-testid={`trip-card-${trip.id}`}>
      <div className={styles.cardImage}>
        <Image
          src={trip.cover}
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1200px) 45vw, 360px"
          style={{ objectPosition: trip.coverPosition }}
        />
        <span className={styles.statusChip}>{statusLabel}</span>
      </div>
      <div className={styles.tripCardBody}>
        <div className={styles.cardTitleLine}>
          <div>
            <p>{trip.destination}</p>
            <h3>{trip.name}</h3>
          </div>
          <details className={styles.moreMenu}>
            <summary aria-label={`${trip.name}更多操作`}>•••</summary>
            <div>
              <button type="button" onClick={() => onDetail(trip)}>
                查看摘要
              </button>
            </div>
          </details>
        </div>
        <p className={styles.tripDate}>
          <PersonalIcon name="calendar" />
          {trip.dateLabel} · {trip.durationLabel}
        </p>
        <p className={styles.tripDate}>
          <PersonalIcon name="people" />
          {trip.companionCount} 人同行
        </p>
        <ReservationSummary trip={trip} compact />
        <GuardedLink className={styles.primaryButton} href={plannerBridgeHref}>
          {trip.phase === "history" ? "查看原行程" : "继续规划"}
          <PersonalIcon name="arrow" />
        </GuardedLink>
      </div>
    </article>
  );
}

function EmptyState({
  title,
  body,
  withAction = false,
}: {
  title: string;
  body?: string;
  withAction?: boolean;
}) {
  return (
    <section className={styles.emptyState} aria-live="polite">
      <span aria-hidden="true">旅</span>
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
      {withAction ? (
        <GuardedLink className={styles.primaryButton} href={newTripHref}>
          <PersonalIcon name="plus" />
          {tripLibraryEmptyCopy.all.action}
        </GuardedLink>
      ) : null}
    </section>
  );
}

export function TripLibraryPage() {
  const fixture = useMemo(() => createTripLibraryFixture(), []);
  const destinations = useMemo(
    () => deriveDestinationOptions(fixture),
    [fixture],
  );
  const [activeTab, setActiveTab] = useState<TripLibraryTab>("all");
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState("all");
  const [sort, setSort] = useState<TripSortKey>("updatedDesc");
  const [favoriteFilter, setFavoriteFilter] = useState<FavoriteFilter>("all");
  const [drafts, setDrafts] = useState(fixture.drafts);
  const [history, setHistory] = useState(fixture.history);
  const [favorites, setFavorites] = useState(fixture.favorites);
  const [deleteTarget, setDeleteTarget] = useState<DraftTripViewModel | null>(
    null,
  );
  const [recapTarget, setRecapTarget] = useState<HistoryTripViewModel | null>(
    null,
  );
  const [detailTarget, setDetailTarget] = useState<
    TripCardViewModel | FavoriteViewModel | null
  >(null);
  const [addedFavorites, setAddedFavorites] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState("");
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const recapDialogRef = useRef<HTMLDialogElement>(null);
  const detailDialogRef = useRef<HTMLDialogElement>(null);

  const visibleTrips = sortTrips(
    filterTrips(
      fixture.trips,
      activeTab === "upcoming" ? "upcoming" : "all",
      query,
      destination,
    ),
    sort,
  );
  const visibleDrafts = sortDrafts(
    filterDrafts(drafts, query, destination),
    sort,
  );
  const visibleHistory = sortTrips(
    filterHistory(history, query, destination),
    sort,
  );
  const visibleFavorites = filterFavorites(favorites, favoriteFilter).filter(
    (item) =>
      (!query ||
        `${item.name} ${item.destination}`
          .toLocaleLowerCase("zh-CN")
          .includes(query.trim().toLocaleLowerCase("zh-CN"))) &&
      (destination === "all" || item.destination === destination),
  );
  const nextTrip = selectNextTrip(visibleTrips);

  function changeTab(tab: TripLibraryTab) {
    setActiveTab(tab);
    setQuery("");
    setDestination("all");
    setFavoriteFilter("all");
    setSort(tab === "upcoming" ? "departureAsc" : "updatedDesc");
    setFeedback("");
  }

  function closeDeleteDialog() {
    deleteDialogRef.current?.close();
    setDeleteTarget(null);
  }
  function confirmDeleteDraft() {
    if (!deleteTarget) return;
    const result = deleteDraft(drafts, deleteTarget.id);
    setDrafts(result.drafts);
    setFeedback(
      `已从本页移除草稿“${deleteTarget.name}”；未触发任何合作方取消。`,
    );
    closeDeleteDialog();
  }
  function closeRecap() {
    recapDialogRef.current?.close();
    setRecapTarget(null);
  }
  function copyHistory(trip: HistoryTripViewModel) {
    const copy = cloneHistoryTripToDraft(trip);
    setDrafts((current) => [
      copy,
      ...current.filter((item) => item.id !== copy.id),
    ]);
    setActiveTab("drafts");
    setQuery("");
    setDestination("all");
    setSort("updatedDesc");
    setFeedback(`已把“${trip.name}”的展示快照复制为页内草稿。`);
    closeRecap();
  }
  function toggleFavorite(trip: HistoryTripViewModel) {
    const nextFavorite = !trip.favorite;
    setHistory((current) => toggleHistoryFavorite(current, trip.id));
    setRecapTarget((current) =>
      current?.id === trip.id
        ? { ...current, favorite: nextFavorite }
        : current,
    );
    setFeedback(
      nextFavorite ? `已收藏“${trip.name}”。` : `已取消收藏“${trip.name}”。`,
    );
  }
  function closeDetail() {
    detailDialogRef.current?.close();
    setDetailTarget(null);
  }
  function openDetail(item: TripCardViewModel | FavoriteViewModel) {
    setDetailTarget(item);
    detailDialogRef.current?.showModal();
  }

  function addFavoriteToTrip(item: FavoriteViewModel) {
    setAddedFavorites((current) => new Set(current).add(item.id));
    setFeedback(`已将“${item.name}”加入本页行程候选（未写入 Planner）。`);
  }

  const tabCounts: Record<TripLibraryTab, number> = {
    all:
      fixture.trips.length + drafts.length + history.length + favorites.length,
    upcoming: fixture.trips.length,
    drafts: drafts.length,
    history: history.length,
    favorites: favorites.length,
  };

  return (
    <div
      className={styles.page}
      data-trip-library-page
      data-active-tab={activeTab}
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
          <p>管理行程、预订与收藏</p>
        </div>
        <GuardedLink className={styles.newTripButton} href={newTripHref}>
          <PersonalIcon name="plus" />
          新建旅程
        </GuardedLink>
      </header>

      <nav className={styles.tabs} aria-label="旅行资料库分类">
        <div role="tablist" aria-label="旅行资料库分类">
          {tripLibraryTabs.map((tab) => (
            <button
              key={tab.key}
              id={`trip-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls="trip-library-panel"
              onClick={() => changeTab(tab.key)}
            >
              {tab.label}
              <span>{tabCounts[tab.key]}</span>
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
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span className={styles.srOnly}>目的地筛选</span>
          <select
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          >
            <option value="all">全部目的地</option>
            {destinations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {activeTab !== "favorites" ? (
          <label>
            <span className={styles.srOnly}>排序方式</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as TripSortKey)}
            >
              {tripSortOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      {feedback ? (
        <p className={styles.feedback} role="status">
          <PersonalIcon name="check" />
          {feedback}
        </p>
      ) : null}

      <main
        id="trip-library-panel"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby={`trip-tab-${activeTab}`}
      >
        {(activeTab === "all" || activeTab === "upcoming") &&
        shouldShowNextTripHero(activeTab, visibleTrips) &&
        nextTrip ? (
          <section
            className={styles.nextTripHero}
            aria-labelledby="next-trip-heading"
          >
            <div className={styles.heroImage}>
              <Image
                src={nextTrip.cover}
                alt="京都樱花与街景"
                fill
                priority
                sizes="(max-width: 767px) 100vw, 55vw"
                style={{ objectPosition: nextTrip.coverPosition }}
              />
            </div>
            <div className={styles.heroBody}>
              <p className={styles.eyebrow}>NEXT TRIP · 下一次旅行</p>
              <h2 id="next-trip-heading">{nextTrip.name}</h2>
              <p className={styles.heroMeta}>
                <span>
                  <PersonalIcon name="calendar" />
                  {nextTrip.dateLabel}
                </span>
                <span>{nextTrip.durationLabel}</span>
                <span>
                  <PersonalIcon name="people" />
                  {nextTrip.companionCount} 人同行
                </span>
              </p>
              <ReservationSummary trip={nextTrip} />
              <GuardedLink
                className={styles.primaryButton}
                href={plannerBridgeHref}
              >
                继续规划
                <PersonalIcon name="arrow" />
              </GuardedLink>
            </div>
          </section>
        ) : null}

        {activeTab === "all" || activeTab === "upcoming" ? (
          visibleTrips.length ? (
            <section
              className={styles.librarySection}
              data-library-section="active"
              aria-labelledby="active-trip-heading"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>ACTIVE TRIPS</p>
                  <h2 id="active-trip-heading">
                    {activeTab === "upcoming" ? "即将出发" : "进行中的旅行"}
                  </h2>
                </div>
                <span>{visibleTrips.length} 个行程</span>
              </div>
              <div className={styles.cardGrid}>
                {visibleTrips
                  .filter((trip) => trip.id !== nextTrip?.id)
                  .map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      statusLabel="即将出发"
                      onDetail={openDetail}
                    />
                  ))}
              </div>
              {visibleTrips.length === 1 ? (
                <p className={styles.onlyHeroNote}>
                  下一次旅行已在上方重点展示。
                </p>
              ) : null}
            </section>
          ) : (
            <EmptyState
              title={
                activeTab === "upcoming"
                  ? "当前没有即将出发的旅行"
                  : tripLibraryEmptyCopy.all.title
              }
              body={tripLibraryEmptyCopy.all.body}
              withAction
            />
          )
        ) : null}

        {activeTab === "all" && visibleHistory.length ? (
          <section
            className={styles.librarySection}
            data-library-section="recent"
            aria-labelledby="recent-trip-heading"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>RECENT JOURNEYS</p>
                <h2 id="recent-trip-heading">最近完成</h2>
              </div>
              <button
                type="button"
                className={styles.textButton}
                onClick={() => changeTab("history")}
              >
                查看全部历史 <PersonalIcon name="chevronRight" />
              </button>
            </div>
            <div className={styles.cardGrid}>
              {visibleHistory.slice(0, 2).map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  statusLabel="已完成"
                  onDetail={openDetail}
                />
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "drafts" ? (
          visibleDrafts.length ? (
            <section
              className={styles.librarySection}
              data-library-section="drafts"
              aria-labelledby="draft-heading"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>DRAFTS</p>
                  <h2 id="draft-heading">未完成的旅行草稿</h2>
                </div>
                <span>{visibleDrafts.length} 个草稿</span>
              </div>
              <div className={styles.draftGrid}>
                {visibleDrafts.map((draft) => (
                  <article className={styles.draftCard} key={draft.id}>
                    <div className={styles.draftImage}>
                      <Image
                        src={draft.cover}
                        alt=""
                        fill
                        sizes="(max-width: 767px) 100vw, 280px"
                      />
                    </div>
                    <div className={styles.draftBody}>
                      <span className={styles.draftChip}>
                        草稿 · {draft.progress}%
                      </span>
                      <h3>{draft.name}</h3>
                      <p>
                        {draft.destination} · {draft.dateLabel}
                      </p>
                      <p>{draft.lastEditedLabel}</p>
                      {draft.hasExternalReservation ? (
                        <p className={styles.externalNote}>
                          <PersonalIcon name="info" />含{" "}
                          {draft.reservationCount} 项外部预订记录
                        </p>
                      ) : null}
                      <div className={styles.cardActions}>
                        <GuardedLink
                          className={styles.primaryButton}
                          href={plannerBridgeHref}
                        >
                          继续编辑
                        </GuardedLink>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => {
                            setDeleteTarget(draft);
                            deleteDialogRef.current?.showModal();
                          }}
                        >
                          <PersonalIcon name="trash" />
                          删除
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <EmptyState title={tripLibraryEmptyCopy.drafts.title} />
          )
        ) : null}

        {activeTab === "history" ? (
          visibleHistory.length ? (
            <section
              className={styles.librarySection}
              data-library-section="history"
              aria-labelledby="history-heading"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>HISTORY</p>
                  <h2 id="history-heading">旅行足迹</h2>
                </div>
                <span>{visibleHistory.length} 段旅程</span>
              </div>
              <div className={styles.timeline}>
                {groupHistoryByYear(visibleHistory).map((group) => (
                  <section
                    key={group.year}
                    className={styles.yearGroup}
                    aria-labelledby={`year-${group.year}`}
                  >
                    <h3 id={`year-${group.year}`}>{group.year}</h3>
                    <div className={styles.historyGrid}>
                      {group.trips.map((trip) => (
                        <article className={styles.historyCard} key={trip.id}>
                          <div className={styles.historyImage}>
                            <Image
                              src={trip.cover}
                              alt=""
                              fill
                              sizes="(max-width: 767px) 100vw, 300px"
                            />
                          </div>
                          <div>
                            <p>
                              {trip.destination} · {trip.durationLabel}
                            </p>
                            <h4>{trip.name}</h4>
                            <p>
                              {trip.dateLabel} · {trip.companionCount} 人同行
                            </p>
                            <div className={styles.historyActions}>
                              <button
                                type="button"
                                onClick={() => {
                                  setRecapTarget(trip);
                                  recapDialogRef.current?.showModal();
                                }}
                              >
                                旅行回顾
                              </button>
                              <button
                                type="button"
                                aria-label={
                                  trip.favorite
                                    ? `取消收藏${trip.name}`
                                    : `收藏${trip.name}`
                                }
                                onClick={() => toggleFavorite(trip)}
                              >
                                {trip.favorite ? "♥ 已收藏" : "♡ 收藏"}
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ) : (
            <EmptyState title={tripLibraryEmptyCopy.history.title} />
          )
        ) : null}

        {activeTab === "favorites" ? (
          <section
            className={styles.librarySection}
            data-library-section="favorites"
            aria-labelledby="favorite-heading"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>FAVORITES</p>
                <h2 id="favorite-heading">我的收藏</h2>
              </div>
              <span>{visibleFavorites.length} 项</span>
            </div>
            <div className={styles.filterChips} aria-label="收藏类型筛选">
              {favoriteCategoryFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  aria-pressed={favoriteFilter === filter.key}
                  onClick={() => setFavoriteFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {visibleFavorites.length ? (
              <div className={styles.favoriteGrid}>
                {visibleFavorites.map((item) => (
                  <article className={styles.favoriteCard} key={item.id}>
                    <div className={styles.favoriteImage}>
                      <Image
                        src={item.cover}
                        alt=""
                        fill
                        sizes="(max-width: 767px) 100vw, 300px"
                      />
                      <span>{categoryLabels[item.category]}</span>
                    </div>
                    <div className={styles.favoriteBody}>
                      <p>{item.destination}</p>
                      <h3>{item.name}</h3>
                      <p>{item.summary}</p>
                      <div className={styles.favoriteActions}>
                        <button type="button" onClick={() => openDetail(item)}>
                          查看详情
                        </button>
                        <button
                          type="button"
                          disabled={addedFavorites.has(item.id)}
                          onClick={() => addFavoriteToTrip(item)}
                        >
                          {addedFavorites.has(item.id)
                            ? "已加入候选"
                            : "加入行程"}
                        </button>
                        <button
                          type="button"
                          className={styles.removeFavorite}
                          onClick={() => {
                            setFavorites((current) =>
                              removeFavorite(current, item.id),
                            );
                            setFeedback(`已从本页收藏中移除“${item.name}”。`);
                          }}
                        >
                          移除
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title={tripLibraryEmptyCopy.favorites.title}
                body={tripLibraryEmptyCopy.favorites.body}
              />
            )}
          </section>
        ) : null}
      </main>

      <aside className={styles.boundaryNote} aria-label="当前实现边界">
        <strong>当前为 UI 演示资料库</strong>
        <span>Persistence: Mock / in-memory only</span>
        <span>WBS 5.18 Trip 数据聚合与映射：未实现</span>
        <span>WBS 5.19 预订同步：未实现</span>
        <span>A Trip Plan Contract：未集成</span>
        <span>Reservation Hub：未实现</span>
      </aside>

      <dialog
        ref={deleteDialogRef}
        className={styles.dialog}
        aria-labelledby="delete-draft-title"
        onCancel={(event) => {
          event.preventDefault();
          closeDeleteDialog();
        }}
      >
        <div className={styles.dialogHeading}>
          <div>
            <p className={styles.eyebrow}>DELETE DRAFT</p>
            <h2 id="delete-draft-title">删除“{deleteTarget?.name}”？</h2>
          </div>
          <button
            type="button"
            aria-label="关闭删除确认"
            onClick={closeDeleteDialog}
          >
            <PersonalIcon name="close" />
          </button>
        </div>
        {deleteTarget?.hasExternalReservation ? (
          <div className={styles.dialogWarning}>
            <PersonalIcon name="info" />
            <p>
              此草稿含 {deleteTarget.reservationCount}{" "}
              项外部预订记录。删除只会移除本页展示草稿，
              <strong>不会取消酒店、门票、餐厅或交通合作方的预订。</strong>
            </p>
          </div>
        ) : (
          <p>此操作只影响当前页面内存中的草稿，刷新页面后会恢复演示数据。</p>
        )}
        <div className={styles.dialogActions}>
          <button type="button" onClick={closeDeleteDialog}>
            取消
          </button>
          <button
            type="button"
            className={styles.confirmDanger}
            onClick={confirmDeleteDraft}
          >
            确认删除
          </button>
        </div>
      </dialog>

      <dialog
        ref={recapDialogRef}
        className={styles.dialog}
        aria-labelledby="recap-title"
        onCancel={(event) => {
          event.preventDefault();
          closeRecap();
        }}
      >
        <div className={styles.dialogHeading}>
          <div>
            <p className={styles.eyebrow}>TRIP RECAP</p>
            <h2 id="recap-title">{recapTarget?.name}</h2>
          </div>
          <button type="button" aria-label="关闭旅行回顾" onClick={closeRecap}>
            <PersonalIcon name="close" />
          </button>
        </div>
        <p>
          {recapTarget?.dateLabel} · {recapTarget?.durationLabel}
        </p>
        <ul className={styles.recapList}>
          {recapTarget?.recap.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className={styles.dialogActions}>
          {recapTarget ? (
            <button type="button" onClick={() => toggleFavorite(recapTarget)}>
              {recapTarget.favorite ? "♥ 取消收藏" : "♡ 收藏旅程"}
            </button>
          ) : null}
          {recapTarget ? (
            <button
              type="button"
              className={styles.dialogPrimary}
              onClick={() => copyHistory(recapTarget)}
            >
              复制为新草稿
            </button>
          ) : null}
        </div>
      </dialog>

      <dialog
        ref={detailDialogRef}
        className={styles.dialog}
        aria-labelledby="detail-title"
        onCancel={(event) => {
          event.preventDefault();
          closeDetail();
        }}
      >
        <div className={styles.dialogHeading}>
          <div>
            <p className={styles.eyebrow}>VIEW-ONLY DETAIL</p>
            <h2 id="detail-title">{detailTarget?.name}</h2>
          </div>
          <button type="button" aria-label="关闭详情" onClick={closeDetail}>
            <PersonalIcon name="close" />
          </button>
        </div>
        <p>
          {detailTarget?.destination} ·{" "}
          {detailTarget && "summary" in detailTarget
            ? detailTarget.summary
            : detailTarget?.dateLabel}
        </p>
        <div className={styles.deferredBox}>
          <strong>价格与预订操作暂不可用</strong>
          <span>
            正式详情、实时价格与 Reservation Hub 将在后续契约落地后接入。
          </span>
        </div>
        <div className={styles.dialogActions}>
          <button type="button" onClick={closeDetail}>
            关闭
          </button>
        </div>
      </dialog>
    </div>
  );
}
