import { useRef, useState } from "react";
import type { StopKind } from "../model/planner-types";
import { PlannerIcon } from "./planner-icon";
import { PlannerPopover } from "./planner-popover";
import styles from "../planner.module.css";
const layers = [
  ["sight", "景点"],
  ["transport", "交通"],
  ["stay", "酒店"],
  ["food", "美食"],
] as const;
export function MapLayerToolbar({
  collapsed,
  onCollapse,
  visible,
  onToggle,
  terrain,
  onTerrain,
}: {
  collapsed: boolean;
  onCollapse: () => void;
  visible: StopKind[];
  onToggle: (kind: StopKind) => void;
  terrain: boolean;
  onTerrain: () => void;
}) {
  const [more, setMore] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <aside className={styles.toolbar} aria-label="地图工具">
      {!collapsed && (
        <div className={styles.toolbarItems}>
          <button type="button" aria-pressed={terrain} onClick={onTerrain}>
            <PlannerIcon name="layers" />
            <span>图层</span>
          </button>
          {layers.map(([kind, title]) => (
            <button
              type="button"
              key={kind}
              aria-pressed={visible.includes(kind)}
              onClick={() => onToggle(kind)}
            >
              <PlannerIcon name={kind} />
              <span>{title}</span>
            </button>
          ))}
          <button
            type="button"
            ref={trigger}
            className={styles.moreLayerButton}
            aria-expanded={more}
            onClick={() => setMore(!more)}
          >
            <span aria-hidden="true">···</span>
            <span>更多</span>
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setMore(false);
          onCollapse();
        }}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "展开地图工具" : "收起地图工具"}
        className={styles.toolbarToggle}
      >
        <PlannerIcon name={collapsed ? "layers" : "chevron"} />
      </button>
      {more && (
        <PlannerPopover
          id="more-map-layers"
          title="更多地图图层"
          trigger={trigger}
          onClose={() => setMore(false)}
        >
          <button
            type="button"
            aria-pressed={visible.includes("booking")}
            onClick={() => onToggle("booking")}
          >
            <PlannerIcon name="booking" />
            已订活动
          </button>
        </PlannerPopover>
      )}
    </aside>
  );
}
