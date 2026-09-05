import { useEffect, useEffectEvent, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { mountMapbox, schematicLayout } from "../map/map-provider";
import type { MapSession } from "../map/map-provider";
import type { Coordinates, MapView } from "../model/trip-model";
import styles from "../planner.module.css";

export function PlannerMapShell({
  view,
  onSelect,
  terrain,
}: {
  view: MapView;
  onSelect: (id: string, tripItemId?: string) => void;
  terrain: boolean;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const container = useRef<HTMLDivElement>(null);
  const session = useRef<MapSession | null>(null);
  const latest = useRef(view);
  const [mapStatus, setMapStatus] = useState(
    token
      ? "正在加载 Mapbox · 暂用示意地图"
      : "未配置 Mapbox Token · 可操作示意地图",
  );
  const select = useEffectEvent(onSelect);
  useEffect(() => {
    let cancelled = false;
    if (!container.current || !token) return;
    mountMapbox(
      container.current,
      token,
      (id, itemId) => select(id, itemId),
      setMapStatus,
    )
      .then((mounted) => {
        if (cancelled) mounted?.destroy();
        else {
          session.current = mounted;
          mounted?.update(latest.current);
        }
      })
      .catch(() => {
        if (!cancelled) setMapStatus("底图暂不可用 · 已切换可操作示意地图");
      });
    return () => {
      cancelled = true;
      session.current?.destroy();
      session.current = null;
    };
  }, [token]);
  useEffect(() => {
    latest.current = view;
    session.current?.update(view);
  }, [view]);
  const live = mapStatus.startsWith("Mapbox 底图");
  return (
    <div
      className={styles.mapCanvas}
      data-map-range={view.range}
      data-map-engine={live ? "mapbox" : "fallback"}
    >
      <div
        ref={container}
        className={styles.mapboxHost}
        aria-label="Mapbox 地图；键盘操作请使用地图地点列表"
        style={{ visibility: live ? "visible" : "hidden" }}
      />
      {!live && (
        <SchematicMap view={view} onSelect={onSelect} terrain={terrain} />
      )}
      <div className={styles.mapInfo}>
        <p role="status">{mapStatus}</p>
        <small>
          {view.range === "all"
            ? "城市 / 住宿结构 / 城际移动"
            : "实线：当前范围 · 浅灰：相邻衔接 · 空心：备选"}{" "}
          · 非真实路线
        </small>
      </div>
      <details className={styles.mapList}>
        <summary>
          地图地点列表 · {view.places.length + view.areas.length}
        </summary>
        <div role="group" aria-label="地图等价操作列表">
          {view.areas.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => onSelect(area.id)}
            >
              {area.name} · 查看区域推荐
            </button>
          ))}
          {view.places.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={Boolean(
                p.focused ||
                (p.tripItemId && p.tripItemId === view.selectedTripItemId),
              )}
              onClick={() => onSelect(p.id, p.tripItemId)}
            >
              {p.label} · {p.tripStatus === "recommended" ? "备选" : "行程内"}
              {p.tripItemId === view.selectedTripItemId ? " · 已选中" : ""}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
function SchematicMap({
  view,
  onSelect,
  terrain,
}: {
  view: MapView;
  onSelect: (id: string, tripItemId?: string) => void;
  terrain: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 600 });
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, []);
  const { project, positions } = schematicLayout(view, size.width, size.height);
  const path = (points: Coordinates[]) =>
    points.map((p, i) => `${i ? "L" : "M"}${project(p).join(",")}`).join(" ");
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${size.width} ${size.height}`}
      className={styles.mapSvg}
      aria-label="行程示意地图，路线非真实道路"
      role="group"
    >
      <defs>
        <pattern
          id="planner-paper-grid"
          width="55"
          height="45"
          patternUnits="userSpaceOnUse"
        >
          <path d="M55 0H0V45" fill="none" stroke="#d6cbbd" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect
        width={size.width}
        height={size.height}
        fill={terrain ? "#eee9df" : "#faf6ef"}
      />
      {terrain && (
        <>
          <path d="M0 0H620Q660 110 480 190T170 340L0 290Z" fill="#dfe3d9" />
          <path d="M640 600Q580 420 800 370T1000 200V600Z" fill="#d5e0df" />
          <rect
            width={size.width}
            height={size.height}
            fill="url(#planner-paper-grid)"
          />
          <path
            d="M0 270Q320 200 440 350T1000 430"
            stroke="#fffaf1"
            strokeWidth="16"
            fill="none"
          />
        </>
      )}
      {view.routes.map((route) => (
        <path
          key={route.id}
          data-route-role={route.context ? "context" : "selected"}
          data-route-id={route.id}
          d={path(route.coordinates)}
          fill="none"
          stroke={route.color}
          strokeWidth={route.context ? 3.2 : 5}
          opacity={route.context ? 0.25 : 0.85}
          strokeLinecap="round"
        >
          <title>{route.label}</title>
        </path>
      ))}
      {view.areas.map((area) => (
        <g
          key={area.id}
          role="button"
          tabIndex={0}
          aria-label={`查看${area.name}`}
          onClick={() => onSelect(area.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(area.id);
            }
          }}
          className={styles.svgFeature}
        >
          <path
            d={path(area.polygon) + "Z"}
            fill={area.type === "hotelArea" ? "#b8a38e" : "#d1a493"}
            fillOpacity="0.3"
            stroke="#8a7264"
            strokeDasharray="4 3"
          />
          <text
            x={project(area.coordinates)[0]}
            y={project(area.coordinates)[1] - 20}
            textAnchor="middle"
            className={styles.areaLabel}
          >
            {area.name}
          </text>
        </g>
      ))}
      {positions.map((p) => (
        <line
          key={`leader-${p.id}`}
          x1={p.origin[0]}
          y1={p.origin[1]}
          x2={p.label[0]}
          y2={p.label[1]}
          stroke="#968679"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.7"
          pointerEvents="none"
        />
      ))}
      {view.places.map((p, i) => {
        const [x, y] = positions[i].label,
          selected = Boolean(
            p.focused ||
            (p.tripItemId && p.tripItemId === view.selectedTripItemId),
          );
        return (
          <g
            key={p.id}
            role="button"
            tabIndex={0}
            data-map-stop={p.tripItemId}
            aria-label={`${p.label}${selected ? " · 已选中" : ""}`}
            aria-pressed={selected}
            onClick={() => onSelect(p.id, p.tripItemId)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(p.id, p.tripItemId);
              }
            }}
            className={styles.svgFeature}
          >
            <rect
              x={x - 78}
              y={y - 21}
              width="156"
              height="52"
              rx="8"
              fill="#fffaf2"
              fillOpacity="0.78"
            />
            {selected && (
              <circle
                cx={x}
                cy={y}
                r="18"
                fill="none"
                stroke="#a74739"
                strokeWidth="3"
              />
            )}
            <circle
              cx={x}
              cy={y}
              r={p.type === "city" ? 12 : 9}
              fill={p.tripStatus === "recommended" ? "#e9e4db" : "#fffaf4"}
              stroke={p.color}
              strokeWidth="2.5"
            />
            <text
              x={x}
              y={y + 3}
              textAnchor="middle"
              fontSize="9"
              fill="#343e48"
            >
              {p.tripStatus === "recommended" ? "+" : p.day}
            </text>
            <text
              x={x}
              y={y + 25}
              textAnchor="middle"
              className={styles.pinText}
            >
              {p.label}
            </text>
            {p.reservationStatus && p.reservationStatus !== "not_required" && (
              <text x={x + 14} y={y - 7} fontSize="14" fill="#914737">
                {["booked", "ticketed"].includes(p.reservationStatus)
                  ? "✓"
                  : "!"}
              </text>
            )}
            <title>{`${p.name} · ${p.reservationStatus ?? p.tripStatus}`}</title>
          </g>
        );
      })}
    </svg>
  );
}
