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

import { createEmptyCompanionDraft } from "./companion-data";
import {
  activityPreferenceOptions,
  ageGroupOptions,
  countCompanions,
  diningNeedOptions,
  mobilityNeedOptions,
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
import {
  companionClient,
  companionErrorMessage,
} from "./persistence/companion-client";
import {
  CompanionApiError,
  type CompanionResource,
  type CompanionGroupResource,
} from "./persistence/companion-resource";
import {
  companionDraftInput,
  groupDraftInput,
  toCompanionView,
  toGroupView,
  virtualOwner,
  OWNER_MEMBER_ID,
} from "./persistence/companion-adapter";

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
  const [resources, setResources] = useState<CompanionResource[]>([]);
  const [groupResources, setGroupResources] = useState<
    CompanionGroupResource[]
  >([]);
  const companions = useMemo(
    () => [virtualOwner, ...resources.map(toCompanionView)],
    [resources],
  );
  const groups = useMemo(
    () => groupResources.map(toGroupView),
    [groupResources],
  );
  const [libraryReady, setLibraryReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [conflicted, setConflicted] = useState(false);
  const mutationLock = useRef(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [companionErrors, setCompanionErrors] = useState<CompanionErrors>({});
  const [groupErrors, setGroupErrors] = useState<GroupErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<CompanionViewModel | null>(
    null,
  );
  const [discardOpen, setDiscardOpen] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [libraryError, setLibraryError] = useState("");
  const loadLibrary = useCallback(async () => {
    const stored = await companionClient.load();
    setResources(stored.companions);
    setGroupResources(stored.groups);
    setLibraryReady(true);
    setLibraryError("");
  }, []);
  useEffect(() => {
    let active = true;
    companionClient
      .load()
      .then((stored) => {
        if (!active) return;
        setResources(stored.companions);
        setGroupResources(stored.groups);
        setLibraryReady(true);
      })
      .catch((error) => {
        if (active) setLibraryError(companionErrorMessage(error));
      });
    return () => {
      active = false;
    };
  }, []);
  async function mutate(action: () => Promise<void>) {
    if (!libraryReady || mutationLock.current || conflicted) return;
    mutationLock.current = true;
    setPending(true);
    setLibraryError("");
    try {
      await action();
    } catch (error) {
      setLibraryError(companionErrorMessage(error));
      if (
        error instanceof CompanionApiError &&
        (error.code.startsWith("STALE_") ||
          error.code.includes("NOT_FOUND") ||
          error.code === "COMPANION_GROUP_MEMBER_INVALID")
      )
        setConflicted(true);
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  }
  const drawerRef = useRef<HTMLElement>(null);
  const editorBackdrop = useRef<HTMLDialogElement>(null);
  const discardBackdrop = useRef<HTMLDialogElement>(null);
  const deleteCancelRef = useRef<HTMLButtonElement>(null);
  const discardContinueRef = useRef<HTMLButtonElement>(null);
  const addCompanionRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const confirmReturnFocusRef = useRef<HTMLElement | null>(null);
  const { setIsDirty } = usePersonalNavigationGuard();

  const counts = useMemo(
    () => ({
      ...countCompanions(companions.filter((c) => !c.isSelf)),
      total: companions.length,
    }),
    [companions],
  );
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
  const editorOpen = editor !== null;
  useEffect(() => {
    const element = editorBackdrop.current;
    if (editorOpen) element?.showModal();
    return () => element?.close();
  }, [editorOpen]);
  useEffect(() => {
    const element = discardBackdrop.current;
    if (discardOpen) element?.showModal();
    return () => element?.close();
  }, [discardOpen]);

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

  const closeDeleteConfirmation = useCallback(() => {
    const focusTarget = returnFocusRef.current;
    setDeleteTarget(null);
    window.requestAnimationFrame(() => focusTarget?.focus());
  }, []);

  const closeDiscardConfirmation = useCallback(() => {
    const focusTarget = confirmReturnFocusRef.current;
    confirmReturnFocusRef.current = null;
    setDiscardOpen(false);
    window.requestAnimationFrame(() => focusTarget?.focus());
  }, []);

  const requestEditorClose = useCallback(() => {
    if (mutationLock.current) return;
    if (editorDirty) {
      confirmReturnFocusRef.current = document.activeElement as HTMLElement;
      setDiscardOpen(true);
      return;
    }
    closeEditor();
  }, [closeEditor, editorDirty]);

  useEffect(() => {
    if (!editorOpen) return;
    const drawer = drawerRef.current;
    const focusTarget = drawer?.querySelector<HTMLElement>("[data-autofocus]");
    const focusFrame = window.requestAnimationFrame(() => focusTarget?.focus());
    return () => window.cancelAnimationFrame(focusFrame);
  }, [editorOpen]);

  useEffect(() => {
    if (!editorOpen) return;
    const drawer = drawerRef.current;

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
  }, [discardOpen, deleteTarget, editorOpen, requestEditorClose]);

  useEffect(() => {
    if (deleteTarget) deleteCancelRef.current?.focus();
  }, [deleteTarget]);

  useEffect(() => {
    if (discardOpen) discardContinueRef.current?.focus();
  }, [discardOpen]);

  const openCompanionEditor = (draft: CompanionDraft, trigger: HTMLElement) => {
    if (!libraryReady || pending) return;
    if (draft.isSelf) {
      setNotice("本人资料请在个人资料页管理，这里仅用于组合选择。");
      return;
    }
    setConflicted(false);
    setLibraryError("");
    returnFocusRef.current = trigger;
    setCompanionErrors({});
    setEditor({ kind: "companion", draft, initial: JSON.stringify(draft) });
  };

  const openGroupEditor = (
    draft: CompanionGroupDraft,
    trigger: HTMLElement,
  ) => {
    if (!libraryReady || pending) return;
    setConflicted(false);
    setLibraryError("");
    returnFocusRef.current = trigger;
    setGroupErrors({});
    setEditor({ kind: "group", draft, initial: JSON.stringify(draft) });
  };

  const updateCompanionDraft = (patch: Partial<CompanionDraft>) => {
    if (mutationLock.current) return;
    setEditor((current) =>
      current?.kind === "companion"
        ? { ...current, draft: { ...current.draft, ...patch } }
        : current,
    );
  };

  const updateGroupDraft = (patch: Partial<CompanionGroupDraft>) => {
    if (mutationLock.current) return;
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
    const draft = editor.draft;
    void mutate(async () => {
      const current = resources.find((item) => item.id === draft.id);
      const saved = await companionClient.save<CompanionResource>(
        false,
        companionDraftInput(draft, current),
        current,
      );
      setResources((items) =>
        current
          ? items.map((item) => (item.id === saved.id ? saved : item))
          : [...items, saved],
      );
      setNotice("同行人资料已保存；本页备注和头像预览不上传。");
      closeEditor();
    });
  };
  const submitGroup = (event: FormEvent) => {
    event.preventDefault();
    if (editor?.kind !== "group") return;
    const errors = validateGroupDraft(editor.draft);
    setGroupErrors({ name: errors.name });
    if (errors.name) return; // Canonical v1 permits empty groups.
    const draft = editor.draft;
    void mutate(async () => {
      const current = groupResources.find((item) => item.id === draft.id);
      const saved = await companionClient.save<CompanionGroupResource>(
        true,
        groupDraftInput(draft),
        current,
      );
      setGroupResources((items) =>
        current
          ? items.map((item) => (item.id === saved.id ? saved : item))
          : [...items, saved],
      );
      setNotice("常用组合已保存");
      closeEditor();
    });
  };
  const confirmDelete = () => {
    if (!deleteTarget || deleteTarget.isSelf) return;
    const current = resources.find((item) => item.id === deleteTarget.id);
    if (!current) return;
    void mutate(async () => {
      await companionClient.remove(false, current);
      await loadLibrary();
      setNotice("同行人已删除");
      setDeleteTarget(null);
      window.requestAnimationFrame(() => addCompanionRef.current?.focus());
    });
  };
  const deleteGroup = () => {
    if (
      editor?.kind !== "group" ||
      !window.confirm("确认删除这个常用组合？同行人资料会保留。")
    )
      return;
    const current = groupResources.find((item) => item.id === editor.draft.id);
    if (!current) return;
    void mutate(async () => {
      await companionClient.remove(true, current);
      setGroupResources((items) =>
        items.filter((item) => item.id !== current.id),
      );
      setNotice("常用组合已删除");
      closeEditor();
    });
  };
  const recover = async () => {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setPending(true);
    try {
      await loadLibrary();
      setConflicted(false);
      setDeleteTarget(null);
      closeEditor();
    } catch (error) {
      setLibraryError(companionErrorMessage(error));
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  };
  const persistenceStatus = libraryError ? (
    <div role="alert" className={styles.persistenceStatus}>
      <p>{libraryError}</p>
      <button type="button" disabled={pending} onClick={() => void recover()}>
        {editorDirty ? "放弃本地修改并重新读取" : "重新读取服务器资料"}
      </button>
    </div>
  ) : null;
  const selectedNeedSummary = specialNeeds.find(
    (need) => need.label === selectedNeed,
  );

  return (
    <div className={styles.page} data-companion-page>
      <header className={styles.pageHeader}>
        <div>
          <i
            className={styles.titleFlower}
            data-title-flower
            aria-hidden="true"
          >
            ✿
          </i>
          <p>TRAVEL COMPANIONS</p>
          <h1 data-primary-page-title>同行人</h1>
          <span>管理常用同行人，创建旅行时快速选择。</span>
        </div>
      </header>

      <section className={styles.summaryCard} aria-labelledby="summary-title">
        <div className={styles.summaryLead}>
          <span aria-hidden="true">伴</span>
          <div>
            <p id="summary-title">同行人总数</p>
            <strong>{counts.total}</strong>
            <small>总数含本人；年龄分组不含本人</small>
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
            ref={addCompanionRef}
            type="button"
            className={styles.primaryButton}
            aria-label="添加同行人"
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
                setConflicted(false);
                setLibraryError("");
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
          <button
            type="button"
            className={styles.addCompanionCard}
            onClick={(event) =>
              openCompanionEditor(
                createEmptyCompanionDraft(),
                event.currentTarget,
              )
            }
            aria-label="从卡片添加同行人"
          >
            <span aria-hidden="true">＋</span>
            <strong>添加同行人</strong>
            <small>记录亲友信息，让下一次旅行更简单</small>
          </button>
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

      {!libraryReady && !libraryError && (
        <p role="status">正在读取同行人资料…</p>
      )}
      {!editor && !deleteTarget && persistenceStatus}
      {notice ? (
        <div className={styles.toast} role="status">
          ✓ {notice}
        </div>
      ) : null}

      {editor ? (
        <dialog
          ref={editorBackdrop}
          aria-labelledby="editor-title"
          className={styles.drawerBackdrop}
          onCancel={(event) => {
            event.preventDefault();
            requestEditorClose();
          }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) requestEditorClose();
          }}
        >
          <section
            ref={drawerRef}
            className={styles.drawer}
            role="document"
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

            {persistenceStatus}
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
                            avatarUrl: undefined,
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
                    <span>其他饮食说明（仅本次草稿，不会保存）</span>
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
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={pending || conflicted || !libraryReady}
                  >
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
                  <span>一句场景（仅本次草稿，不会保存）</span>
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
                  <legend>选择同行人（可留空）</legend>
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
                  {editor.draft.companionIds
                    .filter((id) => id !== OWNER_MEMBER_ID)
                    .map((id, index, array) => (
                      <div
                        key={id}
                        data-member-order={id}
                        className={styles.memberOrder}
                      >
                        <span>
                          {companions.find((c) => c.id === id)?.displayName}
                        </span>
                        <button
                          type="button"
                          disabled={index === 0 || pending}
                          className={styles.secondaryButton}
                          aria-label={
                            "上移成员 " +
                            companions.find((c) => c.id === id)?.displayName
                          }
                          onClick={() => {
                            const next = [...array];
                            [next[index - 1], next[index]] = [
                              next[index],
                              next[index - 1],
                            ];
                            updateGroupDraft({
                              companionIds: [
                                ...(editor.draft.companionIds.includes(
                                  OWNER_MEMBER_ID,
                                )
                                  ? [OWNER_MEMBER_ID]
                                  : []),
                                ...next,
                              ],
                            });
                          }}
                        >
                          上移
                        </button>
                        <button
                          type="button"
                          disabled={index === array.length - 1 || pending}
                          className={styles.secondaryButton}
                          aria-label={
                            "下移成员 " +
                            companions.find((c) => c.id === id)?.displayName
                          }
                          onClick={() => {
                            const next = [...array];
                            [next[index], next[index + 1]] = [
                              next[index + 1],
                              next[index],
                            ];
                            updateGroupDraft({
                              companionIds: [
                                ...(editor.draft.companionIds.includes(
                                  OWNER_MEMBER_ID,
                                )
                                  ? [OWNER_MEMBER_ID]
                                  : []),
                                ...next,
                              ],
                            });
                          }}
                        >
                          下移
                        </button>
                      </div>
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
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={pending || conflicted || !libraryReady}
                  >
                    保存组合
                  </button>
                  {editor.draft.id && (
                    <button
                      type="button"
                      disabled={pending || conflicted}
                      className={styles.dangerButton}
                      onClick={deleteGroup}
                    >
                      删除组合
                    </button>
                  )}
                </div>
              </form>
            )}
          </section>
        </dialog>
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
              if (event.key === "Escape") {
                event.preventDefault();
                closeDeleteConfirmation();
                return;
              }
              if (event.key !== "Tab") return;
              const buttons = [
                ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button:not([disabled])",
                ),
              ];
              const first = buttons[0];
              const last = buttons[buttons.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
          >
            <span className={styles.warningIcon} aria-hidden="true">
              !
            </span>
            <h2 id="delete-title">删除 {deleteTarget.displayName}？</h2>
            {persistenceStatus}
            <p id="delete-description">
              删除后不会影响已经保存的历史旅行，但未来旅行将无法再选择该同行人。
            </p>
            <div>
              <button
                ref={deleteCancelRef}
                type="button"
                className={styles.secondaryButton}
                onClick={closeDeleteConfirmation}
              >
                取消
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={confirmDelete}
                disabled={pending || conflicted}
              >
                确认删除同行人
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {discardOpen ? (
        <dialog
          ref={discardBackdrop}
          className={styles.modalBackdrop}
          role="alertdialog"
          aria-labelledby="discard-title"
          aria-describedby="discard-description"
          onCancel={(event) => {
            event.preventDefault();
            closeDiscardConfirmation();
          }}
        >
          <section
            className={styles.confirmDialog}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeDiscardConfirmation();
                return;
              }
              if (event.key !== "Tab") return;
              const buttons = [
                ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button:not([disabled])",
                ),
              ];
              const first = buttons[0];
              const last = buttons[buttons.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
          >
            <span className={styles.warningIcon} aria-hidden="true">
              !
            </span>
            <h2 id="discard-title">您还有尚未保存的修改。</h2>
            <p id="discard-description">关闭后，本次修改将不会保留。</p>
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
                onClick={closeDiscardConfirmation}
              >
                继续编辑
              </button>
            </div>
          </section>
        </dialog>
      ) : null}
    </div>
  );
}
