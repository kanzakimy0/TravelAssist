"use client";

import Image from "next/image";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { GuardedLink } from "@/features/personal-center/components/guarded-link";
import { usePersonalNavigationGuard } from "@/features/personal-center/components/navigation-guard-context";

import {
  accommodationPreferenceOptions,
  accommodationPreferencesEqual,
  budgetPreferencesEqual,
  budgetSpendingOptions,
  createDefaultAccommodationPreferenceState,
  createDefaultBudgetPreferenceState,
  createDefaultDiningPreferenceState,
  diningPreferenceOptions,
  diningPreferencesEqual,
  saveAccommodationPreference,
  saveBudgetPreference,
  saveDiningPreference,
  setAccommodationPreference,
  setBudgetSpendingTendency,
  setDiningPreference,
  summarizeAccommodationPreference,
  summarizeBudgetPreference,
  summarizeDiningPreference,
  toggleBudgetAllocation,
  type AccommodationPreferenceState,
  type BudgetPreferenceState,
  type DiningPreferenceState,
} from "./dining-accommodation-budget-preference-model";
import { PreferenceIcon } from "./preference-icon";
import styles from "./dining-accommodation-budget-preference.module.css";

type DraftController<State> = {
  draft: State;
  setDraft: Dispatch<SetStateAction<State>>;
  isDirty: boolean;
  savedMessage: boolean;
  clearSavedMessage: () => void;
  save: () => void;
  cancel: () => void;
  restore: () => void;
};

function usePreferenceDraft<State>(
  createDefault: () => State,
  clone: (state: State) => State,
  equals: (left: State, right: State) => boolean,
): DraftController<State> {
  const initial = useMemo(() => createDefault(), [createDefault]);
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [savedMessage, setSavedMessage] = useState(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setIsDirty } = usePersonalNavigationGuard();
  const isDirty = !equals(saved, draft);

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  useEffect(
    () => () => {
      setIsDirty(false);
      if (messageTimer.current) clearTimeout(messageTimer.current);
    },
    [setIsDirty],
  );

  function clearSavedMessage() {
    setSavedMessage(false);
  }

  function save() {
    setSaved(clone(draft));
    setSavedMessage(true);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setSavedMessage(false), 2200);
  }

  function cancel() {
    setDraft(clone(saved));
    setSavedMessage(false);
  }

  function restore() {
    setDraft(createDefault());
    setSavedMessage(false);
  }

  return {
    draft,
    setDraft,
    isDirty,
    savedMessage,
    clearSavedMessage,
    save,
    cancel,
    restore,
  };
}

function SectionMark({ children }: { children: string }) {
  return <span className={styles.sectionMark}>{children}</span>;
}

