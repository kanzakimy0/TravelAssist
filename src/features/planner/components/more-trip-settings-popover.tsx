import { useState, type Dispatch, type RefObject } from "react";
import {
  tripReducer,
  type TripAction,
  type TripState,
} from "../model/trip-model";
import {
  settingsCategories,
  settingsDirtyCount,
  settingsImpact,
} from "../model/secondary-panels";
import {
  budgetLabels,
  dailyBudgets,
  paceLabels,
  dailyPlaces,
  preferenceDefinitions,
} from "../data/planner-preferences";
import { PlannerOverlay } from "./planner-overlay";
import { PreferenceEditor } from "./preference-editor";
import styles from "../planner.module.css";
import ui from "../planner-v05.module.css";

export function MoreTripSettingsPopover({
  state,
  dispatch,
  onClose,
  preview = false,
  onGenerate,
}: {
  trigger: RefObject<HTMLButtonElement | null>;
  state: TripState;
  dispatch: Dispatch<TripAction>;
  onClose: () => void;
  preview?: boolean;
  onGenerate: () => void;
}) {
  const [openingSnapshot] = useState(() =>
    structuredClone(state.configuration),
  );
  const [settingsDraft, setSettingsDraft] = useState(openingSnapshot);
  const [category, setCategory] = useState(0);
  const [showPreview, setShowPreview] = useState(preview);
  const dirty = settingsDirtyCount(openingSnapshot, settingsDraft);
  const draftState = { ...state, configuration: settingsDraft };
  const impact = settingsImpact(state);
  function draftDispatch(action: TripAction) {
    if (action.type === "preference" || action.type === "level") {
      setSettingsDraft(
        (current) =>
          tripReducer({ ...state, configuration: current }, action)
            .configuration,
      );
    } else if (action.type === "ui") {
      dispatch(action);
      onClose();
    }
  }
  return (
    <PlannerOverlay
      kind="settings"
      title={showPreview ? "重新规划影响预览" : "更多行程设置"}
      onClose={onClose}
    >
      <div
        className={ui.workbench}
        id="more-trip-settings"
        data-settings-workbench
      >
        {showPreview ? (
          <div className={ui.impact}>
            <p className={ui.eyebrow}>LOCAL PREVIEW · 本地规则示例</p>
            <h3>预览 {impact.changed} 项变更</h3>
            <p>
              影响日期：{impact.days.map((day) => "Day " + day).join(" / ")}
            </p>
            <section>
              <h4>可评估的普通节点</h4>
              <p>
                {impact.movable.map((i) => i.title).join("、") ||
                  "没有可调整节点"}
              </p>
            </section>
            <section>
              <h4>保持不动 · 预约 / 酒店 / 锁定交通 / 固定时间</h4>
              <p>
                {impact.protected.map((i) => i.title).join("、") ||
                  "暂无固定安排"}
              </p>
            </section>
            <p role="status">{impact.estimates}</p>
            <footer>
              <button type="button" onClick={() => setShowPreview(false)}>
                返回修改
              </button>
              <button
                type="button"
                onClick={() => {
                  onGenerate();
                  onClose();
                }}
              >
                生成预览路线（Mock）
              </button>
            </footer>
          </div>
        ) : (
          <>
            <div className={ui.workbenchBody}>
              <nav aria-label="行程设置分类" className={ui.categories}>
                {settingsCategories.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    aria-current={index === category ? "true" : undefined}
                    onClick={() => setCategory(index)}
                  >
                    {item.title}
                  </button>
                ))}
              </nav>
              <div className={ui.settingsContent}>
                <h3>{settingsCategories[category].title}</h3>
                <p className={styles.hint}>
                  仅编辑草稿；保存不会自动改变路线。已确认预约和固定安排始终受保护。
                </p>
                {category === 0 &&
                  (["budget", "pace"] as const).map((key) => {
                    const labels = key === "budget" ? budgetLabels : paceLabels;
                    return (
                      <label className={styles.field} key={key}>
                        {key === "budget" ? "预算" : "旅行节奏"} ·{" "}
                        {labels[settingsDraft[key]]}
                        <input
                          aria-label={
                            key === "budget" ? "预算档位" : "旅行节奏档位"
                          }
                          type="range"
                          min={0}
                          max={labels.length - 1}
                          step={1}
                          value={settingsDraft[key]}
                          aria-valuetext={labels[settingsDraft[key]]}
                          onChange={(e) =>
                            draftDispatch({
                              type: "level",
                              key,
                              value: Number(e.target.value),
                            })
                          }
                        />
                        <small>
                          {key === "budget"
                            ? dailyBudgets[settingsDraft.budget] +
                              " / 人 / 天（示例）"
                            : "每天 " +
                              dailyPlaces[settingsDraft.pace] +
                              " 个主要地点（偏好目标）"}
                        </small>
                      </label>
                    );
                  })}
                {settingsCategories[category].groups.map((group) => (
                  <section key={group}>
                    <h4>{preferenceDefinitions[group].title}</h4>
                    <PreferenceEditor
                      group={group}
                      state={draftState}
                      dispatch={draftDispatch}
                    />
                  </section>
                ))}
              </div>
            </div>
            <footer>
              <span role="status">
                {dirty ? dirty + " 项草稿修改" : "尚未修改"}
              </span>
              <button type="button" onClick={onClose}>
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  dispatch({
                    type: "saveSettings",
                    configuration: settingsDraft,
                  });
                  onClose();
                }}
              >
                保存设置
              </button>
            </footer>
          </>
        )}
      </div>
    </PlannerOverlay>
  );
}
