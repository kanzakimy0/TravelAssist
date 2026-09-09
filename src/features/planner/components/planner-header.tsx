import Link from "next/link";
import { useRef, useState, type Dispatch } from "react";

import type { TripAction, TripState } from "../model/trip-model";
import { currentPlan, pendingItems } from "../model/trip-model";
import styles from "../planner.module.css";
import { PlannerIcon } from "./planner-icon";
import { PlannerPopover } from "./planner-popover";

export function PlannerHeader({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const places = state.places
    .filter(
      (place) =>
        !place.structural &&
        `${place.name} ${place.city}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .slice(0, 8);
  const pending = pendingItems(currentPlan(state)).length;

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="TravelAssist 首页">
        <span>
          <PlannerIcon name="torii" />
        </span>
        TravelAssist
      </Link>
      <nav className={styles.headerNav} aria-label="Planner 导航">
        <Link href="/start">新旅行</Link>
        <Link href="/planner" aria-current="page">
          AI 行程规划
        </Link>
      </nav>
      <h1 className={styles.srOnly}>旅行规划 · {currentPlan(state).name}</h1>
      <button
        ref={trigger}
        type="button"
        className={styles.searchTrigger}
        aria-label="搜索示例地点"
        aria-expanded={searchOpen}
        aria-controls={searchOpen ? "planner-search" : undefined}
        onClick={() => setSearchOpen((open) => !open)}
      >
        <PlannerIcon name="search" />
        <span>搜索景点 · 城市 · 酒店…</span>
      </button>
      <button
        type="button"
        className={styles.reminderButton}
        aria-label={`待预约提醒，${pending} 项`}
        title="查看待预约清单（示例）"
        onClick={() => dispatch({ type: "ui", patch: { bookingOpen: true } })}
      >
        <PlannerIcon name="bell" />
        {pending > 0 && <i aria-hidden="true" />}
      </button>
      <Link
        className={styles.accountLink}
        href="/personal-center"
        aria-label="个人中心"
      >
        <span className={styles.avatar}>
          <PlannerIcon name="users" />
        </span>
        <PlannerIcon name="chevron" />
      </Link>
      {searchOpen && (
        <PlannerPopover
          id="planner-search"
          title="探索旅行地点"
          trigger={trigger}
          onClose={() => setSearchOpen(false)}
        >
          <label className={styles.field}>
            搜索当前示例目录
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入景点、城市或酒店名称"
            />
          </label>
          <p className={styles.hint}>
            仅检索本地示例数据，不连接地图搜索服务。
          </p>
          <div className={styles.searchResults}>
            {places.map((place) => (
              <button
                type="button"
                key={place.id}
                onClick={() => {
                  setSearchOpen(false);
                  dispatch({ type: "inspect", id: place.id, level: "detail" });
                }}
              >
                <span>{place.name}</span>
                <small>{place.city}</small>
                <PlannerIcon name="chevron" />
              </button>
            ))}
            {!places.length && (
              <p role="status">暂无匹配的示例地点，请换个关键词。</p>
            )}
          </div>
        </PlannerPopover>
      )}
    </header>
  );
}
