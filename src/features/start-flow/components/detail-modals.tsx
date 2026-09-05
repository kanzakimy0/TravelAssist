import { Button } from "@/components/ui/button";

import type {
  BudgetDetails,
  TransportDetails,
  TransportMode,
  TravelerDetails,
} from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { Modal } from "./modal";

interface DetailModalProps<T> {
  onChange: (patch: Partial<T>) => void;
  onClose: () => void;
  value: T;
}

function ToggleField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.toggleField}>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}

export function TransportDetailModal({
  mode,
  onChange,
  onClose,
  value,
}: DetailModalProps<TransportDetails> & { mode: TransportMode }) {
  return (
    <Modal
      description="这些偏好只影响后续路线建议，不会覆盖主交通方式。"
      onClose={onClose}
      title="交通偏好详情"
    >
      <div className={styles.detailForm}>
        {mode === "public" || mode === "recommended" ? (
          <fieldset>
            <legend>公共交通</legend>
            <div className={styles.toggleGrid}>
              <ToggleField
                checked={value.railFirst}
                label="铁路优先"
                onChange={(railFirst) => onChange({ railFirst })}
              />
              <ToggleField
                checked={value.busAcceptable}
                label="巴士可接受"
                onChange={(busAcceptable) => onChange({ busAcceptable })}
              />
              <ToggleField
                checked={value.fewerTransfers}
                label="少换乘"
                onChange={(fewerTransfers) => onChange({ fewerTransfers })}
              />
              <ToggleField
                checked={value.lessWalking}
                label="少步行"
                onChange={(lessWalking) => onChange({ lessWalking })}
              />
              <ToggleField
                checked={value.shinkansenFirst}
                label="新干线优先"
                onChange={(shinkansenFirst) => onChange({ shinkansenFirst })}
              />
            </div>
          </fieldset>
        ) : null}
        {mode === "driving" || mode === "recommended" ? (
          <fieldset>
            <legend>自驾</legend>
            <div className={styles.toggleGrid}>
              <ToggleField
                checked={value.useHighways}
                label="可走高速"
                onChange={(useHighways) => onChange({ useHighways })}
              />
              <ToggleField
                checked={value.mountainRoads}
                label="可走山路"
                onChange={(mountainRoads) => onChange({ mountainRoads })}
              />
              <ToggleField
                checked={value.nightDriving}
                label="接受夜间驾驶"
                onChange={(nightDriving) => onChange({ nightDriving })}
              />
              <ToggleField
                checked={value.snowDriving}
                label="接受雪地驾驶"
                onChange={(snowDriving) => onChange({ snowDriving })}
              />
              <label className={styles.modalField}>
                <span>每日最长驾驶时间</span>
                <select
                  onChange={(event) =>
                    onChange({ maxDrivingHours: event.target.value })
                  }
                  value={value.maxDrivingHours}
                >
                  <option value="2">2 小时</option>
                  <option value="4">4 小时</option>
                  <option value="6">6 小时</option>
                  <option value="8">8 小时</option>
                </select>
              </label>
            </div>
          </fieldset>
        ) : null}
        {mode === "mixed" || mode === "recommended" ? (
          <fieldset>
            <legend>混合方式</legend>
            <div className={styles.toggleGrid}>
              <ToggleField
                checked={value.intercityRail}
                label="城市间铁路"
                onChange={(intercityRail) => onChange({ intercityRail })}
              />
              <ToggleField
                checked={value.suburbanDriving}
                label="郊区自驾"
                onChange={(suburbanDriving) => onChange({ suburbanDriving })}
              />
              <ToggleField
                checked={value.autoCombine}
                label="系统自动组合"
                onChange={(autoCombine) => onChange({ autoCombine })}
              />
            </div>
          </fieldset>
        ) : null}
      </div>
      <div className={styles.modalActions}>
        <span />
        <span />
        <Button onClick={onClose}>完成</Button>
      </div>
    </Modal>
  );
}

