import type { CSSProperties } from "react";
import type { MockDay, StopKind } from "../model/planner-types";
import { mapBounds } from "../model/planner-state";
import styles from "../planner.module.css";

// Replace this renderer in a future Map Provider task; selection and trip data stay in the page.
export function PlannerMapShell({
  days,
  selectedStopId,
  onSelectStop,
  layers,
  terrain,
  planName,
}: {
  days: MockDay[];
  selectedStopId: string | null;
  onSelectStop: (id: string) => void;
  layers: StopKind[];
  terrain: boolean;
  planName: string;
}) {
  const bounds = mapBounds(days);
  const visibleStops = days
    .flatMap((day) => day.stops)
    .filter((stop) => layers.includes(stop.kind) || stop.id === selectedStopId);
  function pinOffset(id: string, x: number, y: number) {
    const shared = visibleStops.filter((stop) => stop.x === x && stop.y === y);
    // Separate stops at the same place on different days without changing route geometry.
    return (
      (shared.findIndex((stop) => stop.id === id) - (shared.length - 1) / 2) *
      36
    );
  }
  const pointStyle = (x: number, y: number) => ({
    left: `${((x - bounds.x) / bounds.width) * 100}%`,
    top: `${((y - bounds.y) / bounds.height) * 100}%`,
  });
  return (
    <div
      className={styles.mapCanvas}
      data-map-plan={planName}
      data-map-days={days.map((day) => day.day).join(",")}
      aria-label={`${planName}示意地图`}
    >
      <svg
        className={styles.mapSvg}
        viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="planner-grid"
            width="34"
            height="34"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-18)"
          >
            <path
              d="M0 0H34V34"
              fill="none"
              stroke="#d8d0c6"
              strokeWidth="1"
              opacity=".38"
            />
          </pattern>
        </defs>
        <rect width="1000" height="600" fill="#f0ece3" />
        <path
          d="M910 230Q870 285 917 340L938 370 890 420 960 475 1000 480V600H500Q540 550 580 560L670 540 710 560 745 515 790 490 810 430 860 385 840 310Z"
          fill="#d9e4e6"
        />
        <path
          d="M80 0Q40 180 130 235T220 410L400 555 490 470 430 340 510 190 430 0Z"
          fill={terrain ? "#e3e3d6" : "#efebe4"}
        />
        {terrain && (
          <g fill="none" stroke="#cfcfc0" opacity=".58" strokeWidth="1.5">
            <path d="M70 40Q350 10 340 155T220 380T430 565M120 30Q420 30 395 165T275 375T460 530M90 120Q305 90 265 210T200 330M410 160Q535 270 470 380T550 560M360 80Q470 170 430 240" />
            <path d="M450 375Q590 315 670 390T590 525M420 380Q590 290 710 390T620 555" />
          </g>
        )}
        <path
          d="M520 0H1000V520L780 480 690 380 550 330Z"
          fill="url(#planner-grid)"
        />
        <g fill="none" stroke="#fffcf7" strokeWidth="10">
          <path d="M0 260Q235 140 345 180T610 200L910 330M240 600Q380 320 490 360T730 410L1000 500M650 0Q640 180 685 225T880 390" />
          <path
            d="m620 30 240 320M560 100l310 120M590 290l270-210M615 460l245-100"
            strokeWidth="5"
          />
        </g>
        <g fill="none" stroke="#d0c5b6" strokeWidth="1.5">
          <path d="M0 260Q235 140 345 180T610 200L910 330M240 600Q380 320 490 360T730 410L1000 500M650 0Q640 180 685 225T880 390" />
        </g>
        <path
          d="M280 125q-70 3-70 30t90 0 65-10-85-20M507 453q-20 20-4 52t27-8-3-40Z"
          fill="#c9dde0"
          stroke="#b4cbd0"
          strokeWidth="2"
        />
        <path d="m315 365 45-80 49 80Z" fill="#c0c6c4" />
        <path d="m346 310 14-25 15 25-14-8Z" fill="#fffcf7" />
        <g fill="#85877e" fontSize="15" letterSpacing="5">
          <text x="400" y="75">
            山梨
          </text>
          <text x="580" y="315">
            神奈川
          </text>
          <text x="915" y="525">
            東京湾
          </text>
          <text x="150" y="480">
            静岡
          </text>
        </g>
        {days.map((day) => (
          <polyline
            key={day.day}
            data-route-day={day.day}
            points={day.stops.map((stop) => `${stop.x},${stop.y}`).join(" ")}
            fill="none"
            stroke={day.color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity=".88"
          />
        ))}
      </svg>
      <div className={styles.placeNames} aria-hidden="true">
        {[
          ["东京", 790, 220],
          ["河口湖", 295, 95],
          ["富士山", 360, 380],
          ["箱根", 565, 480],
        ].map(([name, x, y]) => (
          <span key={name} style={pointStyle(Number(x), Number(y))}>
            {name}
          </span>
        ))}
      </div>
      {days.flatMap((day) =>
        day.stops
          .filter(
            (stop) => layers.includes(stop.kind) || stop.id === selectedStopId,
          )
          .map((stop) => (
            <button
              key={stop.id}
              type="button"
              className={styles.mapPin}
              style={
                {
                  ...pointStyle(stop.x, stop.y),
                  marginLeft: pinOffset(stop.id, stop.x, stop.y),
                  "--route-color": day.color,
                } as CSSProperties
              }
              aria-label={`地图 Day ${day.day} ${stop.time} ${stop.name}`}
              aria-pressed={stop.id === selectedStopId}
              data-stop-id={stop.id}
              onClick={() => onSelectStop(stop.id)}
            >
              <span className={styles.pinNumber}>
                {day.day}.{day.stops.indexOf(stop) + 1}
              </span>
              <span className={styles.pinLabel}>{stop.name}</span>
            </button>
          )),
      )}
      {layers.includes("transport") &&
        days.map((day) => {
          const start = day.stops[0];
          const end = day.stops[1];
          return (
            <span
              key={day.day}
              className={styles.transportLabel}
              style={pointStyle((start.x + end.x) / 2, (start.y + end.y) / 2)}
            >
              {start.next} · Day {day.day}
            </span>
          );
        })}
      <div className={styles.mapLegend}>
        {days.map((day) => (
          <span key={day.day}>
            <i style={{ background: day.color }} />
            Day {day.day} · {day.date}
          </span>
        ))}
      </div>
      <p className={styles.mapDisclaimer}>
        示意地图 · 非真实比例 / 路线 / 实时数据
      </p>
    </div>
  );
}
