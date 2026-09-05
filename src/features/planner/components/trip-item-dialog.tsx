import { useEffect, useRef, useState } from "react";

import type {
  DetailDraftItem,
  DetailItemKind,
  DetailRailItem,
} from "../model/detail-workspace";
import styles from "../detail-workspace.module.css";

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
}: {
  item: DetailRailItem;
  trigger: HTMLElement | null;
  onClose: () => void;
  onSave: (patch: {
    title: string;
    startTime: string;
    endTime: string;
  }) => void;
  onLock: () => void;
  onDelete: () => void;
  onComplete: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(item.title);
  const [startTime, setStartTime] = useState(item.startTime);
  const [endTime, setEndTime] = useState(item.endTime);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      trigger?.focus({ preventScroll: true });
    };
  }, [trigger]);

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
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ title, startTime, endTime });
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
          <span data-status={item.aiStatus}>AI：{item.aiStatus}</span>
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

        <footer>
          <button type="submit">调整时间 / 更改内容</button>
          <button type="button" onClick={onLock} disabled={item.draft}>
            {item.locked ? "解除锁定" : "锁定"}
          </button>
          <button type="button" onClick={onDelete}>
            删除
          </button>
          <button type="button" onClick={onComplete}>
            完成（本地）
          </button>
        </footer>
      </form>
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
  day,
  trigger,
  onClose,
  onAdd,
}: {
  day: number;
  trigger: HTMLElement | null;
  onClose: () => void;
  onAdd: (item: DetailDraftItem) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<DetailItemKind>("attraction");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [note, setNote] = useState("");

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      trigger?.focus({ preventScroll: true });
    };
  }, [trigger]);

  return (
    <dialog
      ref={dialog}
      className={styles.itemDialog}
      aria-labelledby="add-trip-item-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => trapDialogFocus(event.currentTarget, event)}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onAdd({
            id: `detail-draft-${Date.now()}`,
            day,
            title: title.trim(),
            startTime,
            endTime,
            type,
            note: note.trim(),
          });
        }}
      >
        <header>
          <div>
            <span>DAY {day} · LOCAL DRAFT</span>
            <h2 id="add-trip-item-title">新增行程项目</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭新增行程">
            ×
          </button>
        </header>
        <p className={styles.dialogNotice}>
          仅保存为当前浏览器 Mock 草稿，不会创建云端行程或真实订单。
        </p>
        <div className={styles.editGrid}>
          <label>
            类型
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as DetailItemKind)
              }
            >
              {addTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
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
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button type="submit">加入本地草稿</button>
        </footer>
      </form>
    </dialog>
  );
}
