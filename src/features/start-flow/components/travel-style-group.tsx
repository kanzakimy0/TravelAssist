import type {
  TravelStyleKey,
  TravelStyleValues,
} from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { InfoPopover } from "./info-popover";

const STYLE_HELP: Record<TravelStyleKey, string> = {
  pace: "控制每天安排的密度与留白。",
  depth: "决定是覆盖代表景点，还是为单个体验留出更多时间。",
  discovery: "调节经典名所与在地小众地点的比例。",
  movement: "决定是否频繁更换住宿城市。",
  coverage: "控制单一区域深度与多区域覆盖之间的平衡。",
  priority: "影响交通、住宿和体验升级的取舍。",
};

interface StyleItem {
  key: TravelStyleKey;
  left: string;
  right: string;
}

interface TravelStyleGroupProps {
  items: StyleItem[];
  onChange: (key: TravelStyleKey, value: number) => void;
  title: string;
  values: TravelStyleValues;
}

export function TravelStyleGroup({
  items,
  onChange,
  title,
  values,
}: TravelStyleGroupProps) {
  return (
    <section aria-label={title} className={styles.styleGroup} role="group">
      <h3>{title}</h3>
      {items.map((item) => (
        <div className={styles.styleSlider} key={item.key}>
          <span className={styles.sliderLeftLabel}>
            {item.left}
            <InfoPopover
              label={`${item.left}与${item.right}说明`}
              text={STYLE_HELP[item.key]}
            />
          </span>
          <span className={styles.rangeWrap}>
            <input
              aria-label={`${item.left}到${item.right}，当前第 ${values[item.key]} 档`}
              max="5"
              min="1"
              onChange={(event) =>
                onChange(item.key, Number(event.target.value))
              }
              step="1"
              type="range"
              value={values[item.key]}
            />
            <span aria-hidden="true" className={styles.rangeDots}>
              {[1, 2, 3, 4, 5].map((value) => (
                <i data-active={value <= values[item.key]} key={value} />
              ))}
            </span>
          </span>
          <span className={styles.sliderRightLabel}>{item.right}</span>
        </div>
      ))}
    </section>
  );
}