function SegmentedChoice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ key: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className={styles.segmentedChoice}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-label={`${label}：${option.label}`}
            aria-checked={selected}
            data-selected={selected ? "true" : undefined}
            onClick={() => onChange(option.key)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SettingCard({
  glyph,
  title,
  description,
  children,
}: {
  glyph: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className={styles.settingCard} data-setting={title}>
      <div className={styles.settingHeading}>
        <span aria-hidden="true">{glyph}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

type BoundaryCard = {
  tone: "current" | "trip" | "future";
  badge: string;
  title: string;
  description: string;
  items: string[];
  note?: string;
};

function PreferencePageFrame({
  pageKey,
  eyebrow,
  title,
  subtitle,
  image,
  summaryLabel,
  summary,
  summaryDescription,
  quickTitle,
  quickDescription,
  statement,
  boundaryCards,
  controller,
  children,
}: {
  pageKey: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  summaryLabel: string;
  summary: string;
  summaryDescription: string;
  quickTitle: string;
  quickDescription: string;
  statement: string;
  boundaryCards: BoundaryCard[];
  controller: Pick<
    DraftController<unknown>,
    "isDirty" | "savedMessage" | "save" | "cancel" | "restore"
  >;
  children: ReactNode;
}) {
  const overviewId = `${pageKey}-overview`;
  const quickId = `${pageKey}-quick-settings`;
  const detailId = `${pageKey}-detail-boundary`;

  return (
    <div className={styles.page} data-preference-page={pageKey}>
      <header className={styles.pageHeader}>
        <div>
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <span>{subtitle}</span>
        </div>
        <GuardedLink
          href="/personal-center/preferences"
          className={styles.backLink}
        >
          <PreferenceIcon name="back" />
          返回旅行偏好
        </GuardedLink>
      </header>

      <nav className={styles.hierarchyMenu} aria-label={`${title}三级菜单`}>
        <a href={`#${overviewId}`}>
          <span>Level 1 · 大项目</span>
          <strong>{title.replace("偏好", "")}</strong>
          <small>查看当前长期偏好摘要</small>
        </a>
        <span className={styles.hierarchyConnector} aria-hidden="true">
          →
        </span>
        <a href={`#${quickId}`}>
          <span>Level 2 · 中项目</span>
          <strong>{quickTitle}</strong>
          <small>调整日常最常用的长期倾向</small>
        </a>
        <span className={styles.hierarchyConnector} aria-hidden="true">
          →
        </span>
        <a href={`#${detailId}`}>
          <span>Level 3 · 小项目</span>
          <strong>更多设置边界</strong>
          <small>区分长期偏好与单次旅行条件</small>
        </a>
      </nav>

      <section
        id={overviewId}
        className={`${styles.summaryCard} ${styles.scrollTarget}`}
        aria-labelledby={`${pageKey}-summary-title`}
        data-preference-level="large"
      >
        <Image
          src={image}
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, 720px"
          priority
        />
        <div className={styles.summaryShade} />
        <div className={styles.summaryContent}>
          <span className={styles.scopeBadge}>大项目 · 仅长期默认</span>
          <p id={`${pageKey}-summary-title`}>{summaryLabel}</p>
          <h2 aria-live="polite">{summary}</h2>
          <span>{summaryDescription}</span>
        </div>
      </section>

      <section
        id={quickId}
        className={`${styles.section} ${styles.scrollTarget}`}
        aria-labelledby={`${pageKey}-quick-title`}
        data-preference-level="middle"
      >
        <div className={styles.sectionHeading}>
          <SectionMark>中</SectionMark>
          <div>
            <h2 id={`${pageKey}-quick-title`}>中项目 · {quickTitle}</h2>
            <p>{quickDescription}</p>
          </div>
        </div>
        <div className={styles.settingGrid}>{children}</div>
      </section>

      <section
        id={detailId}
        className={`${styles.section} ${styles.boundarySection} ${styles.scrollTarget}`}
        aria-labelledby={`${pageKey}-boundary-title`}
        data-preference-level="small"
      >
        <div className={styles.sectionHeading}>
          <SectionMark>小</SectionMark>
          <div>
            <h2 id={`${pageKey}-boundary-title`}>小项目 · 更多详细设置边界</h2>
            <p>普通用户无需进入复杂配置；未冻结的候选不会成为可保存字段。</p>
          </div>
        </div>

        <div className={styles.scopeStatement}>
          <span className={styles.boundaryIcon} aria-hidden="true">
            <PreferenceIcon name="settings" />
          </span>
          <div>
            <p>本页负责</p>
            <h3>{statement}</h3>
            <span>长期默认与具体 Trip 的临时条件相互独立。</span>
          </div>
        </div>

        <div className={styles.boundaryGrid}>
          {boundaryCards.map((card) => (
            <article
              key={card.title}
              className={styles.boundaryCard}
              data-scope={card.tone}
            >
              <span className={styles.boundaryBadge}>{card.badge}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <ul>
                {card.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {card.note ? <small>{card.note}</small> : null}
            </article>
          ))}
        </div>

        <dl className={styles.contractGrid} aria-label="当前实现边界">
          <div>
            <dt>Persistence</dt>
            <dd>Mock / in-memory only</dd>
          </div>
          <div>
            <dt>Formal Preference Schema</dt>
            <dd>Not implemented</dd>
          </div>
          <div>
            <dt>Planner Contract</dt>
            <dd>Not implemented</dd>
          </div>
        </dl>
      </section>

      <footer className={styles.actionBar}>
        <button
          type="button"
          className={styles.restoreButton}
          onClick={controller.restore}
        >
          <PreferenceIcon name="reset" />
          恢复默认
        </button>
        <span className={styles.changeState} aria-live="polite">
          {controller.savedMessage
            ? "✓ 已保存"
            : controller.isDirty
              ? "有未保存的修改"
              : "所有修改已保存"}
        </span>
        <div>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={controller.cancel}
          >
            取消
          </button>
          <button
            type="button"
            className={styles.saveButton}
            onClick={controller.save}
          >
            保存偏好
          </button>
        </div>
      </footer>
    </div>
  );
}

const diningBoundaries: BoundaryCard[] = [
  {
    tone: "current",
    badge: "当前可保存",
    title: "稳定的用餐倾向",
    description: "只表达平时选择餐饮时的方向，不建立菜系资料库。",
    items: ["当地料理倾向", "小店倾向", "排队接受度"],
  },
  {
    tone: "trip",
    badge: "具体旅行中设置",
    title: "Trip 用餐条件",
    description: "时间、地点和同行人会随每次旅行变化，应在具体行程中决定。",
    items: [
      "具体用餐时间与预约",
      "儿童友好与同行人需要",
      "餐厅搜索和单次旅行选择",
    ],
    note: "不会从本页生成 Trip 临时状态。",
  },
  {
    tone: "future",
    badge: "尚未冻结",
    title: "候选餐饮资料",
    description: "这些方向尚未形成正式 Preference Master Data。",
    items: ["完整菜系列表", "过敏原数据库", "特殊饮食 Schema"],
    note: "候选范围，不是当前已保存字段。",
  },
];

const accommodationBoundaries: BoundaryCard[] = [
  {
    tone: "current",
    badge: "当前可保存",
    title: "稳定的住宿倾向",
    description: "用直观描述表达平时住在哪里更舒服。",
    items: ["交通便利", "舒适度", "少换酒店"],
  },
  {
    tone: "trip",
    badge: "具体旅行中设置",
    title: "Trip 住宿条件",
    description: "目的地、日期与同行人决定具体酒店需求。",
    items: ["入住区域与日期", "住宿价格与具体酒店", "房间数量和同行人安排"],
    note: "不会从本页搜索、预订或写入 Planner。",
  },
  {
    tone: "future",
    badge: "尚未冻结",
    title: "候选住宿资料",
    description: "“舒适”保持为感受，不等同于任何单一酒店属性。",
    items: ["星级与品牌", "房型、床型与面积", "设施 Master Data"],
    note: "候选范围，不是当前已保存字段。",
  },
];

const budgetBoundaries: BoundaryCard[] = [
  {
    tone: "current",
    badge: "当前可保存",
    title: "长期消费倾向",
    description: "只记录大致消费风格和两个可并行的投入方向。",
    items: ["总体消费倾向", "更愿意花在住宿", "更愿意花在体验"],
  },
  {
    tone: "trip",
    badge: "具体旅行中设置",
    title: "Trip Budget",
    description: "金额依赖目的地、天数、币种和旅行成员，只属于具体旅行。",
    items: ["旅行总金额", "每日金额与币种", "实际支出和预订价格"],
    note: "不会从本页创建或修改 Trip Budget。",
  },
  {
    tone: "future",
    badge: "尚未冻结",
    title: "候选预算分配",
    description: "更多分配项尚未形成正式长期偏好枚举。",
    items: ["购物预算", "机票预算", "交通预算"],
    note: "候选范围，不是当前已保存字段。",
  },
];

export function DiningPreferencePage() {
  const controller = usePreferenceDraft<DiningPreferenceState>(
    createDefaultDiningPreferenceState,
    saveDiningPreference,
    diningPreferencesEqual,
  );
  const { draft, setDraft, clearSavedMessage } = controller;

  function update<K extends keyof DiningPreferenceState>(
    key: K,
    value: DiningPreferenceState[K],
  ) {
    clearSavedMessage();
    setDraft((current) => setDiningPreference(current, key, value));
  }

  return (
    <PreferencePageFrame
      pageKey="dining"
      eyebrow="DINING PREFERENCE"
      title="餐饮偏好"
      subtitle="设置你长期选择用餐体验时的稳定倾向"
      image="/media/personal-center/preferences/category-dining.png"
      summaryLabel="当前餐饮偏好"
      summary={summarizeDiningPreference(draft)}
      summaryDescription="摘要随当前草稿实时变化，只表达长期用餐倾向。"
      quickTitle="三项快速设置"
      quickDescription="用三个直观等级分别表达料理、小店与排队偏好。"
      statement="“我通常喜欢怎样的用餐体验”"
      boundaryCards={diningBoundaries}
      controller={controller}
    >
      <SettingCard
        glyph="味"
        title="当地料理倾向"
        description="旅行时是否优先尝试目的地的当地料理"
      >
        <SegmentedChoice
          label="当地料理倾向"
          value={draft.localCuisine}
          options={diningPreferenceOptions.localCuisine}
          onChange={(value) =>
            update(
              "localCuisine",
              value as DiningPreferenceState["localCuisine"],
            )
          }
        />
      </SettingCard>
      <SettingCard
        glyph="店"
        title="小店倾向"
        description="是否偏爱有当地感的小型餐馆与街巷店铺"
      >
        <SegmentedChoice
          label="小店倾向"
          value={draft.smallShops}
          options={diningPreferenceOptions.smallShops}
          onChange={(value) =>
            update("smallShops", value as DiningPreferenceState["smallShops"])
          }
        />
      </SettingCard>
      <SettingCard
        glyph="候"
        title="排队接受度"
        description="为了想吃的餐点通常能接受怎样的等候程度"
      >
        <SegmentedChoice
          label="排队接受度"
          value={draft.queueTolerance}
          options={diningPreferenceOptions.queueTolerance}
          onChange={(value) =>
            update(
              "queueTolerance",
              value as DiningPreferenceState["queueTolerance"],
            )
          }
        />
      </SettingCard>
    </PreferencePageFrame>
  );
}

export function AccommodationPreferencePage() {
  const controller = usePreferenceDraft<AccommodationPreferenceState>(
    createDefaultAccommodationPreferenceState,
    saveAccommodationPreference,
    accommodationPreferencesEqual,
  );
  const { draft, setDraft, clearSavedMessage } = controller;

  function update(
    key: keyof AccommodationPreferenceState,
    value: AccommodationPreferenceState[keyof AccommodationPreferenceState],
  ) {
    clearSavedMessage();
    setDraft((current) => setAccommodationPreference(current, key, value));
  }

  const settings = [
    {
      key: "transportConvenience",
      glyph: "行",
      title: "交通便利",
      description: "更重视住宿到车站与主要活动区域的移动便利",
    },
    {
      key: "comfort",
      glyph: "憩",
      title: "舒适度",
      description: "重视整体休息感受，但不把它等同于星级或房型",
    },
    {
      key: "fewerHotelChanges",
      glyph: "泊",
      title: "少换酒店",
      description: "倾向减少搬运行李和重新入住的次数",
    },
  ] as const;

  return (
    <PreferencePageFrame
      pageKey="accommodation"
      eyebrow="ACCOMMODATION PREFERENCE"
      title="住宿偏好"
      subtitle="设置你长期选择住宿体验时的稳定倾向"
      image="/media/personal-center/preferences/category-accommodation.webp"
      summaryLabel="当前住宿偏好"
      summary={summarizeAccommodationPreference(draft)}
      summaryDescription="“舒适”只表达整体感受，不代表星级、面积、床型或品牌。"
      quickTitle="三项快速设置"
      quickDescription="每项都是 presentation-only 三段选择，不建立酒店属性枚举。"
      statement="“我通常重视怎样的住宿体验”"
      boundaryCards={accommodationBoundaries}
      controller={controller}
    >
      {settings.map((setting) => (
        <SettingCard
          key={setting.key}
          glyph={setting.glyph}
          title={setting.title}
          description={setting.description}
        >
          <SegmentedChoice
            label={setting.title}
            value={draft[setting.key]}
            options={accommodationPreferenceOptions}
            onChange={(value) =>
              update(
                setting.key,
                value as AccommodationPreferenceState[typeof setting.key],
              )
            }
          />
        </SettingCard>
      ))}
    </PreferencePageFrame>
  );
}

export function BudgetPreferencePage() {
  const controller = usePreferenceDraft<BudgetPreferenceState>(
    createDefaultBudgetPreferenceState,
    saveBudgetPreference,
    budgetPreferencesEqual,
  );
  const { draft, setDraft, clearSavedMessage } = controller;

  function toggle(key: "prioritizeAccommodation" | "prioritizeExperience") {
    clearSavedMessage();
    setDraft((current) => toggleBudgetAllocation(current, key));
  }

  return (
    <PreferencePageFrame
      pageKey="budget"
      eyebrow="BUDGET PREFERENCE"
      title="预算偏好"
      subtitle="设置你的长期消费倾向与更愿意投入的旅行体验"
      image="/media/personal-center/preferences/category-budget.png"
      summaryLabel="当前预算偏好"
      summary={summarizeBudgetPreference(draft)}
      summaryDescription="只表达总体倾向，不输入金额、币种或单次旅行预算。"
      quickTitle="消费倾向与投入方向"
      quickDescription="总体倾向单选；住宿与体验两个投入方向可以同时开启。"
      statement="“我通常怎样分配旅行中的消费关注”"
      boundaryCards={budgetBoundaries}
      controller={controller}
    >
      <SettingCard
        glyph="总"
        title="总体消费倾向"
        description="表达长期的旅行消费风格，不代表任何具体金额"
      >
        <SegmentedChoice
          label="总体消费倾向"
          value={draft.spendingTendency}
          options={budgetSpendingOptions}
          onChange={(value) => {
            clearSavedMessage();
            setDraft((current) =>
              setBudgetSpendingTendency(
                current,
                value as BudgetPreferenceState["spendingTendency"],
              ),
            );
          }}
        />
      </SettingCard>
      <SettingCard
        glyph="投"
        title="更愿意投入的方面"
        description="两个方向彼此独立，可以同时选择或都不选择"
      >
        <div className={styles.allocationList}>
          <label className={styles.toggleChoice}>
            <input
              type="checkbox"
              checked={draft.prioritizeAccommodation}
              onChange={() => toggle("prioritizeAccommodation")}
            />
            <span className={styles.checkboxMark} aria-hidden="true">
              ✓
            </span>
            <span>
              <strong>更愿意花在住宿</strong>
              <small>愿意为更合适的住宿体验留出更多空间</small>
            </span>
          </label>
          <label className={styles.toggleChoice}>
            <input
              type="checkbox"
              checked={draft.prioritizeExperience}
              onChange={() => toggle("prioritizeExperience")}
            />
            <span className={styles.checkboxMark} aria-hidden="true">
              ✓
            </span>
            <span>
              <strong>更愿意花在体验</strong>
              <small>愿意为活动、文化与参与式体验留出更多空间</small>
            </span>
          </label>
        </div>
      </SettingCard>
    </PreferencePageFrame>
  );
}
