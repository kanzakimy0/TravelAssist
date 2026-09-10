import type { Map as MapboxMap } from "mapbox-gl";

type GeographyMap = Pick<
  MapboxMap,
  "getStyle" | "getLayoutProperty" | "setLayoutProperty"
>;

// Toggle existing base geography, retaining roads, labels, POIs and trip overlays.
// Never replace the style or map: Planner and Detail share the same lifecycle.
export function createBaseGeographyToggle(map: GeographyMap) {
  const original = new Map<string, "visible" | "none">();
  return (visible: boolean) => {
    for (const layer of map.getStyle()?.layers ?? []) {
      if (!(
        layer.type === "hillshade" ||
        (layer.type === "fill" && /water|landuse|landcover|park/.test(layer.id))
      ))
        continue;
      if (!original.has(layer.id))
        original.set(
          layer.id,
          map.getLayoutProperty(layer.id, "visibility") === "none"
            ? "none"
            : "visible",
        );
      map.setLayoutProperty(
        layer.id,
        "visibility",
        visible ? original.get(layer.id)! : "none",
      );
    }
  };
}
