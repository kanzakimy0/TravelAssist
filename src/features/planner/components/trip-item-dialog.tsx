import { useEffect, useRef, useState } from "react";

import type {
  DetailDraftItem,
  DetailItemKind,
  DetailRailItem,
} from "../model/detail-workspace";
import styles from "../detail-workspace.module.css";
import { validDetailLocation } from "../model/detail-workspace";
import type { PlannerPlace } from "../model/trip-model";
import { validateSchedule } from "../model/schedule-check";

function trapDialogFocus(
  dialog: HTMLDialogElement,
  event: React.KeyboardEvent<HTMLDialogElement>,
) {
  if (event.key !== "Tab") return;
  const focusable = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hidden);
  const first = focusable.at(0);
  const last = focusable.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function TripItemDialog({
  item,
  trigger,
  onClose,
  onSave,
  onLock,
  onDelete,
  onComplete,
  embedded = false,
}: {
  item: DetailRailItem;
  trigger: HTMLElement | null;
  onClose: () => void;
  onSave: (patch: {
    title: string;
    startTime: string;
    endTime: string;
  }) => string | void;
  onLock: () => void;
  onDelete: () => void;
  onComplete: () => void;
  embedded?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(item.title);
  const [startTime, setStartTime] = useState(item.startTime);
  const [endTime, setEndTime] = useState(item.endTime);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (embedded) return;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      trigger?.focus({ preventScroll: true });
    };
  }, [trigger, embedded]);

  const form = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const invalid = validateSchedule({ title, startTime, endTime });
        if (invalid) {
          setFeedback(invalid);
          return;
        }
        setFeedback(
          onSave({ title, startTime, endTime }) || "已更新本地草稿，尚未保存。",
        );
      }}
    >
      <header>
        <div>
          <span>{item.typeLabel}</span>
          <h2 id="trip-item-dialog-title">{item.title}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭行程项目详情">
          ×
        </button>
      </header>

      <section className={styles.dialogStatus} aria-label="项目状态">
        <span data-status={item.aiStatus}>
          检查：
          {
            { normal: "正常", warning: "需确认", error: "有问题" }[
              item.aiStatus
            ]
          }
        </span>
        <span data-reservation={item.reservation}>
          预约：{item.reservationLabel}
        </span>
      </section>

      <section className={styles.dialogSection}>
        <h3>详情</h3>
        <div className={styles.editGrid}>
          <label>
            内容
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            开始
            <input
              required
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
          <label>
            结束
            <input
              required
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </label>
        </div>
        <dl>
          <div>
            <dt>地点</dt>
            <dd>{item.placeId ? "现有 Planner 地点" : "本地草稿地点"}</dd>
          </div>
          <div>
            <dt>交通</dt>
            <dd>沿用相邻节点 Mock 信息，真实路线未接入</dd>
          </div>
          <div>
            <dt>备注</dt>
            <dd>{item.note || "暂无备注"}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.dialogSection}>
        <h3>AI 判断 · 本地模拟</h3>
        <p>{item.aiReason}</p>
        <p>影响：当前项目及之后的当日节点；没有自动覆盖正式行程。</p>
        <p>数据状态：无实时 Weather / Traffic / Booking Provider。</p>
        <p>建议：确认预约与交通缓冲后再执行。</p>
      </section>

      <p role="status" aria-live="polite">
        {feedback}
      </p>
      <footer>
        <button type="submit">调整时间 / 更改内容</button>
        <button type="button" onClick={onLock} disabled={item.draft}>
          {item.locked ? "解除锁定" : "锁定"}
        </button>
        <button type="button" onClick={onDelete}>
          删除
        </button>
        <button type="button" onClick={onComplete}>
          {item.completed ? "撤销完成" : "完成（本地）"}
        </button>
      </footer>
    </form>
  );
  if (embedded) return <div data-inline-trip-editor>{form}</div>;
  return (
    <dialog
      ref={dialog}
      className={styles.itemDialog}
      aria-labelledby="trip-item-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => trapDialogFocus(event.currentTarget, event)}
    >
      {form}
    </dialog>
  );
}

const addTypes: { value: DetailItemKind; label: string }[] = [
  { value: "attraction", label: "景点" },
  { value: "restaurant", label: "餐饮" },
  { value: "transport", label: "交通" },
  { value: "hotel", label: "酒店" },
  { value: "parking", label: "停车" },
  { value: "activity", label: "活动" },
  { value: "task", label: "任务" },
  { value: "custom", label: "自定义" },
];

