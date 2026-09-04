import type {
  TravelStyleKey,
  TravelStyleValues,
} from "../model/start-flow-draft";
import styles from "../start-flow.module.css";

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
    <fieldset className={styles.styleGroup}>
      <legend>{title}</legend>
      {items.map((item) => (
        <label className={styles.styleSlider} key={item.key}>
          <span className={styles.sliderLabels}>
            <span>{item.left}</span>
            <span>{item.right}</span>
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
        </label>
      ))}
    </fieldset>
  );
}
