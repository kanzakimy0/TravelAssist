"use client";

import Image from "next/image";
import { useState } from "react";

import {
  levelLabel,
  levelWeight,
  pointAt,
  radarPolygonPoints,
  type RadarAxis,
} from "./preference-model";
import styles from "./preference-center.module.css";

const gridLevels = [0.25, 0.5, 0.75, 1];

function polygonAtScale(scale: number, count: number): string {
  return Array.from({ length: count }, (_, index) => {
    const point = pointAt(index, count, 86 * scale);
    return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }).join(" ");
}

export function PreferenceRadar({
  title,
  description,
  axes,
  image,
}: {
  title: string;
  description: string;
  axes: RadarAxis[];
  image: string;
}) {
  const [activeAxisId, setActiveAxisId] = useState<string | null>(
    axes[0]?.id ?? null,
  );
  const points = radarPolygonPoints(axes);
  const activeAxis =
    axes.find((axis) => axis.id === activeAxisId) ?? axes[0] ?? null;

  return (
    <article className={styles.radarCard}>
      <div className={styles.radarHeading}>
        <div>
          <p>LONG-TERM PORTRAIT</p>
          <h2>{title}</h2>
          <span>{description}</span>
        </div>
        <div className={styles.radarArtwork} aria-hidden="true">
          <Image src={image} alt="" fill sizes="132px" />
        </div>
      </div>

      <div className={styles.radarBody}>
        <svg
          className={styles.radarSvg}
          viewBox="0 0 340 300"
          role="img"
          aria-labelledby={`${title}-radar-title ${title}-radar-description`}
        >
          <title id={`${title}-radar-title`}>{title}</title>
          <desc id={`${title}-radar-description`}>
            {axes
              .map((axis) => `${axis.label}：${levelLabel(axis.level)}`)
              .join("；")}
          </desc>
          {gridLevels.map((scale) => (
            <polygon
              key={scale}
              className={styles.radarGridLine}
              points={polygonAtScale(scale, axes.length)}
            />
          ))}
          {axes.map((axis, index) => {
            const edge = pointAt(index, axes.length, 86);
            return (
              <line
                key={`${axis.id}-line`}
                className={styles.radarAxisLine}
                x1="170"
                y1="150"
                x2={edge.x}
                y2={edge.y}
              />
            );
          })}
          <polygon className={styles.radarShape} points={points} />
          {axes.map((axis, index) => {
            const valuePoint = pointAt(
              index,
              axes.length,
              86 * levelWeight(axis.level),
            );
            const labelPoint = pointAt(index, axes.length, 112);
            const anchor =
              labelPoint.x < 150
                ? "end"
                : labelPoint.x > 190
                  ? "start"
                  : "middle";
            return (
              <g
                key={axis.id}
                className={styles.axisTarget}
                role="button"
                tabIndex={0}
                aria-label={`${axis.label}：${levelLabel(axis.level)}`}
                onMouseEnter={() => setActiveAxisId(axis.id)}
                onFocus={() => setActiveAxisId(axis.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveAxisId(axis.id);
                  }
                }}
              >
                <circle cx={valuePoint.x} cy={valuePoint.y} r="15" />
                <circle
                  className={styles.radarPoint}
                  cx={valuePoint.x}
                  cy={valuePoint.y}
                  r="4.5"
                />
                <text
                  className={styles.radarLabel}
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                >
                  {axis.label}
                </text>
              </g>
            );
          })}
        </svg>

        <div className={styles.radarReading} aria-live="polite">
          <span>{activeAxis?.label ?? "画像维度"}</span>
          <strong>
            {activeAxis ? levelLabel(activeAxis.level) : "未设置"}
          </strong>
        </div>
      </div>
    </article>
  );
}
