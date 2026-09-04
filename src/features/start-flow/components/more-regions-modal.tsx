"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { ALL_PREFECTURES, JAPAN_REGIONS } from "../model/japan-regions";
import styles from "../start-flow.module.css";
import { Modal } from "./modal";

interface MoreRegionsModalProps {
  onClose: () => void;
  onConfirm: (values: string[]) => void;
  selected: string[];
}

export function MoreRegionsModal({
  onClose,
  onConfirm,
  selected,
}: MoreRegionsModalProps) {
  const [pending, setPending] = useState(selected);
  const [activeRegion, setActiveRegion] = useState("kanto");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const currentRegion =
    JAPAN_REGIONS.find((region) => region.id === activeRegion) ??
    JAPAN_REGIONS[0];
  const visiblePrefectures = useMemo(
    () =>
      normalizedQuery
        ? ALL_PREFECTURES.filter((prefecture) =>
            prefecture.name.toLowerCase().includes(normalizedQuery),
          )
        : currentRegion.prefectures,
    [currentRegion.prefectures, normalizedQuery],
  );

  function togglePrefecture(prefecture: string) {
    setPending((current) =>
      current.includes(prefecture)
        ? current.filter((item) => item !== prefecture)
        : [...current, prefecture],
    );
  }

  return (
    <Modal
      description="地图负责主操作，右侧列表用于精确选择；支持跨区域多选。"
      onClose={onClose}
      title="选择更多地区"
      wide
    >
      <div className={styles.regionModalLayout}>
        <div className={styles.regionMapPanel}>
          <p className={styles.modalSectionTitle}>日本 9 大区域</p>
          <svg
            aria-label="可交互的日本区域简化地图"
            className={styles.japanRegionMap}
            role="group"
            viewBox="0 0 350 500"
          >
            <path
              className={styles.mapSeaRoute}
              d="M310 77C267 169 252 229 177 277S66 357 42 438"
            />
            {JAPAN_REGIONS.map((region) => {
              const selectedCount = region.prefectures.filter((prefecture) =>
                pending.includes(prefecture.id),
              ).length;
              const active = activeRegion === region.id;
              return (
                <g
                  aria-label={`${region.name}，${region.prefectures.length} 个都道府县，已选 ${selectedCount}`}
                  aria-pressed={active}
                  className={styles.mapRegion}
                  data-active={active}
                  data-selected={selectedCount > 0}
                  key={region.id}
                  onClick={() => {
                    setActiveRegion(region.id);
                    setQuery("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveRegion(region.id);
                      setQuery("");
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <path d={region.mapPath} />
                  <text x={region.labelX} y={region.labelY}>
                    {region.name}
                  </text>
                  {selectedCount ? (
                    <text
                      className={styles.mapSelectionCount}
                      x={region.labelX}
                      y={region.labelY + 15}
                    >
                      已选 {selectedCount}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
          <div className={styles.regionTabs}>
            {JAPAN_REGIONS.map((region) => (
              <button
                aria-pressed={activeRegion === region.id}
                data-active={activeRegion === region.id}
                key={region.id}
                onClick={() => {
                  setActiveRegion(region.id);
                  setQuery("");
                }}
                type="button"
              >
                {region.name}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.prefecturePanel}>
          <label className={styles.searchField}>
            <span>搜索 47 都道府县</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例如：长野、京都、冲绳"
              type="search"
              value={query}
            />
          </label>
          <div className={styles.prefectureList}>
            <p>
              {normalizedQuery ? "搜索结果" : currentRegion.name} · 共{" "}
              {visiblePrefectures.length} 项
            </p>
            <div>
              {visiblePrefectures.map((prefecture) => (
                <label key={prefecture.id}>
                  <input
                    checked={pending.includes(prefecture.id)}
                    onChange={() => togglePrefecture(prefecture.id)}
                    type="checkbox"
                  />
                  <span>{prefecture.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className={styles.selectedSummary}>
            <p>已选择 {pending.length} 个</p>
            <div>
              {pending.length ? (
                pending.map((prefecture) => (
                  <button
                    aria-label={`移除${prefecture}`}
                    key={prefecture}
                    onClick={() => togglePrefecture(prefecture)}
                    type="button"
                  >
                    {prefecture} ×
                  </button>
                ))
              ) : (
                <span>尚未选择</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.modalActions}>
        <Button
          disabled={pending.length === 0}
          onClick={() => setPending([])}
          variant="ghost"
        >
          清除
        </Button>
        <span />
        <Button onClick={onClose} variant="secondary">
          取消
        </Button>
        <Button
          onClick={() => {
            onConfirm(pending);
            onClose();
          }}
        >
          确认选择
        </Button>
      </div>
    </Modal>
  );
}
