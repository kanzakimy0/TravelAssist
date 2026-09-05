import type {
  GeoJSONSource,
  LayerSpecification,
  Map as MapboxMap,
} from "mapbox-gl";
import type { FeatureCollection, LineString, Point, Polygon } from "geojson";
import type { Coordinates, MapView } from "../model/trip-model";

type Properties = Record<string, string | number | boolean>;
export type Collection = FeatureCollection<
  Point | LineString | Polygon,
  Properties
>;
export function mapCollections(view: MapView): Record<string, Collection> {
  return {
    "planner-routes": {
      type: "FeatureCollection",
      features: view.routes.map((route) => ({
        type: "Feature",
        properties: {
          id: route.id,
          context: route.context,
          color: route.color,
          label: route.label,
        },
        geometry: { type: "LineString", coordinates: route.coordinates },
      })),
    },
    "planner-areas": {
      type: "FeatureCollection",
      features: view.areas.map((area) => ({
        type: "Feature",
        properties: { id: area.id, type: area.type, label: area.name },
        geometry: { type: "Polygon", coordinates: [area.polygon] },
      })),
    },
    "planner-places": {
      type: "FeatureCollection",
      features: view.places.map((place) => ({
        type: "Feature",
        properties: {
          id: place.id,
          tripItemId: place.tripItemId ?? "",
          type: place.type,
          label: place.label,
          color: place.color,
          recommended: place.tripStatus === "recommended",
          status: place.reservationStatus ?? "not_required",
          selected: Boolean(
            place.focused ||
            (place.tripItemId && place.tripItemId === view.selectedTripItemId),
          ),
        },
        geometry: { type: "Point", coordinates: place.coordinates },
      })),
    },
  };
}
export const plannerLayers: LayerSpecification[] = [
  {
    id: "route-context",
    type: "line",
    source: "planner-routes",
    filter: ["==", ["get", "context"], true],
    paint: { "line-color": "#77716c", "line-opacity": 0.25, "line-width": 3.2 },
  },
  {
    id: "route-selected",
    type: "line",
    source: "planner-routes",
    filter: ["==", ["get", "context"], false],
    paint: {
      "line-color": ["get", "color"],
      "line-width": 5,
      "line-opacity": 0.85,
    },
  },
  ...(["hotel-area", "food-area"] as const).map((id): LayerSpecification => ({
    id,
    type: "fill",
    source: "planner-areas",
    filter: [
      "==",
      ["get", "type"],
      id === "hotel-area" ? "hotelArea" : "foodArea",
    ],
    paint: {
      "fill-color": id === "hotel-area" ? "#ba9d88" : "#d5a493",
      "fill-opacity": 0.24,
      "fill-outline-color": "#7d6458",
    },
  })),
  ...(
    [
      "attraction",
      "hotel",
      "restaurant",
      "transport",
      "activity",
      "city",
    ] as const
  ).map((type): LayerSpecification => ({
    id: `${type}-pin`,
    type: "circle",
    source: "planner-places",
    filter: ["==", ["get", "type"], type],
    paint: {
      "circle-radius": type === "city" ? 10 : 7,
      "circle-color": ["case", ["get", "recommended"], "#f2ede5", "#fffaf4"],
      "circle-stroke-color": ["get", "color"],
      "circle-stroke-width": 2,
    },
  })),
  {
    id: "selected-feature",
    type: "circle",
    source: "planner-places",
    filter: ["==", ["get", "selected"], true],
    paint: {
      "circle-radius": 13,
      "circle-color": "rgba(0,0,0,0)",
      "circle-stroke-color": "#a74739",
      "circle-stroke-width": 3,
    },
  },
  {
    id: "place-labels",
    type: "symbol",
    source: "planner-places",
    layout: {
      "text-field": ["get", "label"],
      "text-size": 12,
      "text-offset": [0, 1.6],
      "text-anchor": "top",
      "text-max-width": 13,
    },
    paint: {
      "text-color": "#343e48",
      "text-halo-color": "#fffaf4",
      "text-halo-width": 2,
    },
  },
  {
    id: "reservation-status",
    type: "symbol",
    source: "planner-places",
    filter: ["!=", ["get", "status"], "not_required"],
    layout: {
      "text-field": [
        "match",
        ["get", "status"],
        ["booked", "ticketed"],
        "✓",
        "!",
      ],
      "text-size": 13,
      "text-offset": [0, -1.1],
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#8f483c",
      "text-halo-color": "#fffaf4",
      "text-halo-width": 2,
    },
  },
];
export function boundsForView(view: MapView): [Coordinates, Coordinates] {
  const points = [
    ...view.places.map((p) => p.coordinates),
    ...view.areas.flatMap((a) => a.polygon),
    ...view.routes.filter((r) => !r.context).flatMap((r) => r.coordinates),
  ];
  if (!points.length)
    return [
      [138.7, 35.2],
      [139.9, 35.8],
    ];
  return [
    [
      Math.min(...points.map((p) => p[0])) - 0.008,
      Math.min(...points.map((p) => p[1])) - 0.008,
    ],
    [
      Math.max(...points.map((p) => p[0])) + 0.008,
      Math.max(...points.map((p) => p[1])) + 0.008,
    ],
  ];
}
// Collision-free screen labels for the no-token schematic. Leader lines retain
// each exact fixture coordinate; this does not modify the GeoJSON route geometry.
export function schematicLayout(view: MapView, width: number, height: number) {
  const [min, max] = boundsForView(view);
  const project = ([x, y]: Coordinates): Coordinates => [
    85 + ((x - min[0]) / (max[0] - min[0])) * Math.max(100, width - 170),
    100 + ((max[1] - y) / (max[1] - min[1])) * Math.max(100, height - 230),
  ];
  const slots: Coordinates[] = [];
  const columns = Math.max(2, Math.floor((width - 20) / 165));
  const rows = Math.max(3, Math.floor((height - 200) / 60));
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      const x = 85 + (col * (width - 170)) / (columns - 1);
      const y = 112 + (row * (height - 250)) / Math.max(1, rows - 1);
      // Leave the expanded toolbar and day selector usable.
      if ((x < 150 && y < 350) || (x > width - 140 && y < 210)) continue;
      slots.push([x, y]);
    }
  const positions = view.places.map((place) => {
    const origin = project(place.coordinates);
    slots.sort(
      (a, b) =>
        Math.hypot(a[0] - origin[0], a[1] - origin[1]) -
        Math.hypot(b[0] - origin[0], b[1] - origin[1]),
    );
    return { id: place.id, origin, label: slots.shift() ?? origin };
  });
  return { project, positions };
}
export type MapPort = Pick<
  MapboxMap,
  | "addSource"
  | "addLayer"
  | "getSource"
  | "fitBounds"
  | "easeTo"
  | "resize"
  | "remove"