export function TravelerDetailModal({
  onChange,
  onClose,
  value,
}: DetailModalProps<TravelerDetails>) {
  return (
    <Modal
      description="补充需要照顾的同行人信息，方便安排步行与休息节奏。"
      onClose={onClose}
      title="同行人员详情"
    >
      <div className={styles.detailForm}>
        <fieldset>
          <legend>儿童</legend>
          <div className={styles.detailRow}>
            <label className={styles.modalField}>
              <span>年龄</span>
              <input
                inputMode="numeric"
                onChange={(event) => onChange({ childAge: event.target.value })}
                placeholder="例如 6"
                value={value.childAge}
              />
            </label>
            <ToggleField
              checked={value.childSeat}
              label="需要儿童座椅"
              onChange={(childSeat) => onChange({ childSeat })}
            />
          </div>
        </fieldset>
        <fieldset>
          <legend>婴幼儿</legend>
          <div className={styles.detailRow}>
            <label className={styles.modalField}>
              <span>年龄</span>
              <input
                inputMode="decimal"
                onChange={(event) =>
                  onChange({ infantAge: event.target.value })
                }
                placeholder="例如 1.5"
                value={value.infantAge}
              />
            </label>
            <ToggleField
              checked={value.stroller}
              label="携带婴儿车"
              onChange={(stroller) => onChange({ stroller })}
            />
            <ToggleField
              checked={value.crib}
              label="需要婴儿床"
              onChange={(crib) => onChange({ crib })}
            />
          </div>
        </fieldset>
        <fieldset>
          <legend>老人</legend>
          <div className={styles.detailRow}>
            <label className={styles.modalField}>
              <span>步行能力</span>
              <select
                onChange={(event) =>
                  onChange({
                    seniorWalking: event.target
                      .value as TravelerDetails["seniorWalking"],
                  })
                }
                value={value.seniorWalking}
              >
                <option value="standard">一般</option>
                <option value="light">适合轻量步行</option>
                <option value="limited">行动受限</option>
              </select>
            </label>
            <ToggleField
              checked={value.reduceStairs}
              label="减少楼梯"
              onChange={(reduceStairs) => onChange({ reduceStairs })}
            />
            <label className={styles.modalField}>
              <span>休息频率</span>
              <select
                onChange={(event) =>
                  onChange({
                    restFrequency: event.target
                      .value as TravelerDetails["restFrequency"],
                  })
                }
                value={value.restFrequency}
              >
                <option value="standard">正常</option>
                <option value="often">较多休息</option>
                <option value="frequent">频繁休息</option>
              </select>
            </label>
          </div>
        </fieldset>
      </div>
      <div className={styles.modalActions}>
        <span />
        <span />
        <Button onClick={onClose}>完成</Button>
      </div>
    </Modal>
  );
}

export function BudgetDetailModal({
  onChange,
  onClose,
  value,
}: DetailModalProps<BudgetDetails>) {
  return (
    <Modal
      description="金额可按您习惯的币种填写，仅作为后续方案约束。"
      onClose={onClose}
      title="预算详情"
    >
      <div className={styles.budgetDetailGrid}>
        {(
          [
            ["totalBudget", "总预算"],
            ["perPersonBudget", "单人预算"],
            ["lodgingPerNight", "住宿 / 晚"],
            ["diningPerDay", "餐饮 / 天"],
          ] as const
        ).map(([key, label]) => (
          <label className={styles.modalField} key={key}>
            <span>{label}</span>
            <input
              inputMode="decimal"
              onChange={(event) => onChange({ [key]: event.target.value })}
              placeholder="输入金额"
              value={value[key]}
            />
          </label>
        ))}
        <label className={styles.modalField}>
          <span>付费景点接受度</span>
          <select
            onChange={(event) =>
              onChange({
                paidAttractions: event.target
                  .value as BudgetDetails["paidAttractions"],
              })
            }
            value={value.paidAttractions}
          >
            <option value="low">尽量免费</option>
            <option value="medium">适度付费</option>
            <option value="high">接受高价优质景点</option>
          </select>
        </label>
        <label className={styles.modalField}>
          <span>体验升级付费意愿</span>
          <select
            onChange={(event) =>
              onChange({
                experienceUpgrade: event.target
                  .value as BudgetDetails["experienceUpgrade"],
              })
            }
            value={value.experienceUpgrade}
          >
            <option value="no">不考虑</option>
            <option value="maybe">视情况</option>
            <option value="yes">愿意升级</option>
          </select>
        </label>
      </div>
      <div className={styles.modalActions}>
        <span />
        <span />
        <Button onClick={onClose}>完成</Button>
      </div>
    </Modal>
  );
}
