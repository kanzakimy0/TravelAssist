import type {
  RouteNode,
  RouteSegment,
  RouteTransportMode,
} from "../model/start-flow-draft";
import styles from "../start-flow.module.css";

const MODE_LABELS: Record<RouteTransportMode, string> = {
  train: "电车",
  shinkansen: "新干线",
  drive: "自驾",
  flight: "航班",
  ferry: "渡轮",
};

interface RouteMiniMapProps {
  nodes: RouteNode[];
  segments: RouteSegment[];
}

export function RouteMiniMap({ nodes, segments }: RouteMiniMapProps) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return (
    <figure className={styles.routeMiniMap}>
      <svg
        aria-label={`路线图：${nodes.map((node) => node.label).join("、")}`}
        role="img"
        viewBox="0 0 280 200"
      >
        <path
          className={styles.routeLand}
          d="M243 23c22 19 23 42 1 55-19 11-17 31-35 43-23 15-37 1-57 16-20 16-20 36-50 43-23 5-52-1-63-17-9-13 4-27 23-35 17-8 17-27 32-37 18-12 33-1 48-14 20-17 17-40 34-58 16-17 45-20 67 5Z"
        />
        {segments.map((segment) => {
          const from = nodeMap.get(segment.from);
          const to = nodeMap.get(segment.to);
          if (!from || !to) return null;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <g key={`${segment.from}-${segment.to}`}>
              <line
                className={styles.routeLine}
                data-mode={segment.mode}
                x1={from.x}
                x2={to.x}
                y1={from.y}
                y2={to.y}
              />
              <g transform={`translate(${midX}, ${midY})`}>
                <rect
                  className={styles.routeModePill}
                  height="18"
                  rx="9"
                  width="42"
                  x="-21"
                  y="-9"
                />
                <text
                  className={styles.routeModeText}
                  textAnchor="middle"
                  y="3"
                >
                  {MODE_LABELS[segment.mode]}
                </text>
              </g>
            </g>
          );
        })}
        {nodes.map((node, index) => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <circle className={styles.routeNodeHalo} r="9" />
            <circle className={styles.routeNode} r="4" />
            <text
              className={styles.routeNodeLabel}
              textAnchor={node.x > 215 ? "end" : "start"}
              x={node.x > 215 ? -10 : 10}
              y={index % 2 === 0 ? -7 : 14}
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className={styles.srOnly}>简化地图式路线缩略图</figcaption>
    </figure>
  );
}
