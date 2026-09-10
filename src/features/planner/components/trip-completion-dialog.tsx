import { useEffect, useState } from "react";
import { PlannerOverlay } from "./planner-overlay";
import { currentPlan, type TripState } from "../model/trip-model";
import type {
  DetailDraftState,
  DetailRailItem,
} from "../model/detail-workspace";
import {
  memberMismatch,
  memberSnapshot,
  mergeMembers,
  preparationFingerprint,
  preparationFor,
  preparationIssues,
  type PreparationIssue,
  type Preparation,
} from "../model/trip-preparation";
import {
  COMPANION_LIBRARY_KEY,
  parseCompanionLibrary,
  type CompanionLibrary,
} from "../../companions/companion-library";
import {
  initialCompanions,
  initialCompanionGroups,
} from "../../companions/companion-data";
import type { AgeGroup } from "../../companions/companion-view-model";
import css from "../trip-preparation.module.css";

export function TripCompletionDialog({
  state,
  draft,
  items,
  onClose,
  onSave,
  onResolve,
  overwriteRequired,
  status,
}: {
  state: TripState;
  draft: DetailDraftState;
  items: DetailRailItem[];
  onClose: () => void;
  onSave: (
    trip: TripState,
    draft: DetailDraftState,
    overwrite: boolean,
  ) => boolean;
  onResolve: (
    issue: PreparationIssue,
    name: string,
    preparation: Preparation,
  ) => void;
  overwriteRequired: boolean;
  status: string;
}) {
  const plan = currentPlan(state);
  const [name, setName] = useState(plan.name);
  const [p, setP] = useState<Preparation>(() =>
    structuredClone(preparationFor(draft, plan.id)),
  );
  const [library, setLibrary] = useState<CompanionLibrary>({
    version: 1,
    companions: [],
    groups: [],
  });
  const [libraryNote, setLibraryNote] = useState("读取同行人…");
  const [tab, setTab] = useState<"groups" | "people">("groups");
  const [ack, setAck] = useState(false),
    [overwrite, setOverwrite] = useState(false),
    [failed, setFailed] = useState(false);
  const [temporary, setTemporary] = useState<AgeGroup>("adult");
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(COMPANION_LIBRARY_KEY),
          saved = parseCompanionLibrary(raw);
        if (raw && !saved) {
          setLibraryNote(
            "本地同行人资料不可读；请到个人中心核对。仍可添加临时成员。",
          );
          return;
        }
        setLibrary(
          saved ?? {
            version: 1,
            companions: initialCompanions,
            groups: initialCompanionGroups,
          },
        );
        setLibraryNote(
          saved
            ? "读取个人中心已保存的本地资料；仅导入姓名与年龄组，不复制私人备注。"
            : "尚未保存个人资料，下列为演示成员；无账号可使用临时成员。",
        );
      } catch {
        setLibraryNote("浏览器存储不可用；仍可编辑临时成员，但保存可能失败。");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const problems = preparationIssues(state, items, p);
  const affected = new Set(problems.map((i) => i.id)).size;
  const mismatch = memberMismatch(state, p.members);
  const target = Object.values(state.configuration.travelers).reduce(
    (a, b) => a + b,
    0,
  );
  const labels = {
    adult: "成人",
    senior: "老人",
    child: "儿童",
    infant: "婴幼儿",
  };
  const ready =
    Boolean(name.trim()) &&
    !mismatch.length &&
    (!affected || ack) &&
    (!overwriteRequired || overwrite);
  function submit() {
    const next = {
      ...state,
      plans: state.plans.map((x) =>
        x.id === plan.id ? { ...x, name: name.trim() } : x,
      ),
    };
    const completed = {
      at: new Date().toISOString(),
      fingerprint: preparationFingerprint(next, draft, p),
      acknowledged: ack,
    };
    if (
      onSave(
        next,
        {
          ...draft,
          preparations: {
            ...draft.preparations,
            [plan.id]: { ...p, completed },
          },
        },
        overwrite,
      )
    )
      onClose();
    else setFailed(true);
  }
  return (
    <PlannerOverlay
      kind="detail"
      title="完成行程 · 出发前确认"
      className={css.completion}
      onClose={onClose}
    >
      <div className={css.body}>
        <section>
          <span className={css.eyebrow}>完成规划，不是结束旅行</span>
          <label className={css.name}>
            行程名称
            <input
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <p>
            {state.settings.startDate} → {state.configuration.returnDate} ·{" "}
            {plan.days.length}天 · {target}人 · 仅保存到此浏览器
          </p>
        </section>
        <section>
          <h3>
            出行成员{" "}
            <small>
              已匹配 {p.members.length}/{target} 人
            </small>
          </h3>
          <div className={css.members}>
            {p.members.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() =>
                  setP({
                    ...p,
                    members: p.members.filter((x) => x.id !== m.id),
                  })
                }
                aria-label={`移除${m.name}`}
              >
                {m.name} · {labels[m.ageGroup]}
                {m.temporary ? " · 临时" : ""} ×
              </button>
            ))}
          </div>
          <p className={css.note}>{libraryNote}</p>
          <div className={css.tabs}>
            <button
              type="button"
              aria-pressed={tab === "groups"}
              onClick={() => setTab("groups")}
            >
              选择组合
            </button>
            <button
              type="button"
              aria-pressed={tab === "people"}
              onClick={() => setTab("people")}
            >
              选择单人
            </button>
          </div>
          <div className={css.choices}>
            {tab === "groups"
              ? library.groups.map((g) => (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() =>
                      setP({
                        ...p,
                        members: mergeMembers(
                          p.members,
                          library.companions
                            .filter((c) => g.companionIds.includes(c.id))
                            .map(memberSnapshot),
                        ),
                      })
                    }
                  >
                    <strong>{g.name}</strong>
                    <small>
                      {g.companionIds.length}人 · 加入后可移除个别人
                    </small>
                  </button>
                ))
              : library.companions.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() =>
                      setP({
                        ...p,
                        members: mergeMembers(p.members, [memberSnapshot(c)]),
                      })
                    }
                  >
                    {c.displayName} · {labels[c.ageGroup]}
                    {c.isSelf ? " · 本人" : ""}
                  </button>
                ))}
          </div>
          <div className={css.inline}>
            <label>
              临时成员类型
              <select
                value={temporary}
                onChange={(e) => setTemporary(e.target.value as AgeGroup)}
              >
                {(Object.keys(labels) as AgeGroup[]).map((k) => (
                  <option key={k} value={k}>
                    {labels[k]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={p.members.length >= 100}
              onClick={() =>
                setP({
                  ...p,
                  members: [
                    ...p.members,
                    {
                      id: `guest-${crypto.randomUUID()}`,
                      name: `${labels[temporary]} ${p.members.filter((x) => x.ageGroup === temporary).length + 1}`,
                      ageGroup: temporary,
                      temporary: true,
                    },
                  ],
                })
              }
            >
              ＋ 添加临时成员
            </button>
          </div>
          {!!mismatch.length && (
            <p role="alert" className={css.warning}>
              成员构成必须与计划一致：{mismatch.join("；")}
              。可移除或补选，不会自动改写计划人数。
            </p>
          )}
        </section>
        <section>
          <h3>
            全程出发检查 <small>涉及 {affected} 个项目</small>
          </h3>
          <div className={css.metrics}>
            {(["error", "warning", "booking", "missing"] as const).map(
              (tone, i) => (
                <div key={tone} data-tone={tone}>
                  <strong>
                    {
                      new Set(
                        problems
                          .filter((x) => x.tone === tone)
                          .map((x) => x.id),
                      ).size
                    }
                  </strong>
                  <span>{["有问题", "需确认", "待预约", "信息待补"][i]}</span>
                </div>
              ),
            )}
          </div>
          <small>分类可能重叠，不直接相加。检查覆盖整个行程。</small>
          <div className={css.problems}>
            {problems.slice(0, 3).map((i, n) => (
              <button
                key={`${i.id}-${n}`}
                type="button"
                onClick={() => onResolve(i, name, p)}
              >
                <strong>{i.title}</strong>
                <span>{i.reason}</span>
                <small>去处理 →</small>
              </button>
            ))}
          </div>
          {problems.length > 3 && (
            <details>
              <summary>查看全部 {problems.length} 条提醒</summary>
              <div className={css.problems}>
                {problems.slice(3).map((i, n) => (
                  <button
                    key={`${i.id}-${n}`}
                    type="button"
                    onClick={() => onResolve(i, name, p)}
                  >
                    {i.title} · {i.reason} →
                  </button>
                ))}
              </div>
            </details>
          )}
          <p className={css.warning}>
            若出发时仍存在时间冲突、地点缺失或预约未确认，未来手机助手的导航、提醒和预约协助可能受影响。当前未连接手机助手；本地检查不代表实时可执行性验证。
          </p>
          {affected > 0 && (
            <label className={css.check}>
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              我已了解，保存后继续处理这些事项
            </label>
          )}
          {overwriteRequired && (
            <label className={css.check}>
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
              />
              替换此浏览器已保存的另一方案（仅保留一份）
            </label>
          )}
          {failed && (
            <p role="alert" className={css.warning}>
              {status} · 未完成保存，内容仍保留。
            </p>
          )}
        </section>
      </div>
      <footer className={css.actions}>
        <button type="button" onClick={onClose}>
          继续修改
        </button>
        <button type="button" disabled={!ready} onClick={submit}>
          {affected ? `保存并保留 ${affected} 项待办` : "完成规划并保存"}
        </button>
      </footer>
    </PlannerOverlay>
  );
}
