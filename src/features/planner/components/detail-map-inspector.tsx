import { useEffect, useRef, type ReactNode } from "react";
import type { PlannerPlace, TripItem } from "../model/trip-model";
import type { DetailRailItem } from "../model/detail-workspace";
import { PlaceArtwork } from "./place-details";
import css from "../detail-map-inspector.module.css";

export function DetailMapInspector({
  place,
  draftItem,
  item,
  onClose,
  onEdit,
  actions,
  editor,
  onCloseEditor,
  focusSection,
  focusRevision,
}: {
  place?: PlannerPlace;
  draftItem?: DetailRailItem;
  item?: TripItem;
  onClose: () => void;
  onEdit?: (id: string, trigger: HTMLButtonElement) => void;
  actions?: ReactNode;
  editor?: ReactNode;
  onCloseEditor?: () => void;
  focusSection?: "advice" | "booking";
  focusRevision?: number;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [place?.id, draftItem?.id]);
  const actionHeading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusSection) {
      actionHeading.current?.focus({ preventScroll: true });
      actionHeading.current?.scrollIntoView({ block: "nearest" });
    }
  }, [focusSection, focusRevision, item?.id]);
  if (!place)
    return draftItem ? (
      <aside
        className={css.inspector}
        data-detail-map-inspector
        data-editing={Boolean(editor)}
        aria-label="项目详情框"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            if (editor) onCloseEditor?.();
            else onClose();
          }
        }}
      >
        <header>
          <div>
            <small>项目详情框</small>
            <small>{draftItem.typeLabel} · 本地草稿</small>
            <h2 ref={heading} tabIndex={-1}>
              {draftItem.title}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭项目详情框">
            ×
          </button>
        </header>
        {editor ? (
          <div className={css.editor}>{editor}</div>
        ) : (
          <div className={css.content}>
            <p>
              {draftItem.startTime}–{draftItem.endTime} ·{" "}
              {draftItem.durationLabel}
            </p>
            <p>{draftItem.note || "尚未补充备注"}</p>
            <p>{draftItem.aiReason}</p>
            <small>
              {draftItem.location
                ? `${draftItem.location.source === "catalog" ? "已匹配现有地点" : "手动地图位置"} · ${draftItem.location.label} · ${draftItem.location.coordinates.join(", ")}。已显示地图标记，路线尚未重新计算。`
                : "尚未关联地点，不显示虚构位置。"}
            </small>
          </div>
        )}
        {!editor && onEdit && (
          <footer>
            <button
              type="button"
              onClick={(event) => onEdit(draftItem.id, event.currentTarget)}
            >
              调整行程
            </button>
          </footer>
        )}
      </aside>
    ) : null;
  return (
    <aside
      className={css.inspector}
      data-detail-map-inspector
      data-editing={Boolean(editor)}
      aria-label="项目详情框"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          if (editor) onCloseEditor?.();
          else onClose();
        }
      }}
    >
      <header>
        <div>
          <small>项目详情框</small>
          <small>
            {place.city} ·{" "}
            {
              {
                attraction: "景点",
                activity: "活动",
                hotel: "住宿",
                restaurant: "餐饮",
                transport: "交通",
              }[place.type]
            }
          </small>
          <h2 ref={heading} tabIndex={-1}>
            {item?.title ?? place.name}
          </h2>
          {item && (
            <p>
              {item.startTime}–{item.endTime} · 第 {item.day} 天
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="关闭项目详情框">
          ×
        </button>
      </header>
      {editor ? (
        <div className={css.editor}>{editor}</div>
      ) : (
        <div className={css.content}>
          {focusSection && (
            <div
              ref={actionHeading}
              tabIndex={-1}
              data-focused-detail-section={focusSection}
            >
              {actions}
            </div>
          )}
          <PlaceArtwork place={place} />
          <div className={css.metrics}>
            <div>
              <small>建议停留</small>
              <strong>{place.duration} 分钟</strong>
            </div>
            <div>
              <small>开放时间</small>
              <strong>{place.hours}</strong>
            </div>
          </div>
          <section>
            <h3>安排说明</h3>
            <p>{place.why}</p>
          </section>
          <section>
            <h3>出行提醒</h3>
            <p>{place.advice}</p>
          </section>
          <div className={css.tags}>
            {place.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          {item && (
            <p className={css.schedule}>
              第 {item.day} 天 · {item.startTime} — {item.endTime}
              {item.fixedTime ? " · 固定时间" : ""}
            </p>
          )}
          <small>本地示例资料，开放时间及现场情况请以景点官方信息为准。</small>
          {!focusSection && actions}
        </div>
      )}
      {item && onEdit && !editor && (
        <footer>
          <button
            type="button"
            onClick={(event) => onEdit(item.id, event.currentTarget)}
          >
            调整行程
          </button>
        </footer>
      )}
    </aside>
  );
}
