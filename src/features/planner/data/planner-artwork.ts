// Existing user-approved AI travel illustrations, never documentary POI photos.
// Sources/provenance: public/media/planner/README.md. No remote asset provider.
export const plannerArtwork = {
  tower: {
    id: "tower",
    src: "/media/planner/tokyo-editorial.png",
    label: "东京塔城市氛围",
    fallback: "tower",
  },
  skytree: {
    id: "skytree",
    src: "/media/planner/skytree-editorial.png",
    label: "东京晴空塔",
    fallback: "tower",
  },
  temple: {
    id: "temple",
    src: "/media/planner/temple-editorial.png",
    label: "浅草寺春日氛围",
    fallback: "temple",
  },
  mountain: {
    id: "mountain",
    src: "/media/planner/fuji-editorial.png",
    label: "河口湖与富士山",
    fallback: "mountain",
  },
  lake: {
    id: "lake",
    src: "/media/planner/lake-editorial.png",
    label: "箱根芦之湖",
    fallback: "lake",
  },
} as const;
export type PlannerArtwork =
  (typeof plannerArtwork)[keyof typeof plannerArtwork];

export function destinationArtwork(
  name: string,
  type?: string,
): PlannerArtwork | undefined {
  if (type && !["city", "attraction", "activity"].includes(type))
    return undefined;
  if (/酒店|旅馆|住宿|餐|机场|车站|出发|抵达|返回|富士急|音乐森林/.test(name))
    return undefined;
  if (/晴空塔|スカイツリー|skytree/i.test(name)) return plannerArtwork.skytree;
  if (
    /东京塔|東京タワー|tokyo tower/i.test(name) ||
    /^(东京|東京|Tokyo)$/i.test(name)
  )
    return plannerArtwork.tower;
  if (/^(浅草寺|浅草寺参观|浅草|Senso-ji)$/i.test(name))
    return plannerArtwork.temple;
  if (/^(富士山|河口湖|河口湖湖畔|河口湖游览|Mount Fuji)$/i.test(name))
    return plannerArtwork.mountain;
  if (/^(箱根|箱根观光|芦之湖|芦之湖游船|Lake Ashi)$/i.test(name))
    return plannerArtwork.lake;
  return undefined;
}

export function planArtwork(id: string): PlannerArtwork | undefined {
  return id === "classic"
    ? plannerArtwork.mountain
    : id === "depth"
      ? plannerArtwork.temple
      : id === "relax"
        ? plannerArtwork.lake
        : undefined;
}

// Same-origin Next image optimization also serves the SVG / canvas consumers.
export function mapArtworkUrl(artwork: PlannerArtwork) {
  return `/_next/image?url=${encodeURIComponent(artwork.src)}&w=256&q=75`;
}
