import type { StopKind } from "../model/planner-types";
import { PlannerIcon } from "./planner-icon";
import styles from "../planner.module.css";

const layers = [
  ["sight", "景点"],
  ["transport", "交通"],
  ["stay", "住宿"],
  ["food", "餐饮"],
  ["booking", "已订活动"],
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
  return (
    <aside className={styles.toolbar} aria-label="地图工具">
      <button
        type="button"
        onClick={onCollapse}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "展开地图工具" : "收起地图工具"}
      >
        <PlannerIcon name="layers" />
        {!collapsed && (
          <>
            <span>地图工具</span>
            <span aria-hidden="true">‹</span>
          </>
        )}
      </button>
      {!collapsed && (
        <div className={styles.toolbarItems}>
          <button type="button" aria-pressed={terrain} onClick={onTerrain}>
            <PlannerIcon name="map" />
            <span>地形图层</span>
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
        </div>
      )}
    </aside>
  );
}