export function AddTripItemDialog({
  embedded = false,
  day,
  trigger,
  onClose,
  onAdd,
  validate,
  places = [],
  initialType = "attraction",
  onConflictTest,
}: {
  embedded?: boolean;
  day: number;
  trigger: HTMLElement | null;
  onClose: () => void;
  onAdd: (item: DetailDraftItem) => void;
  validate?: (item: DetailDraftItem) => string;
  places?: PlannerPlace[];
  initialType?: DetailItemKind;
  onConflictTest?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<DetailItemKind>(initialType);
  const [locationMode, setLocationMode] = useState<"catalog" | "manual">(
    "catalog",
  );
  const [query, setQuery] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");
  const place = places.find(
    (place) => place.id === placeId && place.type === type,
  );
  const needsLocation = type !== "task" && type !== "custom";
  const candidates = places
    .filter(
      (place) =>
        place.type === type &&
        `${place.name} ${place.city}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .slice(0, 5);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (embedded) return;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      trigger?.focus({ preventScroll: true });
    };
  }, [trigger, embedded]);

  const form = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const location = !needsLocation
          ? undefined
          : locationMode === "catalog" && place
            ? {
                source: "catalog" as const,
                coordinates: place.coordinates,
                placeId: place.id,
                label: place.name,
              }
            : locationMode === "manual" && longitude.trim() && latitude.trim()
              ? {
                  source: "manual" as const,
                  coordinates: [Number(longitude), Number(latitude)] as [
                    number,
                    number,
                  ],
                  label: title.trim(),
                }
              : undefined;
        const item: DetailDraftItem = {
          id: `detail-draft-${crypto.randomUUID()}`,
          day,
          title: title.trim(),
          startTime,
          endTime,
          type,
          note: note.trim(),
          ...(location ? { location } : {}),
        };
        const invalid = validateSchedule(item) || validate?.(item);
        if (invalid) {
          setError(invalid);
          return;
        }
        if (needsLocation && !validDetailLocation(location)) {
          setError(
            "请选择一个目录地点，或填写有效经纬度（经度 -180～180、纬度 -90～90）。",
          );
          return;
        }
        onAdd(item);
      }}
    >
      <header>
        <div>
          <span>DAY {day} · LOCAL DRAFT</span>
          <h2 id="add-trip-item-title">新增项目</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭新增项目">
          ×
        </button>
      </header>
      <p className={styles.dialogNotice}>
        仅保存为当前浏览器 Mock 草稿，不会创建云端行程或真实订单。
      </p>
      <div className={styles.editGrid}>
        <fieldset className={styles.projectTypes}>
          <legend>项目类型</legend>
          {addTypes.map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={type === option.value}
              onClick={() => {
                setType(option.value);
                setPlaceId("");
              }}
            >
              {option.label}
            </button>
          ))}
        </fieldset>
        {needsLocation && (
          <section
            className={`${styles.fullField} ${styles.projectLocation}`}
            aria-label="关联地图地点"
          >
            <h3>关联地图地点</h3>
            <div role="group" aria-label="定位方式">
              <button
                type="button"
                aria-pressed={locationMode === "catalog"}
                onClick={() => setLocationMode("catalog")}
              >
                匹配现有地点
              </button>
              <button
                type="button"
                aria-pressed={locationMode === "manual"}
                onClick={() => setLocationMode("manual")}
              >
                手动地图位置
              </button>
            </div>
            {locationMode === "catalog" ? (
              <>
                <label>
                  搜索现有地点
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="地点名称或城市"
                  />
                </label>
                <div className={styles.locationCandidates}>
                  {candidates.map((candidate) => (
                    <button
                      type="button"
                      key={candidate.id}
                      aria-pressed={placeId === candidate.id}
                      onClick={() => {
                        setPlaceId(candidate.id);
                        setTitle(candidate.name);
                      }}
                    >
                      {candidate.name}
                      <small>{candidate.city} · 选择并定位</small>
                    </button>
                  ))}
                  {!candidates.length && (
                    <p>目录暂无匹配，请切换手动地图位置。</p>
                  )}
                </div>
                {place && <p role="status">已关联：{place.name}</p>}
              </>
            ) : (
              <div className={styles.coordinateFields}>
                <label>
                  经度
                  <input
                    inputMode="decimal"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    placeholder="例如 139.7454"
                  />
                </label>
                <label>
                  纬度
                  <input
                    inputMode="decimal"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    placeholder="例如 35.6586"
                  />
                </label>
              </div>
            )}
            <small>
              仅查询现有示例目录，不是实时地点搜索。位置会标到地图并随草稿保存；不会自动计算新的交通路线。
            </small>
          </section>
        )}
        <label>
          名称
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          开始
          <input
            required
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </label>
        <label>
          结束
          <input
            required
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
        </label>
        <label className={styles.fullField}>
          备注
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </div>
      <footer>
        {error && <p role="alert">{error}</p>}
        <button type="button" onClick={onClose}>
          取消
        </button>
        <button type="submit">加入本地草稿</button>
      </footer>
      {onConflictTest && (
        <details className={styles.conflictTest}>
          <summary>测试工具 · 时间冲突示例</summary>
          <p>
            主动添加标有“测试”的重叠项目以检查红色提醒；不会自动保存，验证后可删除。
          </p>
          <button type="button" onClick={onConflictTest}>
            添加红色冲突测试
          </button>
        </details>
      )}
    </form>
  );
  if (embedded) return <div data-inline-add-project>{form}</div>;
  return (
    <dialog
      ref={dialog}
      className={styles.itemDialog}
      aria-labelledby="add-trip-item-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => trapDialogFocus(event.currentTarget, event)}
    >
      {form}
    </dialog>
  );
}
