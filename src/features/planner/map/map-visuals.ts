import type { Map as MapboxMap } from "mapbox-gl";
import type {
  Coordinates,
  MapView,
  PlannerMapPlace,
} from "../model/trip-model";

// Local line-art placeholders, not photographs or provider POI imagery.
export const landmarkPaths = {
  tower:
    "M26 8h12m-8 0-4 28-8 18m16-46 4 28 8 18M23 44h18M25 34h14M28 23h8M18 54h28M28 54V44h8v10",
  temple:
    "M9 27 32 14l23 13M13 27h38M17 32h30v22H17ZM12 54h40M24 34v20m16-20v20M7 23l25-14 25 14",
  mountain: "M6 52 28 17l12 19 7-10 13 26ZM21 29l7 5 7-5M11 56h44",
  lake: "M7 37 24 15l13 22m-4-9 9-12 15 21M5 44q8-6 16 0t16 0t16 0M5 53q8-6 16 0t16 0t16 0",
  village: "m10 30 22-18 22 18M16 28v27h32V28M26 55V38h12v17M20 33h6m12 0h6",
} as const;
export function landmarkKey(name: string): keyof typeof landmarkPaths {
  if (/晴空塔|東京|东京|银座/.test(name)) return "tower";
  if (/浅草|寺|神社/.test(name)) return "temple";
  if (/河口湖|湖畔|湖|芦之/.test(name)) return "lake";
  if (/富士|山|箱根/.test(name)) return "mountain";
  return "village";
}
export function isLandmark(p: PlannerMapPlace) {
  return (
    p.tripStatus === "selected" &&
    ["city", "attraction", "activity"].includes(p.type)
  );
}
export type TravelBubble = {
  id: string;
  coordinates: Coordinates;
  label: string;
};
export function travelBubbles(
  view: MapView,
  hints: Record<string, string>,
): TravelBubble[] {
  const result: TravelBubble[] = [];
  // Read existing mock leg captions; never estimate a duration or call routing.
  for (const route of view.routes.filter((r) => !r.context && r.day)) {
    for (let i = 0; i < route.coordinates.length - 1; i++) {
      const a = route.coordinates[i],
        b = route.coordinates[i + 1];
      const place = view.places.find(
        (p) => p.day === route.day && String(p.coordinates) === String(a),
      );
      const label = place?.tripItemId && hints[place.tripItemId];
      if (!label || /步行/.test(label)) continue;
      result.push({
        id: `${route.id}-${i}`,
        coordinates: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
        label: `${label} · 示例`,
      });
    }
  }
  return result
    .filter((_, i) => i % Math.max(1, Math.ceil(result.length / 3)) === 0)
    .slice(0, 3);
}

export function warmMapStyle(map: MapboxMap) {
  for (const layer of map.getStyle()?.layers ?? []) {
    const id = layer.id;
    if (layer.type === "background")
      map.setPaintProperty(id, "background-color", "#f1efe5");
    else if (layer.type === "fill") {
      if (/water/.test(id)) map.setPaintProperty(id, "fill-color", "#cbdcdb");
      else if (/landuse|landcover|park/.test(id))
        map.setPaintProperty(id, "fill-color", "#dfe4d5");
      else if (/building/.test(id))
        map.setPaintProperty(id, "fill-color", "#e7e0d5");
    } else if (layer.type === "line" && /road|bridge|tunnel/.test(id)) {
      map.setPaintProperty(
        id,
        "line-color",
        /case|outline/.test(id) ? "#e0d8c9" : "#fffaf0",
      );
    } else if (layer.type === "symbol" && /poi-label/.test(id)) {
      map.setLayoutProperty(id, "visibility", "none");
    }
  }
}

export async function installMapArtwork(
  map: MapboxMap,
  active: () => boolean = () => true,
) {
  const images = Object.entries(landmarkPaths).map(([key, path]) => [
    `landmark-${key}`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 64 64"><circle cx="32" cy="33" r="30" fill="#655b5018"/><circle cx="32" cy="31" r="28" fill="#e4e7dc" stroke="#fffdf8" stroke-width="4"/><g transform="translate(10 9) scale(.68)" fill="none" stroke="#63716c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></g></svg>`,
  ]);
  images.push([
    "travel-capsule",
    '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="64"><rect x="2" y="3" width="176" height="59" rx="26" fill="#52453614"/><rect x="2" y="1" width="176" height="57" rx="26" fill="#fffdf8" stroke="#e3d9cf"/></svg>',
  ]);
  await Promise.all(
    images.map(async ([key, svg]) => {
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await img.decode();
      if (!active()) return;
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      map.addImage(key, ctx.getImageData(0, 0, canvas.width, canvas.height), {
        pixelRatio: 2,
      });
    }),
  );
}
