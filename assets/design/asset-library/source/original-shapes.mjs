// TASK-013-A: original geometric drawings authored for TravelAssist, not an icon pack.
// This is the editable source. No downloaded paths, fonts, photographs or brand marks.
export const poi = {
  landmark: '<path d="M7 21 11 8V3h2v5l4 13M5 21h14M8 16h8M9 12h6M10 6h4"/>',
  museum: '<path d="m3 8 9-5 9 5H3Zm2 3v7m5-7v7m4-7v7m5-7v7M3 21h18M4 18h16"/>',
  "art-gallery":
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M6 7h12v10H6zM7 15l3-4 3 3 2-2 2 3"/><circle cx="15" cy="9" r=".7"/>',
  temple:
    '<path d="m3 9 4-4h10l4 4H3Zm2 1v10m14-10v10M3 20h18M9 20v-6h6v6M9 5V3h6v2M6 12h12"/>',
  shrine: '<path d="M3 4q9 3 18 0M4 8h16M7 5l-1 16M17 5l1 16M7 12h10M12 7v5"/>',
  church:
    '<path d="M12 2v5M9 4h6M4 21v-9l8-5 8 5v9H4Zm5 0v-5a3 3 0 0 1 6 0v5M7 12v2m10-2v2"/>',
  castle:
    '<path d="M3 21V5h3v3h3V4h6v4h3V5h3v16H3Zm6 0v-5a3 3 0 0 1 6 0v5M6 11v2m12-2v2"/>',
  "historic-site":
    '<path d="M3 21h18M5 19V8h4v11m-5-14h6M6 3h2m6 16V8l5 2v9M13 8l4-3 3 3M5 12h4m5 2h5"/>',
  park: '<path d="M7 3 3 9h2l-3 5h10l-3-5h2L7 3Zm0 11v7m6-7h8m-8 3h8m-7-6v10m6-10v10"/>',
  garden:
    '<path d="M12 21v-8m0 5c-6 0-7-5-7-5 6 0 7 5 7 5Zm0-3c5 0 7-5 7-5-6 0-7 5-7 5Z"/><circle cx="12" cy="7" r="2"/><path d="M12 5c-5-5-7 2-2 3-4 4 2 7 4 1 5 1 6-6 0-4 2-5-5-5-2 0"/>',
  nature:
    '<path d="M5 18C0 9 10 3 20 3c0 10-5 18-13 15M4 21 17 7M8 17v-6m3 3h5"/>',
  mountain:
    '<path d="m2 21 8-17 5 10 3-5 4 12H2ZM7 10l3 2 3-2M16 13l2 2 2-1"/>',
  beach:
    '<path d="M3 21q3-3 6 0t6 0t6 0M5 10c3-8 12-8 15 0H5Zm8-8v2m0 6-3 9M6 17l8 2"/><path d="M9 10q0-6 4-6t4 6"/>',
  viewpoint:
    '<path d="M2 12q10-13 20 0-10 13-20 0Z"/><circle cx="12" cy="12" r="4"/><path d="m9 13 3-4 3 4"/>',
  "amusement-park":
    '<circle cx="12" cy="10" r="7"/><path d="M12 3v14M5 10h14M7 5l10 10M7 15 17 5M8 22l4-12 4 12M5 22h14"/>',
  zoo: '<ellipse cx="12" cy="16" rx="5" ry="4"/><ellipse cx="4" cy="11" rx="2" ry="3"/><ellipse cx="9" cy="6" rx="2" ry="3"/><ellipse cx="15" cy="6" rx="2" ry="3"/><ellipse cx="20" cy="11" rx="2" ry="3"/>',
  aquarium:
    '<path d="M3 12c5-9 12-5 15-2l4-3v10l-4-3c-3 3-10 7-15-2Zm9-5v10M5 3q3 3 6 0t6 0"/><circle cx="7" cy="11" r=".6"/>',
  shopping:
    '<path d="m5 8-2 13h18L19 8H5Zm3 0V6a4 4 0 0 1 8 0v2"/><path d="M8 11v1m8-1v1"/>',
  market:
    '<path d="m3 4-1 6q2 4 5 0 2 4 5 0 2 4 5 0 3 4 5 0l-1-6H3Zm1 9v8h16v-8M8 21v-5h8v5M7 4v6m5-6v6m5-6v6"/>',
  restaurant: '<path d="M4 3v6q3 4 6 0V3M7 3v18M18 21V3c-5 3-5 10 0 10"/>',
  cafe: '<path d="M3 8h13v8q0 4-6 4t-7-4V8Zm13 1h2a3 3 0 0 1 0 6h-2M2 22h17M6 2v3m4-4v4m4-3v3"/>',
  bar: '<path d="M3 3h18l-9 10L3 3Zm9 10v8m-5 0h10M6 6h12"/>',
  hotel:
    '<path d="M3 21V3h18v18M2 21h20M9 21v-5h6v5M7 6h2m6 0h2M7 10h2m6 0h2"/>',
  onsen:
    '<path d="M3 15c0 8 18 8 18 0M3 15q9 5 18 0M7 3c-4 4 4 5 0 9m5-10c-4 4 4 5 0 9m5-8c-4 4 4 5 0 9"/>',
};
export const transport = {
  walk: '<circle cx="13" cy="4" r="2"/><path d="m7 11 4-3 4 1 3 5m-7-6-2 7-5 6m5-6 6 1 2 5m-5-11 1 5"/>',
  bicycle:
    '<circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 5-9 5 9H5Zm8-13h4l2 13M7 8h5m3 9 3-9"/>',
  car: '<path d="m3 11 3-6h12l3 6v8H3v-8Zm0 0h18M6 19v2m12-2v2M6 14h2m8 0h2"/>',
  taxi: '<path d="M9 5V2h6v3M3 12l3-7h12l3 7v7H3v-7Zm0 0h18M6 15h2m8 0h2M6 19v2m12-2v2M10 9h4"/>',
  train:
    '<rect x="5" y="2" width="14" height="17" rx="4"/><path d="M5 6h14M5 12h14M12 6v6M8 19l-3 3m11-3 3 3M8 16h1m6 0h1"/>',
  subway:
    '<path d="M2 21V11a10 10 0 0 1 20 0v10M8 21l2-3m6 3-2-3"/><rect x="7" y="7" width="10" height="11" rx="2"/><path d="M7 12h10M10 15h4"/>',
  tram: '<path d="M2 2h20M12 3l4 3-4 3M5 21l3-3m11 3-3-3"/><rect x="5" y="9" width="14" height="9" rx="2"/><path d="M5 13h14M9 9v4m6-4v4M8 16h1m6 0h1"/>',
  bus: '<rect x="4" y="3" width="16" height="17" rx="3"/><path d="M7 20v2m10-2v2M4 8h16M4 14h16M7 17h2m6 0h2M1 8v5m22-5v5M9 5h6"/>',
  ferry:
    '<path d="m2 14 10-4 10 4-4 6H6l-4-6Zm4-2V5h12v7M9 5V2h6v3M12 10v10M2 22q3-2 5 0t5 0t5 0t5 0"/>',
  airplane:
    '<path d="M12 2c2 0 2 4 2 7l8 5v3l-8-3v5l3 2v1l-5-1-5 1v-1l3-2v-5l-8 3v-3l8-5c0-3 0-7 2-7Z"/>',
  shinkansen:
    '<path d="M3 4h10c4 0 7 5 9 11v3H3M11 4l6 8H3M3 21h18M7 15h2m6 0h2M3 8h10"/>',
  "cable-car":
    '<path d="M2 5 22 1M12 3v6M7 9h10l3 10H4L7 9Zm1 0-1 6h10l-1-6M7 22h10M12 9v6"/>',
  ropeway:
    '<path d="m2 5 20-3M11 4v6M9 7h4"/><rect x="4" y="10" width="16" height="12" rx="5"/><path d="M5 17h14M9 10v7m6-7v7"/>',
  parking:
    '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 18V7h4a3 3 0 0 1 0 6H9"/>',
};
const glyphs = {
  default: '<circle cx="12" cy="12" r="3"/>',
  selected: '<path d="m5 12 5 5 9-10"/>',
  recommended: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  itinerary:
    '<path d="M4 5h16v15H4zM4 9h16M8 3v4m8-4v4m-9 6h3m4 0h3m-10 4h3"/>',
  hotel: poi.hotel,
  dining: poi.restaurant,
  activity: '<path d="m12 3 2 6 7 3-7 2-2 7-2-7-7-2 7-3Z"/>',
  transit: transport.train,
  parking: transport.parking,
  warning: '<path d="m12 3 10 18H2L12 3Zm0 7v5m0 3h.01"/>',
  error: '<path d="m7 2-5 5v10l5 5h10l5-5V7l-5-5H7Zm1 6 8 8m0-8-8 8"/>',
  cluster:
    '<circle cx="8" cy="8" r="4"/><circle cx="17" cy="8" r="4"/><circle cx="12" cy="17" r="4"/>',
};
export const marker = glyphs;
export const placeholder = {
  city: '<path d="M3 21V9h6V4h7v8h5v9M1 21h22M5 12h1m-1 4h1m6-9h1m-1 4h1m5 4h1"/>',
  region:
    '<path d="m2 6 7-3 7 3 6-3v17l-6 3-7-3-7 3V6Zm7-3v17m7-14v17M4 12l3-2m4 1 3 2m4-1 2-2"/>',
  attraction: poi.landmark,
  hotel:
    '<path d="M2 20V8m20 12V8M2 16h20M5 12V7h14v5M2 16v-4h20v4M5 10h5m4 0h5"/>',
  restaurant:
    '<circle cx="12" cy="12" r="5"/><path d="M2 2v6m3-6v6M2 8h3M3 8v14M22 22V2q-5 4 0 10"/>',
  activity:
    '<path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Zm12 0v3m0 3v2m0 3v3M7 9l4 3-4 3"/>',
  transport:
    '<path d="M2 19h20M3 15h18l-3-7H6l-3 7ZM6 8V4h12v4M8 19l-3 3m11-3 3 3M8 12h1m6 0h1"/>',
  "user-upload": '<path d="M3 15v6h18v-6M12 17V2m-5 5 5-5 5 5"/>',
};
export const state = {
  "empty-search":
    '<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7M7 10h6"/>',
  "no-image":
    '<rect x="2" y="3" width="20" height="18" rx="3"/><path d="m3 17 5-6 4 5 3-3 6 6M2 2l20 20"/><circle cx="16" cy="8" r="2"/>',
  offline:
    '<path d="M2 7q10-9 20 0M5 11q7-6 14 0M8 15q4-3 8 0M2 2l20 20"/><circle cx="12" cy="20" r="1"/>',
  error: '<path d="M6 2h10l5 5v15H3V2h3Zm10 0v6h5M12 11v5m0 3h.01"/>',
  loading:
    '<path d="M7 2h10M7 22h10M8 2v5l4 5-4 5v5m8-20v5l-4 5 4 5v5M9 6h6M9 19h6"/>',
  "permission-denied":
    '<path d="M4 10h16v12H4zM7 10V7a5 5 0 0 1 10 0v3M9 14l6 5m0-5-6 5"/>',
};
export const destinations = {
  tokyo:
    '<path d="M80 132 110 30l30 102M98 70h24M88 108h44M105 48h10M110 30V15M65 132h90M46 132V90h18v42m90 0V78h20v54"/><path d="m98 70 29 38m-5-38-29 38"/>',
  kyoto:
    '<path d="M47 49q65 17 126 0M53 70h114M72 55l-5 82m85-82 5 82M73 90h78M112 58v32M52 137h120M95 137v-28h34v28"/>',
  osaka:
    '<path d="M27 87h166M27 102q85-48 166 0M33 121q18 8 36 0t36 0t36 0t36 0M47 88v-48h26v48m8-5V21h23v58m35 3V31h27v54M51 48h17m17-17h15m43 9h19M36 98v13m147-13v13M54 58h12m78-5h15"/>',
  "fuji-hakone":
    '<path d="M25 108 109 24l82 84H25Zm55-55 14 4 15-10 14 10 15-5M24 123q20 10 40 0t40 0t40 0t40 0M39 139q16 6 32 0m59 0q16 6 32 0"/><circle cx="172" cy="32" r="12"/>',
  hokkaido:
    '<path d="M42 137V78l68-41 67 41v59H42Zm48 0V73h40v64M96 37V23h28v14M30 78h159M58 91h12m80 0h12M57 111h14m78 0h14M101 137v-22h18v22"/><circle cx="110" cy="86" r="10"/><path d="M110 79v8h6M184 20v24m-10-18 20 12m0-12-20 12"/>',
};
export function icon(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</svg>\n`;
}
export function pin(body, name) {
  const color =
    name === "warning" ? "#966b35" : name === "error" ? "#994854" : "#d97b70";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" fill="none"><path d="M16 38S2 23 2 16a14 14 0 0 1 28 0c0 7-14 22-14 22Z" fill="${color}" stroke="#fffaf4" stroke-width="2.5"/><g transform="translate(6 6) scale(.8333)" stroke="#fffaf4" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`;
}
export function scene(body, destination = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" fill="none"><rect width="240" height="160" rx="20" fill="#fbf4ea"/><circle cx="191" cy="36" r="24" fill="#f4dfd9"/><path d="M0 139q64-32 120-8t120-4v33H0Z" fill="#e4e9e3"/><g ${destination ? "" : 'transform="translate(82 36) scale(3.1)" '}stroke="#475665" stroke-width="${destination ? "2.5" : "1.35"}" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`;
}
