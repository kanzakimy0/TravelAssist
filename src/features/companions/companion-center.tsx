"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePersonalNavigationGuard } from "@/features/personal-center/components/navigation-guard-context";

import {
  createEmptyCompanionDraft,
  initialCompanionGroups,
  initialCompanions,
} from "./companion-data";
import {
  activityPreferenceOptions,
  ageGroupOptions,
  countCompanions,
  deleteCompanion,
  diningNeedOptions,
  mobilityNeedOptions,
  saveCompanion,
  saveCompanionGroup,
  summarizeSpecialNeeds,
  validateCompanionDraft,
  validateGroupDraft,
  type CompanionDraft,
  type CompanionGroupDraft,
  type CompanionGroupViewModel,
  type CompanionViewModel,
} from "./companion-view-model";
import { CompanionCard } from "./components/companion-card";
import { CompanionGroupCard } from "./components/companion-group-card";
import styles from "./companion-center.module.css";

type EditorState =
  | { kind: "companion"; draft: CompanionDraft; initial: string }
  | { kind: "group"; draft: CompanionGroupDraft; initial: string };

type CompanionErrors = ReturnType<typeof validateCompanionDraft>;
type GroupErrors = ReturnType<typeof validateGroupDraft>;

function toggleListItem(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function cloneCompanion(companion: CompanionViewModel): CompanionDraft {
  return {
    ...companion,
    mobilityNeeds: [...companion.mobilityNeeds],
    diningNeeds: [...companion.diningNeeds],
    activityPreferences: [...companion.activityPreferences],
  };
}

function cloneGroup(group: CompanionGroupViewModel): CompanionGroupDraft {
  return { ...group, companionIds: [...group.companionIds] };
}

export function CompanionCenter() {
  const [companions, setCompanions] = useState(() =>
    initialCompanions.map(
      (companion) => cloneCompanion(companion) as CompanionViewModel,
    ),
  );
  const [groups, setGroups] = useState(() =>
    initialCompanionGroups.map((group) => ({
      ...group,
      companionIds: [...group.companionIds],
    })),
  );
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [companionErrors, setCompanionErrors] = useState<CompanionErrors>({});
  const [groupErrors, setGroupErrors] = useState<GroupErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<CompanionViewModel | null>(
    null,
  );
  const [discardOpen, setDiscardOpen] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const drawerRef = useRef<HTMLElement>(null);
  const deleteCancelRef = useRef<HTMLButtonElement>(null);
  const discardContinueRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const { setIsDirty } = usePersonalNavigationGuard();

  const counts = useMemo(() => countCompanions(companions), [companions]);
  const specialNeeds = useMemo(
    () => summarizeSpecialNeeds(companions),
    [companions],
  );
  const additionalCompanions = companions.filter(
    (companion) => !companion.isSelf,
  );
  const editorDirty = editor
    ? JSON.stringify(editor.draft) !== editor.initial
    : false;

  useEffect(() => setIsDirty(editorDirty), [editorDirty, setIsDirty]);
  useEffect(() => () => setIsDirty(false), [setIsDirty]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const closeEditor = useCallback(() => {
    setEditor(null);
    setDiscardOpen(false);
    setCompanionErrors({});
    setGroupErrors({});
    setIsDirty(false);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }, [setIsDirty]);

  const requestEditorClose = useCallback(() => {
    if (editorDirty) {
      setDiscardOpen(true);
      return;
    }
    closeEditor();
  }, [closeEditor, editorDirty]);

  useEffect(() => {
    if (!editor) return;
    const drawer = drawerRef.current;
    const focusTarget = drawer?.querySelector<HTMLElement>("[data-autofocus]");
    window.requestAnimationFrame(() => focusTarget?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (discardOpen || deleteTarget) return;
      if (event.key === "Escape") {
        event.preventDefault();
        requestEditorClose();
        return;
      }
      if (event.key !== "Tab" || !drawer) return;
      const focusable = [
        ...drawer.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [discardOpen, deleteTarget, editor, requestEditorClose]);

  useEffect(() => {
    if (deleteTarget) deleteCancelRef.current?.focus();
  }, [deleteTarget]);

  useEffect(() => {
    if (discardOpen) discardContinueRef.current?.focus();
  }, [discardOpen]);

  const openCompanionEditor = (draft: CompanionDraft, trigger: HTMLElement) => {
    returnFocusRef.current = trigger;
    setCompanionErrors({});
    setEditor({ kind: "companion", draft, initial: JSON.stringify(draft) });
  };

  const openGroupEditor = (
    draft: CompanionGroupDraft,
    trigger: HTMLElement,
  ) => {
    returnFocusRef.current = trigger;
    setGroupErrors({});
    setEditor({ kind: "group", draft, initial: JSON.stringify(draft) });
  };

  const updateCompanionDraft = (patch: Partial<CompanionDraft>) => {
    setEditor((current) =>
      current?.kind === "companion"
        ? { ...current, draft: { ...current.draft, ...patch } }
        : current,
    );
  };

  const updateGroupDraft = (patch: Partial<CompanionGroupDraft>) => {
    setEditor((current) =>
      current?.kind === "group"
        ? { ...current, draft: { ...current.draft, ...patch } }
        : current,
    );
  };

  const handleAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (
      editor?.kind === "companion" &&
      editor.draft.avatarUrl?.startsWith("blob:")
    ) {
      URL.revokeObjectURL(editor.draft.avatarUrl);
    }
    updateCompanionDraft({ avatarUrl: URL.createObjectURL(file) });
  };

  const submitCompanion = (event: FormEvent) => {
    event.preventDefault();
    if (editor?.kind !== "companion") return;
    const errors = validateCompanionDraft(editor.draft);
    setCompanionErrors(errors);
    if (Object.keys(errors).length) return;
    setCompanions((current) => saveCompanion(current, editor.draft));
    setNotice("同行人资料已保存");
    closeEditor();
  };

  const submitGroup = (event: FormEvent) => {
    event.preventDefault();
    if (editor?.kind !== "group") return;
    const errors = validateGroupDraft(editor.draft);
    setGroupErrors(errors);
    if (Object.keys(errors).length) return;
    setGroups((current) => saveCompanionGroup(current, editor.draft));
    setNotice("常用组合已保存");
    closeEditor();
  };

  const confirmDelete = () => {
    if (!deleteTarget || deleteTarget.isSelf) return;
    setCompanions((current) => deleteCompanion(current, deleteTarget.id));
    setGroups((current) =>
      current
        .map((group) => ({
          ...group,
          companionIds: group.companionIds.filter(
            (id) => id !== deleteTarget.id,
          ),
        }))
        .filter((group) => group.companionIds.length > 0),
    );
    setNotice(`${deleteTarget.displayName} 已从同行人中删除`);
    setDeleteTarget(null);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  const selectedNeedSummary = specialNeeds.find(
    (need) => need.label === selectedNeed,
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p>TRAVEL COMPANIONS</p>
          <h1>同行人</h1>
          <span>管理常用同行人，创建旅行时快速选择。</span>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={(event) =>
            openCompanionEditor(
              createEmptyCompanionDraft(),
              event.currentTarget,
            )
          }
          aria-label="添加同行人"
        >
          <span aria-hidden="true">＋</span> 添加同行人
        </button>
      </header>

      <section className={styles.summaryCard} aria-labelledby="summary-title">
        <div className={styles.summaryLead}>
          <span aria-hidden="true">伴</span>
          <div>
            <p id="summary-title">同行人总数</p>
            <strong>{counts.total}</strong>
            <small>含当前用户本人</small>
          </div>
        </div>
        <dl className={styles.countGrid}>
          {ageGroupOptions.map((option) => (
            <div key={option.value}>
              <dt>{option.label}</dt>
              <dd>{counts[option.value]}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.summaryActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={(event) =>
              openCompanionEditor(
                createEmptyCompanionDraft(),
                event.currentTarget,
              )
            }
          >
            ＋ 添加同行人
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={(event) => {
              const draft: CompanionGroupDraft = {
                name: "",
                description: "",
                companionIds: [companions[0]?.id].filter(Boolean),
              };
              openGroupEditor(draft, event.currentTarget);
            }}
          >
            创建常用组合
          </button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="companions-title">
        <div className={styles.sectionHeading}>
          <div>
            <p>MY COMPANIONS</p>
            <h2 id="companions-title">我的同行人</h2>
          </div>
          <span>卡片仅显示概括旅行标签，详细说明只在编辑页查看。</span>
        </div>
        <div className={styles.companionGrid}>
          {companions.map((companion) => (
            <CompanionCard
              key={companion.id}
              companion={companion}
              onEdit={(target, trigger) =>
                openCompanionEditor(cloneCompanion(target), trigger)
              }
              onDelete={(target, trigger) => {
                returnFocusRef.current = trigger;
                setDeleteTarget(target);
              }}
              onAddToGroup={(target, trigger) => {
                const group = groups[0];
                if (group) {
                  const draft = cloneGroup(group);
                  if (!draft.companionIds.includes(target.id)) {
                    draft.companionIds.push(target.id);
                  }
                  openGroupEditor(draft, trigger);
                } else {
                  openGroupEditor(
                    {
                      name: "",
                      description: "",
                      companionIds: [target.id],
                    },
                    trigger,
                  );
                }
              }}
            />
          ))}
        </div>
        {additionalCompanions.length === 0 ? (
          <div className={styles.emptyState}>
            <span aria-hidden="true">旅</span>
            <h3>还没有保存的同行人</h3>
            <p>添加家人、朋友或常用旅伴，以后创建旅行时可以一键选择。</p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={(event) =>
                openCompanionEditor(
                  createEmptyCompanionDraft(),
                  event.currentTarget,
                )
              }
            >
              ＋ 添加同行人
            </button>
          </div>
        ) : null}
      </section>

      <div className={styles.lowerGrid}>
        <section className={styles.section} aria-labelledby="groups-title">
          <div className={styles.sectionHeading}>
            <div>
              <p>FREQUENT GROUPS</p>
              <h2 id="groups-title">常用出行组合</h2>
            </div>
            <button
              type="button"
              className={styles.textButton}
              onClick={(event) =>
                openGroupEditor(
                  {
                    name: "",
                    description: "",
                    companionIds: [companions[0]?.id].filter(Boolean),
                  },
                  event.currentTarget,
                )
              }
            >
              ＋ 新建组合
            </button>
          </div>
          <div className={styles.groupList}>
            {groups.map((group) => (
              <CompanionGroupCard
                key={group.id}
                group={group}
                companions={companions}
                onEdit={(target, trigger) =>
                  openGroupEditor(cloneGroup(target), trigger)
                }
              />
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="needs-title">
          <div className={styles.sectionHeading}>
            <div>
              <p>TRAVEL NEEDS</p>
              <h2 id="needs-title">特殊需求摘要</h2>
            </div>
            <span>仅显示需求与人数</span>
          </div>
          {specialNeeds.length ? (
            <div className={styles.needList}>
              {specialNeeds.map((need) => (
                <button
                  key={need.label}
                  type="button"
                  aria-expanded={selectedNeed === need.label}
                  onClick={() =>
                    setSelectedNeed((current) =>
                      current === need.label ? null : need.label,
                    )
                  }
                >
                  <span>{need.label}</span>
                  <strong>{need.people.length} 人</strong>
                </button>
              ))}
              {selectedNeedSummary ? (
                <div className={styles.needDetail} role="status">
                  <strong>{selectedNeedSummary.label}</strong>
                  <span>{selectedNeedSummary.people.join("、")}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <p className={styles.noNeeds}>尚未设置需要特别留意的旅行需求。</p>
          )}
        </section>
      </div>

      {notice ? (
        <div className={styles.toast} role="status">
          ✓ {notice}
        </div>
      ) : null}

      {editor ? (
        <div
          className={styles.drawerBackdrop}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) requestEditorClose();
          }}
        >
          <section
            ref={drawerRef}
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
          >
            <div className={styles.drawerHeader}>
              <div>
                <p>
                  {editor.kind === "companion"
                    ? "COMPANION PROFILE"
                    : "FREQUENT GROUP"}
                </p>
                <h2 id="editor-title">
                  {editor.kind === "companion"
                    ? editor.draft.id
                      ? `编辑 ${editor.draft.displayName}`
                      : "添加同行人"
                    : editor.draft.id
                      ? `编辑 ${editor.draft.name}`
                      : "创建常用组合"}
                </h2>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="关闭编辑窗口"
                onClick={requestEditorClose}
              >
                ×
              </button>
            </div>

            {editor.kind === "companion" ? (
              <form
                className={styles.editorForm}
                onSubmit={submitCompanion}
                noValidate
              >
                <div className={styles.avatarEditor}>
                  <div className={styles.editorAvatar} aria-hidden="true">
                    {editor.draft.avatarUrl ? (
                      <Image
                        src={editor.draft.avatarUrl}
                        alt=""
                        fill
                        sizes="92px"
                        unoptimized={editor.draft.avatarUrl.startsWith("blob:")}
                      />
                    ) : (
                      <span>
                        {editor.draft.displayName.slice(0, 1).toUpperCase() ||
                          "旅"}
                      </span>
                    )}
                  </div>
                  <div>
                    <strong>头像</strong>
                    <p>仅在当前页面预览，不会上传网络。</p>
                    <div className={styles.avatarButtons}>
                      <label>
                        选择本地图片
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleAvatar}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateCompanionDraft({
                            avatarUrl: editor.draft.isSelf
                              ? initialCompanions[0].avatarUrl
                              : undefined,
                          })
                        }
                      >
                        恢复默认头像
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.fieldGrid}>
                  <label>
                    <span>昵称 / 称呼 *</span>
                    <input
                      data-autofocus
                      required
                      value={editor.draft.displayName}
                      aria-invalid={Boolean(companionErrors.displayName)}
                      aria-describedby={
                        companionErrors.displayName
                          ? "display-name-error"
                          : undefined
                      }
                      onChange={(event) =>
                        updateCompanionDraft({
                          displayName: event.target.value,
                        })
                      }
                    />
                    {companionErrors.displayName ? (
                      <small id="display-name-error" role="alert">
                        {companionErrors.displayName}
                      </small>
                    ) : null}
                  </label>
                  <label>
                    <span>关系</span>
                    <input
                      value={editor.draft.relationship}
                      onChange={(event) =>
                        updateCompanionDraft({
                          relationship: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>出生日期</span>
                    <input
                      type="date"
                      value={editor.draft.dateOfBirth ?? ""}
                      onChange={(event) =>
                        updateCompanionDraft({
                          dateOfBirth: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>年龄层 *</span>
                    <select
                      required
                      value={editor.draft.ageGroup}
                      aria-invalid={Boolean(companionErrors.ageGroup)}
                      aria-describedby={
                        companionErrors.ageGroup ? "age-group-error" : undefined
                      }
                      onChange={(event) =>
                        updateCompanionDraft({
                          ageGroup: event.target
                            .value as CompanionDraft["ageGroup"],
                        })
                      }
                    >
                      {ageGroupOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {companionErrors.ageGroup ? (
                      <small id="age-group-error" role="alert">
                        {companionErrors.ageGroup}
                      </small>
                    ) : null}
                  </label>
                  <label>
                    <span>性别</span>
                    <select
                      value={editor.draft.gender ?? ""}
                      onChange={(event) =>
                        updateCompanionDraft({ gender: event.target.value })
                      }
                    >
                      <option value="">不填写</option>
                      <option value="女">女</option>
                      <option value="男">男</option>
                      <option value="其他">其他</option>
                    </select>
                  </label>
                </div>

                <fieldset className={styles.optionGroup}>
                  <legend>移动与无障碍</legend>
                  <p>只保存您主动选择的需求，不会根据年龄自动推断。</p>
                  <div>
                    {mobilityNeedOptions.map((option) => (
                      <label key={option}>
                        <input
                          type="checkbox"
                          checked={editor.draft.mobilityNeeds.includes(option)}
                          onChange={() =>
                            updateCompanionDraft({
                              mobilityNeeds: toggleListItem(
                                editor.draft.mobilityNeeds,
                                option,
                              ),
                            })
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className={styles.optionGroup}>
                  <legend>餐饮需求</legend>
                  <p>卡片只显示概括标签，具体说明不会出现在列表页。</p>
                  <div>
                    {diningNeedOptions.map((option) => (
                      <label key={option}>
                        <input
                          type="checkbox"
                          checked={editor.draft.diningNeeds.includes(option)}
                          onChange={() =>
                            updateCompanionDraft({
                              diningNeeds: toggleListItem(
                                editor.draft.diningNeeds,
                                option,
                              ),
                            })
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  <label className={styles.detailField}>
                    <span>其他饮食说明</span>
                    <textarea
                      value={editor.draft.diningNote ?? ""}
                      onChange={(event) =>
                        updateCompanionDraft({ diningNote: event.target.value })
                      }
                    />
                  </label>
                </fieldset>
                <fieldset className={styles.optionGroup}>
                  <legend>活动与体验</legend>
                  <div>
                    {activityPreferenceOptions.map((option) => (
                      <label key={option}>
                        <input
                          type="checkbox"
                          checked={editor.draft.activityPreferences.includes(
                            option,
                          )}
                          onChange={() =>
                            updateCompanionDraft({
                              activityPreferences: toggleListItem(
                                editor.draft.activityPreferences,
                                option,
                              ),
                            })
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className={styles.drawerActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={requestEditorClose}
                  >
                    取消
                  </button>
                  <button type="submit" className={styles.primaryButton}>
                    保存同行人
                  </button>
                </div>
              </form>
            ) : (
              <form
                className={styles.editorForm}
                onSubmit={submitGroup}
                noValidate
              >
                <label className={styles.fullField}>
                  <span>组合名称 *</span>
                  <input
                    data-autofocus
                    required
                    value={editor.draft.name}
                    aria-invalid={Boolean(groupErrors.name)}
                    aria-describedby={
                      groupErrors.name ? "group-name-error" : undefined
                    }
                    onChange={(event) =>
                      updateGroupDraft({ name: event.target.value })
                    }
                  />
                  {groupErrors.name ? (
                    <small id="group-name-error" role="alert">
                      {groupErrors.name}
                    </small>
                  ) : null}
                </label>
                <label className={styles.fullField}>
                  <span>一句场景</span>
                  <input
                    value={editor.draft.description}
                    onChange={(event) =>
                      updateGroupDraft({ description: event.target.value })
                    }
                  />
                </label>
                <fieldset
                  className={styles.memberPicker}
                  aria-describedby={
                    groupErrors.companionIds ? "group-members-error" : undefined
                  }
                >
                  <legend>选择同行人 *</legend>
                  {companions.map((companion) => (
                    <label key={companion.id}>
                      <input
                        type="checkbox"
                        checked={editor.draft.companionIds.includes(
                          companion.id,
                        )}
                        onChange={() =>
                          updateGroupDraft({
                            companionIds: toggleListItem(
                              editor.draft.companionIds,
                              companion.id,
                            ),
                          })
                        }
                      />
                      <span className={styles.miniAvatar}>
                        {companion.avatarUrl ? (
                          <Image
                            src={companion.avatarUrl}
                            alt=""
                            fill
                            sizes="38px"
                          />
                        ) : (
                          companion.displayName.slice(0, 1)
                        )}
                      </span>
                      <span>
                        <strong>{companion.displayName}</strong>
                        <small>{companion.relationship || "同行人"}</small>
                      </span>
                    </label>
                  ))}
                  {groupErrors.companionIds ? (
                    <small id="group-members-error" role="alert">
                      {groupErrors.companionIds}
                    </small>
                  ) : null}
                </fieldset>
                <div className={styles.drawerActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={requestEditorClose}
                  >
                    取消
                  </button>
                  <button type="submit" className={styles.primaryButton}>
                    保存组合
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className={styles.modalBackdrop}>
          <section
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
            onKeyDown={(event) => {
              if (event.key === "Escape") setDeleteTarget(null);
            }}
          >
            <span className={styles.warningIcon} aria-hidden="true">
              !
            </span>
            <h2 id="delete-title">删除 {deleteTarget.displayName}？</h2>
            <p id="delete-description">
              删除后不会影响已经保存的历史旅行，但未来旅行将无法再选择该同行人。
            </p>
            <div>
              <button
                ref={deleteCancelRef}
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setDeleteTarget(null);
                  window.requestAnimationFrame(() =>
                    returnFocusRef.current?.focus(),
                  );
                }}
              >
                取消
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={confirmDelete}
              >
                确认删除同行人
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {discardOpen ? (
        <div className={styles.modalBackdrop}>
          <section
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-title"
          >
            <span className={styles.warningIcon} aria-hidden="true">
              !
            </span>
            <h2 id="discard-title">您还有尚未保存的修改。</h2>
            <p>关闭后，本次修改将不会保留。</p>
            <div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeEditor}
              >
                放弃修改
              </button>
              <button
                ref={discardContinueRef}
                type="button"
                className={styles.primaryButton}
                onClick={() => setDiscardOpen(false)}
              >
                继续编辑
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
