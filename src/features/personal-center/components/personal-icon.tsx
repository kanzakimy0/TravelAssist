import type { SVGProps } from "react";

const paths = {
  home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
  trips: "M8 6V4h8v2M3 7h18v13H3zM8 7v13M16 7v13",
  heart:
    "M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 6l-1-1.2a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.9M16 3.2a4 4 0 0 1 0 7.6M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  account:
    "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  chevron: "m7 10 5 5 5-5",
  compass: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM16 8l-3 5-5 3 3-5 5-3Z",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  calendar: "M4 5h16v16H4zM8 3v4M16 3v4M4 11h16",
  train: "M6 17h12V4H6zM6 10h12M8 14h.01M16 14h.01M8 17l-3 4M16 17l3 4M7 20h10",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6 6 18",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z",
  camera: "M4 7h3l2-3h6l2 3h3v13H4ZM15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  trash: "M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6",
  refresh:
    "M20 7v5h-5M4 17v-5h5M6.1 9a7 7 0 0 1 11.7-2L20 12M4 12l2.2 5a7 7 0 0 0 11.7-2",
  check: "m5 12 4 4L19 6",
  mail: "M3 5h18v14H3zM3 7l9 7 9-7",
  phone:
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13 1 .37 2 .72 2.93a2 2 0 0 1-.45 2.11L8.1 9.03a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.94.35 1.92.59 2.93.72A2 2 0 0 1 22 16.92Z",
  info: "M12 8h.01M11 12h1v5h1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V20H9.76v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 5.1 15a1.7 1.7 0 0 0-1.55-1H3v-3h.55A1.7 1.7 0 0 0 5.1 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1-1.55V4h4.98v.79a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.55 1H21v3h-.05a1.7 1.7 0 0 0-1.55 1Z",
  chevronRight: "m9 6 6 6-6 6",
  lock: "M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3",
  privacy: "M12 3 4 6v5c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6Z",
  sync: "M20 7v5h-5M4 17v-5h5M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2",
  plus: "M12 5v14M5 12h14",
} as const;

export type PersonalIconName = keyof typeof paths;

export function PersonalIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: PersonalIconName }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
