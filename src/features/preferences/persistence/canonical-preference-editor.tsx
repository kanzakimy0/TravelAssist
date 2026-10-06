"use client";
import Image from "next/image";
import { useEffect } from "react";
import { GuardedLink } from "@/features/personal-center/components/guarded-link";
import { usePersonalNavigationGuard } from "@/features/personal-center/components/navigation-guard-context";
import {
  interestCodes,
  interestDetails,
  walkingToleranceValues,
  priorityValues,
  queueToleranceValues,
  spendingTendencyValues,
  parsePreferenceV1,
  type PreferenceKey,
  type InterestCode,
  type InterestDetailCode,
} from "../domain/preference-v1";
import {
  categorySummary,
  editPreferenceValue,
  fieldLabels,
  interestLabels,
  keysForPage,
  valueLabels,
  type PreferencePageKey,
} from "./preference-adapter";
import { usePreferenceResource } from "./use-preference-resource";
import { PreferenceStatus } from "./preference-status";
import {
  applyPreferencePreset,
  matchPreferencePreset,
  presetsForCategory,
} from "../presets/preference-presets";
import { PreferenceIcon } from "../preference-icon";
import styles from "../preference-center.module.css";
import editor from "./preference-editor.module.css";

const titles: Record<PreferencePageKey, string> = {
  mobility: "移动偏好",
  attractions: "景点与活动偏好",
  dining: "餐饮偏好",
  accommodation: "住宿偏好",
  budget: "预算偏好",
  experience: "旅行体验偏好",
  advanced: "更多详细设置",
};
const artwork: Record<PreferencePageKey, string> = {
  mobility: "category-mobility.webp",
  attractions: "category-attractions.webp",
  dining: "category-dining.png",
  accommodation: "category-accommodation.webp",
  budget: "category-budget.png",
  experience: "category-experience.png",
  advanced: "category-experience.png",
};
const styleEnds: Partial<Record<PreferenceKey, [string, string]>> = {
  "style.pace": ["悠闲", "紧凑"],
  "style.depth": ["打卡优先", "深度体验"],
  "style.discovery": ["经典必去", "当地小众"],
  "style.movement": ["定点游玩", "一路移动"],
  "style.coverage": ["单城深玩", "多地巡游"],
  "style.priority": ["预算优先", "体验优先"],
  "style.planning": ["自由随性", "计划明确"],
};
const detailLabels: Record<InterestDetailCode, string> = {
  mountain: "山景",
  coast: "海岸",
  lake: "湖泊",
  forest: "森林",
  flower_field: "花田",
  shrine_temple: "神社寺院",
  castle: "城堡",
  museum: "博物馆",
  historic_district: "历史街区",
  sushi: "寿司",
  ramen: "拉面",
  regional_cuisine: "地方料理",
  dessert: "甜点",
  sake: "清酒",
  street_photography: "街头摄影",
  landscape: "风景摄影",
  nightscape: "夜景",
  architecture: "建筑",
  people_culture: "人文摄影",
  ryokan_onsen: "温泉旅馆",
  open_air_bath: "露天温泉",
  forest_wellness: "森林疗愈",
  sea_view_onsen: "海景温泉",
  contemporary_art: "当代艺术",
  traditional_crafts: "传统工艺",
  design_exhibition: "设计展览",
  anime_pilgrimage: "动漫巡礼",
  gaming: "游戏",
  themed_cafe: "主题咖啡馆",
  merchandise: "周边商品",
  department_store: "百货商场",
  vintage: "古着",
  drugstore: "药妆店",
  local_specialties: "地方特产",
  distinctive_neighborhood: "特色街区",
  architecture_walk: "建筑漫步",
  cafe: "咖啡馆",
  city_nightscape: "城市夜景",
  hiking: "徒步",
  cycling: "骑行",
  skiing: "滑雪",
  water_activity: "水上活动",
  izakaya: "居酒屋",
  performance: "演出",
  night_walk: "夜间漫步",
  zoo: "动物园",
  science_museum: "科学馆",
  family_crafts: "亲子手作",
  park: "公园",
  tea_ceremony: "茶道",
  kimono: "和服",
  crafts: "手工艺",
  traditional_performance: "传统表演",
  major_theme_park: "大型主题乐园",
  character_park: "角色主题乐园",
  aquarium: "水族馆",
  immersive_exhibition: "沉浸展览",
  historic_town: "历史小镇",
  fishing_village: "渔村",
  countryside: "田园",
  local_market: "当地集市",
  cherry_blossom: "樱花",
  autumn_leaves: "红叶",
  snow_scenery: "雪景",
  festival: "节庆",
  fireworks: "烟花",
};
function scalarOptions(
  key: PreferenceKey,
): readonly (string | number | boolean)[] {
  if (key === "mobility.walkingTolerance") return walkingToleranceValues;
  if (key === "dining.queueTolerance") return queueToleranceValues;
  if (key === "budget.spendingTendency") return spendingTendencyValues;
  if (key.startsWith("dining.") || key.startsWith("accommodation."))
    return priorityValues;
  return [true, false];
}
export function CanonicalPreferenceEditor({
  category,
}: {
  category: PreferencePageKey;
}) {
  const state = usePreferenceResource();
  const { setIsDirty } = usePersonalNavigationGuard();
  const { isDirty } = state;
  useEffect(() => {
    setIsDirty(isDirty);
    return () => setIsDirty(false);
  }, [isDirty, setIsDirty]);
  const presets = presetsForCategory(category);
  const matchedPreset = matchPreferencePreset(state.draft, category);
  const keys = keysForPage(category);
  const disabled = state.busy || !state.resource;
  function setSignal(interest: InterestCode, signal: string) {
    const values = parsePreferenceV1(state.draft).values;
    const signals = { ...values["interests.preferences"] };
    if (signal === "") delete signals[interest];
    else signals[interest] = signal as "like" | "dislike";
    // Explicit dislike removes contradictory positive details in the same user edit.
    const details = { ...values["interests.details"] };
    if (signal === "dislike") delete details[interest];
    state.edit(
      parsePreferenceV1({
        schemaVersion: "1.0",
        values: {
          ...values,
          "interests.preferences": signals,
          ...(values["interests.details"]
            ? { "interests.details": details }
            : {}),
        },
      }),
    );
  }
  function toggleDetail(interest: InterestCode, detail: string) {
    const values = state.draft.values;
    const details = { ...values["interests.details"] };
    const selected: string[] = [...(details[interest] ?? [])];
    const next = selected.includes(detail)
      ? selected.filter((x) => x !== detail)
      : [...selected, detail];
    state.edit(
      editPreferenceValue(state.draft, "interests.details", {
        ...details,
        [interest]: next,
      }),
    );
  }
  function clearPage() {
    let next = state.draft;
    for (const key of keys) next = editPreferenceValue(next, key, undefined);
    state.edit(next);
  }
  return (
    <div className={styles.preferencePage} data-preference-editor={category}>
      <header className={styles.pageHeader}>
        <div>
          <p>PREFERENCE DETAILS</p>
          <h1>{titles[category]}</h1>
          <span>只保存您明确选择的长期偏好</span>
        </div>
        <GuardedLink
          href="/personal-center/preferences"
          className={styles.secondaryButton}
        >
          <PreferenceIcon name="back" />
          返回旅行偏好
        </GuardedLink>
      </header>
      <PreferenceStatus state={state} />
      <section
        className={editor.summary}
        aria-label="当前偏好摘要"
        data-preference-level="large"
      >
        <Image
          src={"/media/personal-center/preferences/" + artwork[category]}
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, 900px"
          priority
        />
        <div>
          <p>当前偏好摘要</p>
          <h2>{categorySummary(state.draft, category)}</h2>
          <p>本次旅行或同行人的临时选择不会覆盖这里。</p>
        </div>
      </section>
      <fieldset className={editor.fields} disabled={disabled}>
        <legend>长期偏好设置</legend>
        {presets.length > 0 ? (
          <section className={editor.card} aria-label="快速模板">
            <h2>快速模板</h2>
            <p>仅修改本页选择，点击“保存偏好”后才会保存。</p>
            <p aria-live="polite" data-preset-match={matchedPreset?.id ?? ""}>
              {matchedPreset
                ? "当前模板：" + matchedPreset.label
                : keys.some((key) => state.draft.values[key] !== undefined)
                  ? "自定义"
                  : "未设置"}
            </p>
            <div className={editor.presets}>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={matchedPreset?.id === preset.id}
                  title={preset.description}
                  onClick={() =>
                    state.edit(applyPreferencePreset(state.draft, preset.id))
                  }
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </section>
        ) : null}
        <div className={editor.grid} data-preference-level="middle">
          {keys
            .filter((key) => !key.startsWith("interests."))
            .map((key) => {
              const ends = styleEnds[key],
                value = state.draft.values[key];
              return (
                <section
                  key={key}
                  className={editor.card}
                  data-preference-key={key}
                >
                  <h2>
                    <label htmlFor={key}>{fieldLabels[key]}</label>
                  </h2>
                  {ends ? (
                    <>
                      <p>
                        {ends[0]} → {ends[1]}
                      </p>
                      <input
                        id={key}
                        aria-label={fieldLabels[key]}
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={typeof value === "number" ? value : 3}
                        onChange={(e) =>
                          state.edit(
                            editPreferenceValue(
                              state.draft,
                              key,
                              Number(e.target.value),
                            ),
                          )
                        }
                      />
                      <p>
                        {value === undefined
                          ? "未设置（滑轨位置仅供编辑，尚未保存）"
                          : String(value) + " / 5"}
                      </p>
                      {value === undefined ? (
                        <button
                          type="button"
                          onClick={() =>
                            state.edit(editPreferenceValue(state.draft, key, 3))
                          }
                        >
                          将{fieldLabels[key]}设为中间档（3）
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          state.edit(
                            editPreferenceValue(state.draft, key, undefined),
                          )
                        }
                      >
                        清除{fieldLabels[key]}
                      </button>
                    </>
                  ) : (
                    <select
                      id={key}
                      value={value === undefined ? "" : String(value)}
                      onChange={(e) => {
                        const choice = e.target.value;
                        const selected = scalarOptions(key).find(
                          (v) => String(v) === choice,
                        );
                        state.edit(
                          editPreferenceValue(
                            state.draft,
                            key,
                            choice === "" ? undefined : selected,
                          ),
                        );
                      }}
                    >
                      <option value="">未设置</option>
                      {scalarOptions(key).map((option) => (
                        <option key={String(option)} value={String(option)}>
                          {valueLabels[String(option)] ?? String(option)}
                        </option>
                      ))}
                    </select>
                  )}
                </section>
              );
            })}
        </div>
        {keys.includes("interests.preferences") ? (
          <section aria-label="景点兴趣与细分" data-preference-level="small">
            <h2>兴趣偏好与详细设置</h2>
            <p>每项可选喜欢、不喜欢或未设置。细分只表达正向兴趣。</p>
            <div className={editor.grid}>
              {interestCodes.map((interest) => {
                const signal =
                  state.draft.values["interests.preferences"]?.[interest];
                return (
                  <section key={interest} className={editor.card}>
                    <h3>
                      <label htmlFor={"interest-" + interest}>
                        {interestLabels[interest]}
                      </label>
                    </h3>
                    <select
                      id={"interest-" + interest}
                      value={signal ?? ""}
                      onChange={(e) => setSignal(interest, e.target.value)}
                    >
                      <option value="">未设置</option>
                      <option value="like">喜欢</option>
                      <option value="dislike">不喜欢</option>
                    </select>
                    <fieldset disabled={signal === "dislike"}>
                      <legend>{interestLabels[interest]}细分</legend>
                      {interestDetails[interest].map((detail) => (
                        <label key={detail} className={editor.detail}>
                          <input
                            type="checkbox"
                            checked={
                              state.draft.values["interests.details"]?.[
                                interest
                              ]?.some((x) => x === detail) ?? false
                            }
                            onChange={() => toggleDetail(interest, detail)}
                          />
                          {detailLabels[detail]}
                        </label>
                      ))}
                    </fieldset>
                  </section>
                );
              })}
            </div>
          </section>
        ) : null}
      </fieldset>
      <footer className={editor.actions}>
        <span>{isDirty ? "有尚未保存的修改" : "已与读取的服务器版本同步"}</span>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={disabled}
          onClick={clearPage}
        >
          清空本页选择
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={state.busy || !isDirty}
          onClick={state.cancel}
        >
          取消
        </button>
        <button
          type="button"
          className={styles.resetButton}
          disabled={
            disabled || !isDirty || state.error === "STALE_PREFERENCE_REVISION"
          }
          onClick={() => void state.save()}
        >
          保存偏好
        </button>
      </footer>
    </div>
  );
}