>;
// One controller owns one map. Range/selection changes update sources, never construct a map.
export function bindMap(port: MapPort, reducedMotion: () => boolean) {
  let previous: MapView | null = null;
  let installed = false;
  let disposed = false;
  return {
    update(view: MapView) {
      if (disposed) return;
      const collections = mapCollections(view);
      if (!installed) {
        for (const [id, data] of Object.entries(collections))
          port.addSource(id, { type: "geojson", data });
        for (const layer of plannerLayers) port.addLayer(layer);
        installed = true;
      } else
        for (const [id, data] of Object.entries(collections))
          (port.getSource(id) as GeoJSONSource | undefined)?.setData(data);
      const duration = reducedMotion() ? 0 : 450;
      if (previous?.key !== view.key)
        port.fitBounds(boundsForView(view), {
          padding: { left: 65, right: 65, top: 100, bottom: 75 },
          duration,
          maxZoom: 13,
        });
      else if (
        view.focus &&
        (view.focusRevision !== previous.focusRevision ||
          view.selectedTripItemId !== previous.selectedTripItemId ||
          String(view.focus) !== String(previous.focus))
      )
        port.easeTo({ center: view.focus, duration });
      previous = view;
    },
    resize() {
      if (!disposed) port.resize();
    },
    destroy() {
      if (!disposed) {
        disposed = true;
        port.remove();
      }
    },
  };
}
export type MapSession = {
  update: (view: MapView) => void;
  destroy: () => void;
};
export async function mountMapbox(
  container: HTMLElement,
  token: string | undefined,
  select: (id: string, tripItemId?: string) => void,
  status: (message: string) => void,
): Promise<MapSession | null> {
  if (!token?.trim()) return null;
  const mapbox = (await import("mapbox-gl")).default;
  if (!mapbox.supported()) throw new Error("WebGL unavailable");
  const map = new mapbox.Map({
    container,
    accessToken: token,
    style: "mapbox://styles/mapbox/light-v11",
    center: [139.2, 35.5],
    zoom: 8,
    attributionControl: true,
    respectPrefersReducedMotion: true,
  });
  const controller = bindMap(
    map,
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  let latest: MapView | null = null,
    ready = false,
    destroyed = false;
  const timer = setTimeout(() => fail(), 18000);
  function fail() {
    if (!destroyed) {
      cleanup();
      status("底图暂不可用 · 已切换可操作示意地图");
    }
  }
  function cleanup() {
    if (destroyed) return;
    destroyed = true;
    clearTimeout(timer);
    observer.disconnect();
    controller.destroy();
  }
  const observer = new ResizeObserver(() => controller.resize());
  observer.observe(container);
  map.on("error", fail); // Deliberately do not log raw SDK errors / URLs containing the token.
  map.on("load", () => {
    if (destroyed) return;
    clearTimeout(timer);
    ready = true;
    if (latest) controller.update(latest);
    status("Mapbox 底图 · 行程、价格及预约为示例");
  });
  const clickable = plannerLayers
    .filter((layer) => layer.source !== "planner-routes")
    .map((layer) => layer.id);
  map.on("click", (event) => {
    if (!ready || destroyed) return;
    const feature = map.queryRenderedFeatures(event.point, {
      layers: clickable,
    })[0];
    const properties =
      feature && "properties" in feature ? feature.properties : null;
    if (
      properties &&
      typeof properties === "object" &&
      "id" in properties &&
      typeof properties.id === "string"
    )
      select(
        properties.id,
        "tripItemId" in properties && typeof properties.tripItemId === "string"
          ? properties.tripItemId
          : undefined,
      );
  });
  map.on("mousemove", (event) => {
    if (ready && !destroyed)
      map.getCanvas().style.cursor = map.queryRenderedFeatures(event.point, {
        layers: clickable,
      }).length
        ? "pointer"
        : "";
  });
  map.addControl(
    new mapbox.NavigationControl({ showCompass: false }),
    "bottom-right",
  );
  return {
    update(view) {
      latest = view;
      if (ready && !destroyed) controller.update(view);
    },
    destroy: cleanup,
  };
}
