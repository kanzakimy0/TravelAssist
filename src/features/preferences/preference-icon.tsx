import type { CategoryKey } from "./preference-model";

type IconName = CategoryKey | "arrow" | "back" | "reset" | "settings";

export function PreferenceIcon({ name }: { name: IconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  if (name === "mobility") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          {...common}
          d="M6 16.5h12M7 19l-2 2m12-2 2 2M7 3h10a2 2 0 0 1 2 2v10H5V5a2 2 0 0 1 2-2Z"
        />
        <path {...common} d="M8 7h8M8 11h.01M16 11h.01" />
      </svg>
    );
  }
  if (name === "attractions") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M4 20h16M6 20l2-9 4-7 4 7 2 9M8 12h8M9.5 16h5" />
      </svg>
    );
  }
  if (name === "dining") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          {...common}
          d="M7 3v8m-3-8v5a3 3 0 0 0 6 0V3M7 11v10M16 3v18M16 3c3 2 4 5 4 8h-4"
        />
      </svg>
    );
  }
  if (name === "accommodation") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M4 20V8l8-5 8 5v12M8 20v-6h8v6M9 9h.01M15 9h.01" />
      </svg>
    );
  }
  if (name === "budget") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          {...common}
          d="M4 7h15a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12M16 12h5v4h-5a2 2 0 0 1 0-4Z"
        />
      </svg>
    );
  }
  if (name === "experience") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          {...common}
          d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
        />
        <path
          {...common}
          d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"
        />
      </svg>
    );
  }
  if (name === "arrow") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M5 12h14m-5-5 5 5-5 5" />
      </svg>
    );
  }
  if (name === "back") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M19 12H5m5-5-5 5 5 5" />
      </svg>
    );
  }
  if (name === "reset") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 4v4.5h4.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle {...common} cx="12" cy="12" r="3" />
      <path
        {...common}
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"
      />
    </svg>
  );
}
