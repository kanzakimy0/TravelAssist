import type { SVGProps } from "react";

const paths = {
  map: "m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Zm6-3v15m6-12v15",
  layers: "m12 3 10 6-10 6L2 9Zm-9 11 9 5 9-5M3 18l9 5 9-5",
  sight: "m3 20 7-14 4 8 3-5 4 11ZM8 10l2 2 2-2",
  transport: "M6 3h12v14H6ZM6 10h12M9 20l-2 2m8-2 2 2M9 14h.01M15 14h.01",
  stay: "M3 20V5m18 15v-9H3m0 5h18M6 11V7h5v4m2 0V7h5v4",
  food: "M5 3v6c0 4 6 4 6 0V3M8 3v19M19 22V3c-5 2-5 10 0 10",
  booking: "M3 6h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4Zm12 0v3m0 3v2m0 3v3",
  users:
    "M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 10v-3a6 6 0 0 1 12 0v3m1-17a4 4 0 0 1 0 8m2 2a5 5 0 0 1 5 5v2",
  calendar: "M3 5h18v16H3ZM7 2v6m10-6v6M3 11h18m-14 4h3m4 0h3",
  settings: "M3 6h8m4 0h6M3 12h3m4 0h11M3 18h12m4 0h2M11 3v6M6 9v6m9 0v6",
  refresh: "M20 8a8 8 0 1 0 0 8m0-13v5h-5",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  close: "m5 5 14 14M5 19 19 5",
  chevron: "m8 4 8 8-8 8",
  sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4v6l4 3",
} as const;
export function PlannerIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
