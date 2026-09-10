import Image from "next/image";
import { useId, useState, type ReactNode } from "react";
import { mapArtworkUrl, type PlannerArtwork } from "../data/planner-artwork";
import css from "../planner-artwork.module.css";

export function PlannerArtworkImage({
  artwork,
  className,
  sizes,
  fallback,
}: {
  artwork: PlannerArtwork;
  className: string;
  sizes: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState<string>();
  return (
    <span
      className={`${className} ${css.frame}`}
      data-planner-artwork={artwork.id}
      data-artwork-failed={failed === artwork.id}
    >
      {failed === artwork.id ? (
        fallback
      ) : (
        <>
          <Image
            className={css.image}
            src={artwork.src}
            fill
            sizes={sizes}
            alt={`${artwork.label} · AI 生成旅行插画，非实景照片`}
            onError={() => setFailed(artwork.id)}
          />
          <span className={css.credit} aria-hidden="true">
            AI 插画
          </span>
        </>
      )}
    </span>
  );
}

// The existing SVG geometry stays underneath as a no-network/error fallback.
export function SvgPlannerArtwork({
  artwork,
  x,
  y,
}: {
  artwork?: PlannerArtwork;
  x: number;
  y: number;
}) {
  const clip = `planner-art-${useId().replace(/:/g, "")}`;
  const [failed, setFailed] = useState<string>();
  if (!artwork || failed === artwork.id) return null;
  return (
    <g pointerEvents="none" data-map-artwork={artwork.id}>
      <defs>
        <clipPath id={clip}>
          <circle cx={x} cy={y} r="27" />
        </clipPath>
      </defs>
      <image
        href={mapArtworkUrl(artwork)}
        x={x - 27}
        y={y - 27}
        width="54"
        height="54"
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clip})`}
        onError={() => setFailed(artwork.id)}
      />
      <title>{`${artwork.label} · AI 插画，非实景照片`}</title>
      <rect
        x={x - 10}
        y={y + 15}
        width="20"
        height="11"
        rx="4"
        fill="#fffaf0e8"
      />
      <text x={x} y={y + 23} textAnchor="middle" fontSize="8" fill="#514b42">
        AI
      </text>
    </g>
  );
}
